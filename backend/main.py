"""
FastAPI Server for Inverted Pendulum Control Systems Engineering Suite.
Exposes RESTful APIs & WebSocket real-time simulation streaming for:
- Physical parameter management & validation
- Stage 1: Nonlinear modeling, Lagrangian derivation, term breakdown, numerical acceleration solving
- Stage 2: Linearization, small-angle error analysis, linear-vs-nonlinear comparison, State-Space A, B, C, D
- Stability analysis (open-loop & closed-loop eigenvalues)
- Stage 3: Controllability analysis & Ackermann's formula + SciPy cross-verification
- Stage 4: High-precision nonlinear & linear simulation (with actuator saturation & disturbances)
- Real-time WebSocket simulation engine (/ws/simulation)
"""

import asyncio
import json
import time
from typing import List, Optional, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from parameters import SystemParameters, get_default_parameters
from nonlinear_model import (
    derive_lagrangian_equations,
    get_nonlinear_substitution_details,
    calculate_nonlinear_accelerations,
    get_nonlinear_term_breakdown,
)
from linearized_model import (
    compute_linearized_system,
    analyze_small_angle_approximation,
)
from stability_analysis import analyze_matrix_stability
from controllability import analyze_controllability
from ackermann_controller import design_ackermann_controller, POLE_PRESETS
from simulation import (
    run_single_simulation,
    run_benchmark_tests,
    run_linear_vs_nonlinear_comparison,
    RealtimeSimulationSession,
)
from performance_analysis import calculate_metrics, generate_comparison_table

app = FastAPI(
    title="Inverted Pendulum State-Feedback & Ackermann Control API",
    description="Real-time physics engine and control-engineering backend for the inverted pendulum platform.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_params = get_default_parameters()


def _resolve_params(override: Optional["ParameterUpdateRequest"] = None) -> SystemParameters:
    if override is None:
        return current_params
    candidate = SystemParameters(
        M=override.M if override.M is not None else current_params.M,
        m=override.m if override.m is not None else current_params.m,
        l=override.l if override.l is not None else current_params.l,
        I=override.I if override.I is not None else current_params.I,
        b=override.b if override.b is not None else current_params.b,
        g=override.g if override.g is not None else current_params.g,
    )
    ok, errs = candidate.validate()
    if not ok:
        raise HTTPException(status_code=422, detail="; ".join(errs))
    return candidate


class ParameterUpdateRequest(BaseModel):
    M: Optional[float] = Field(None, gt=0, description="Cart mass in kg")
    m: Optional[float] = Field(None, gt=0, description="Pendulum mass in kg")
    l: Optional[float] = Field(None, gt=0, description="Center of mass distance in m")
    I: Optional[float] = Field(None, gt=0, description="Moment of inertia in kg*m^2")
    b: Optional[float] = Field(None, ge=0, description="Viscous friction in N*s/m")
    g: Optional[float] = Field(None, gt=0, description="Gravity acceleration in m/s^2")


class AccelerationSolveRequest(BaseModel):
    x: float = Field(0.0, description="Cart position (m)")
    x_dot: float = Field(0.0, description="Cart velocity (m/s)")
    theta: float = Field(0.0, description="Pendulum angle (rad)")
    theta_dot: float = Field(0.0, description="Angular velocity (rad/s)")
    u: float = Field(0.0, description="Applied horizontal force (N)")
    params: Optional[ParameterUpdateRequest] = None


class PoleItem(BaseModel):
    real: float
    imag: float = 0.0


class AckermannDesignRequest(BaseModel):
    desired_poles: List[PoleItem]
    params: Optional[ParameterUpdateRequest] = None


class ConsolidatedAnalysisRequest(BaseModel):
    params: Optional[ParameterUpdateRequest] = None
    measured_states: Optional[List[str]] = None
    desired_poles: Optional[List[PoleItem]] = None


class LinearVsNonlinearRequest(BaseModel):
    initial_state: List[float] = Field([0.0, 0.0, 0.174533, 0.0])
    t_end: float = Field(3.0, gt=0, le=30.0)
    dt: float = Field(0.01, gt=0, le=0.1)
    manual_force: float = Field(0.0)
    control_enabled: bool = Field(True)
    K: Optional[List[float]] = None
    saturation_enabled: bool = Field(False)
    u_min: float = Field(-10.0)
    u_max: float = Field(10.0)
    params: Optional[ParameterUpdateRequest] = None


class SimulationRunRequest(BaseModel):
    initial_state: List[float] = Field([0.0, 0.0, 0.087266, 0.0], description="[x, x_dot, theta, theta_dot]")
    t_end: float = Field(8.0, gt=0, le=120.0)
    dt: float = Field(0.01, gt=0, le=0.2)
    disturbance_mag: float = Field(0.0)
    disturbance_start: float = Field(2.0, ge=0.0)
    disturbance_duration: float = Field(0.2, ge=0.0)
    manual_force: float = Field(0.0)
    model_type: str = Field("nonlinear", description="'nonlinear' or 'linear'")
    control_enabled: bool = Field(True)
    K: Optional[List[float]] = Field(None, description="Gain vector [k1, k2, k3, k4]")
    saturation_enabled: bool = Field(False)
    u_min: float = Field(-10.0)
    u_max: float = Field(10.0)
    params: Optional[ParameterUpdateRequest] = None


class DisturbanceTestRequest(BaseModel):
    initial_state: List[float] = Field([0.0, 0.0, 0.0, 0.0])
    t_end: float = Field(8.0, gt=0, le=60.0)
    dt: float = Field(0.01, gt=0, le=0.1)
    disturbance_mag: float = Field(10.0)
    disturbance_start: float = Field(1.5, ge=0.0)
    disturbance_duration: float = Field(0.25, ge=0.01)
    control_enabled: bool = Field(True)
    K: Optional[List[float]] = None
    saturation_enabled: bool = Field(False)
    u_min: float = Field(-10.0)
    u_max: float = Field(10.0)
    model_type: str = Field("nonlinear")
    params: Optional[ParameterUpdateRequest] = None


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Inverted Pendulum Control Engine", "version": "2.0.0"}


@app.get("/api/parameters")
def get_parameters():
    return {
        "parameters": current_params.to_dict(),
        "raw": current_params.to_raw_dict(),
    }


@app.post("/api/parameters")
def update_parameters(req: ParameterUpdateRequest):
    global current_params
    candidate = _resolve_params(req)
    current_params = candidate
    return {
        "message": "Parameters updated successfully",
        "parameters": current_params.to_dict(),
        "raw": current_params.to_raw_dict(),
    }


@app.post("/api/parameters/reset")
def reset_parameters():
    global current_params
    current_params = get_default_parameters()
    return {
        "message": "Parameters reset to default values",
        "parameters": current_params.to_dict(),
        "raw": current_params.to_raw_dict(),
    }


@app.post("/api/analysis/all")
def get_consolidated_analysis(req: Optional[ConsolidatedAnalysisRequest] = None):
    """
    Consolidated analysis endpoint: updates active parameters if provided and computes
    Lagrangian substitutions, linearized state-space [A, B, C, D], stability,
    controllability, and Ackermann controller synthesis in one round trip.
    """
    global current_params
    if req and req.params is not None:
        current_params = _resolve_params(req.params)

    measured = req.measured_states if req else None
    lin_result = compute_linearized_system(current_params, measured_states=measured)
    A = np.array(lin_result["A"])
    B = np.array(lin_result["B"])

    ctrl_result = analyze_controllability(A, B)

    if req and req.desired_poles and len(req.desired_poles) == 4:
        desired_poles = [complex(p.real, p.imag) for p in req.desired_poles]
    else:
        desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j]

    ack_result = design_ackermann_controller(A, B, desired_poles)
    cl_stability = (
        analyze_matrix_stability(np.array(ack_result["A_cl"]), label="Closed-Loop")
        if ack_result.get("feasible") and "A_cl" in ack_result
        else None
    )

    derivations = derive_lagrangian_equations()
    substitutions = get_nonlinear_substitution_details(current_params)

    return {
        "parameters": current_params.to_dict(),
        "raw_parameters": current_params.to_raw_dict(),
        "lagrangian": {
            "derivation": derivations,
            "substitutions": substitutions,
        },
        "linearized": lin_result,
        "stability": lin_result["stability"],
        "closed_loop_stability": cl_stability,
        "controllability": ctrl_result,
        "ackermann": ack_result,
        "pole_presets": POLE_PRESETS,
    }


# =====================================================================
# STAGE 1: NONLINEAR MATHEMATICAL MODELING & EQUATION SOLVER
# =====================================================================

@app.get("/api/stage1/lagrangian")
def get_lagrangian_derivation():
    derivations = derive_lagrangian_equations()
    substitutions = get_nonlinear_substitution_details(current_params)
    return {
        "derivation": derivations,
        "substitutions": substitutions,
    }


@app.post("/api/stage1/solve-accelerations")
def solve_nonlinear_accelerations(req: AccelerationSolveRequest):
    p = _resolve_params(req.params)
    breakdown = get_nonlinear_term_breakdown(
        p, req.x, req.x_dot, req.theta, req.theta_dot, req.u
    )
    return {
        "inputs": {
            "x": req.x,
            "x_dot": req.x_dot,
            "theta": req.theta,
            "theta_deg": float(np.degrees(req.theta)),
            "theta_dot": req.theta_dot,
            "u": req.u,
        },
        "outputs": {
            "x_ddot": breakdown["x_ddot"],
            "theta_ddot": breakdown["theta_ddot"],
            "theta_ddot_deg": breakdown["theta_ddot_deg"],
            "determinant_D": breakdown["determinant_D"],
        },
        "breakdown": breakdown,
    }


# =====================================================================
# STAGE 2: LINEARIZATION AND STATE-SPACE REPRESENTATION
# =====================================================================

@app.get("/api/stage2/linearization")
def get_linearized_model(measured: Optional[str] = None):
    measured_list = [s.strip() for s in measured.split(",")] if measured else None
    return compute_linearized_system(current_params, measured_states=measured_list)


@app.get("/api/stage2/small-angle")
def get_small_angle_analysis(theta_deg: float = 10.0):
    point = analyze_small_angle_approximation(theta_deg)
    curve = [analyze_small_angle_approximation(float(d)) for d in range(0, 46, 3)]
    return {"point": point, "curve": curve}


@app.post("/api/stage2/linear-vs-nonlinear")
def compare_linear_vs_nonlinear(req: LinearVsNonlinearRequest):
    p = _resolve_params(req.params)
    if req.saturation_enabled and req.u_min >= req.u_max:
        raise HTTPException(status_code=422, detail="u_min must be less than u_max.")

    if req.control_enabled:
        if req.K and len(req.K) == 4:
            K_vec = np.array(req.K, dtype=float)
        else:
            lin = compute_linearized_system(p)
            ack = design_ackermann_controller(np.array(lin["A"]), np.array(lin["B"]))
            K_vec = np.array(ack["K"], dtype=float)
    else:
        K_vec = None

    return run_linear_vs_nonlinear_comparison(
        params=p,
        K=K_vec,
        initial_state=req.initial_state,
        t_end=req.t_end,
        dt=req.dt,
        manual_force=req.manual_force,
        saturation_enabled=req.saturation_enabled,
        u_min=req.u_min,
        u_max=req.u_max,
    )


# =====================================================================
# STAGE 3: CONTROLLABILITY & ACKERMANN'S FORMULA CONTROLLER DESIGN
# =====================================================================

@app.get("/api/stage3/controllability")
def get_controllability():
    lin_result = compute_linearized_system(current_params)
    A = np.array(lin_result["A"])
    B = np.array(lin_result["B"])
    return analyze_controllability(A, B)


@app.post("/api/stage3/ackermann")
def compute_ackermann_design(req: Optional[AckermannDesignRequest] = None):
    p = _resolve_params(req.params if req else None)
    lin_result = compute_linearized_system(p)
    A = np.array(lin_result["A"])
    B = np.array(lin_result["B"])

    if req and req.desired_poles and len(req.desired_poles) == 4:
        desired_poles = [complex(item.real, item.imag) for item in req.desired_poles]
    else:
        desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j]

    ack_result = design_ackermann_controller(A, B, desired_poles)
    return ack_result


# =====================================================================
# STAGE 4: SIMULATION ENGINE & PERFORMANCE BENCHMARKS
# =====================================================================

@app.post("/api/simulation/run")
def execute_simulation(req: SimulationRunRequest):
    p = _resolve_params(req.params)
    if req.saturation_enabled and req.u_min >= req.u_max:
        raise HTTPException(status_code=422, detail="u_min must be strictly less than u_max.")

    if not req.control_enabled:
        K_vec = None
    elif req.K is not None and len(req.K) == 4:
        K_vec = np.array(req.K, dtype=float)
    elif req.K is not None and len(req.K) == 0:
        K_vec = None
    else:
        lin = compute_linearized_system(p)
        ack = design_ackermann_controller(np.array(lin["A"]), np.array(lin["B"]))
        K_vec = np.array(ack["K"], dtype=float)

    sim_res = run_single_simulation(
        params=p,
        K=K_vec,
        initial_state=req.initial_state,
        t_span=(0.0, req.t_end),
        dt=req.dt,
        disturbance_mag=req.disturbance_mag,
        disturbance_start=req.disturbance_start,
        disturbance_duration=req.disturbance_duration,
        model_type=req.model_type,
        saturation_enabled=req.saturation_enabled,
        u_min=req.u_min,
        u_max=req.u_max,
        manual_force=req.manual_force,
    )
    metrics = calculate_metrics(sim_res)
    return {"simulation": sim_res, "metrics": metrics}


@app.post("/api/simulation/disturbance-test")
def run_disturbance_test(req: DisturbanceTestRequest):
    p = _resolve_params(req.params)
    if req.saturation_enabled and req.u_min >= req.u_max:
        raise HTTPException(status_code=422, detail="u_min must be strictly less than u_max.")

    if req.control_enabled:
        if req.K and len(req.K) == 4:
            K_vec = np.array(req.K, dtype=float)
        else:
            lin = compute_linearized_system(p)
            ack = design_ackermann_controller(np.array(lin["A"]), np.array(lin["B"]))
            K_vec = np.array(ack["K"], dtype=float)
    else:
        K_vec = None

    disturbed = run_single_simulation(
        params=p,
        K=K_vec,
        initial_state=req.initial_state,
        t_span=(0.0, req.t_end),
        dt=req.dt,
        disturbance_mag=req.disturbance_mag,
        disturbance_start=req.disturbance_start,
        disturbance_duration=req.disturbance_duration,
        model_type=req.model_type,
        saturation_enabled=req.saturation_enabled,
        u_min=req.u_min,
        u_max=req.u_max,
    )
    undisturbed = run_single_simulation(
        params=p,
        K=K_vec,
        initial_state=req.initial_state,
        t_span=(0.0, req.t_end),
        dt=req.dt,
        disturbance_mag=0.0,
        model_type=req.model_type,
        saturation_enabled=req.saturation_enabled,
        u_min=req.u_min,
        u_max=req.u_max,
    )
    return {
        "disturbed": disturbed,
        "undisturbed": undisturbed,
        "disturbed_metrics": calculate_metrics(disturbed),
        "undisturbed_metrics": calculate_metrics(undisturbed),
    }


@app.get("/api/simulation/benchmarks")
def get_benchmarks():
    lin = compute_linearized_system(current_params)
    ack = design_ackermann_controller(np.array(lin["A"]), np.array(lin["B"]))
    K_vec = np.array(ack["K"])

    benchmarks = run_benchmark_tests(current_params, K_vec)
    metrics_t1 = calculate_metrics(benchmarks["test1_small_angle"])
    metrics_t1_lin = calculate_metrics(benchmarks["test1_linear_comparison"])
    metrics_t2 = calculate_metrics(benchmarks["test2_large_angle"])
    metrics_t3 = calculate_metrics(benchmarks["test3_disturbance"])
    metrics_t4_open = calculate_metrics(benchmarks["test4_open_loop"])

    comp_table = generate_comparison_table(
        benchmarks["test4_open_loop"],
        benchmarks["test1_small_angle"],
    )

    return {
        "controller_gain": K_vec.tolist(),
        "benchmarks": benchmarks,
        "metrics": {
            "test1_small_angle": metrics_t1,
            "test1_linear_comparison": metrics_t1_lin,
            "test2_large_angle": metrics_t2,
            "test3_disturbance": metrics_t3,
            "test4_open_loop": metrics_t4_open,
        },
        "comparison_table": comp_table,
    }


# =====================================================================
# REAL-TIME WEBSOCKET SIMULATION STREAM
# =====================================================================

@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    await websocket.accept()
    lin = compute_linearized_system(current_params)
    ack = design_ackermann_controller(np.array(lin["A"]), np.array(lin["B"]))
    session = RealtimeSimulationSession(params=current_params, K=ack["K"])

    await websocket.send_json(session.snapshot())

    last_tick = time.perf_counter()

    async def recv_loop():
        while True:
            raw_text = await websocket.receive_text()
            msg = json.loads(raw_text)
            snap = session.apply_command(msg)
            await websocket.send_json(snap)

    receiver_task = asyncio.create_task(recv_loop())

    try:
        while True:
            await asyncio.sleep(0.02)  # ~50 Hz physics broadcast when running
            now = time.perf_counter()
            wall_dt = now - last_tick
            last_tick = now

            if session.status in ("running", "settled"):
                snap = session.advance_by_wall_dt(wall_dt)
                await websocket.send_json(snap)

            if receiver_task.done():
                exc = receiver_task.exception()
                if exc:
                    raise exc
                break
    except WebSocketDisconnect:
        pass
    finally:
        receiver_task.cancel()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
