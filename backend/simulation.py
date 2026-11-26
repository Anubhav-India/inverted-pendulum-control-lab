"""
Numerical Simulation Engine for the Inverted Pendulum System.
Simulates:
- Nonlinear dynamics using SciPy RK45 (batch) and fixed-step RK4 (real-time)
- Linearized dynamics for comparative validation
- Actuator saturation clipping (u_min, u_max)
- Manual force control, hold/release, impulse, and disturbance injection
- Linear vs Nonlinear divergence comparison
- Real-time stateful simulation session for WebSocket streaming
"""

import numpy as np
from scipy.integrate import solve_ivp
from typing import Dict, Any, List, Optional, Tuple
from parameters import SystemParameters, get_default_parameters
from nonlinear_model import calculate_nonlinear_accelerations
from linearized_model import compute_linearized_system
from integrators import compute_control_and_total_force, evaluate_state_derivative, rk4_step


def run_single_simulation(
    params: SystemParameters,
    K: Optional[np.ndarray],
    initial_state: List[float],
    t_span: Tuple[float, float] = (0.0, 8.0),
    dt: float = 0.01,
    disturbance_mag: float = 0.0,
    disturbance_start: float = 2.0,
    disturbance_duration: float = 0.2,
    model_type: str = "nonlinear",
    A: Optional[np.ndarray] = None,
    B: Optional[np.ndarray] = None,
    saturation_enabled: bool = False,
    u_min: float = -10.0,
    u_max: float = 10.0,
    manual_force: float = 0.0,
) -> Dict[str, Any]:
    """
    Simulates either the nonlinear or linearized cart-pole system using SciPy RK45.
    """
    K_vec = np.array(K, dtype=float) if K is not None else None
    control_enabled = K_vec is not None
    t_eval = np.arange(t_span[0], t_span[1] + dt / 2.0, dt)

    if A is None or B is None:
        lin = compute_linearized_system(params)
        A_mat = np.array(lin["A"], dtype=float)
        B_mat = np.array(lin["B"], dtype=float)
    else:
        A_mat = np.array(A, dtype=float)
        B_mat = np.array(B, dtype=float)

    def get_external_force(t: float) -> float:
        dist = 0.0
        if disturbance_mag != 0.0 and disturbance_start <= t <= (disturbance_start + disturbance_duration):
            dist = disturbance_mag
        return dist + manual_force

    def ode_rhs(t: float, y: np.ndarray) -> np.ndarray:
        ext_f = get_external_force(t)
        forces = compute_control_and_total_force(
            y, K_vec, control_enabled, ext_f,
            saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max
        )
        return evaluate_state_derivative(
            y, forces["u_total"], params, model_type=model_type, A=A_mat, B=B_mat
        )

    sol = solve_ivp(
        ode_rhs,
        t_span,
        initial_state,
        t_eval=t_eval,
        method="RK45",
        max_step=min(dt, 0.01),
        rtol=1e-7,
        atol=1e-9,
    )
    t_pts = sol.t
    y_pts = sol.y

    u_requested_list: List[float] = []
    u_applied_list: List[float] = []
    disturbances: List[float] = []
    total_forces: List[float] = []
    is_saturated_list: List[bool] = []
    x_ddot_list: List[float] = []
    theta_ddot_list: List[float] = []

    for i, t in enumerate(t_pts):
        ext_f = get_external_force(float(t))
        state_i = y_pts[:, i]
        forces = compute_control_and_total_force(
            state_i, K_vec, control_enabled, ext_f,
            saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max
        )
        deriv = evaluate_state_derivative(
            state_i, forces["u_total"], params, model_type=model_type, A=A_mat, B=B_mat
        )
        u_requested_list.append(forces["u_requested"])
        u_applied_list.append(forces["u_applied"])
        disturbances.append(ext_f)
        total_forces.append(forces["u_total"])
        is_saturated_list.append(forces["is_saturated"])
        x_ddot_list.append(float(deriv[1]))
        theta_ddot_list.append(float(deriv[3]))

    return {
        "time": t_pts.tolist(),
        "x": y_pts[0, :].tolist(),
        "x_dot": y_pts[1, :].tolist(),
        "theta": y_pts[2, :].tolist(),
        "theta_deg": np.degrees(y_pts[2, :]).tolist(),
        "theta_dot": y_pts[3, :].tolist(),
        "x_ddot": x_ddot_list,
        "theta_ddot": theta_ddot_list,
        "u": u_applied_list,
        "u_requested": u_requested_list,
        "u_applied": u_applied_list,
        "is_saturated": is_saturated_list,
        "saturation_enabled": saturation_enabled,
        "disturbance": disturbances,
        "total_force": total_forces,
        "model_type": model_type,
        "is_closed_loop": control_enabled,
    }


def run_linear_vs_nonlinear_comparison(
    params: SystemParameters,
    K: Optional[np.ndarray],
    initial_state: List[float],
    t_end: float = 3.0,
    dt: float = 0.01,
    manual_force: float = 0.0,
    saturation_enabled: bool = False,
    u_min: float = -10.0,
    u_max: float = 10.0,
) -> Dict[str, Any]:
    """
    Runs both nonlinear and linear simulations from the exact same initial condition
    and control/input parameters to illustrate linearization validity & divergence.
    """
    lin = compute_linearized_system(params)
    A = np.array(lin["A"], dtype=float)
    B = np.array(lin["B"], dtype=float)

    nl_sim = run_single_simulation(
        params=params, K=K, initial_state=initial_state, t_span=(0.0, t_end), dt=dt,
        model_type="nonlinear", A=A, B=B,
        saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max,
        manual_force=manual_force,
    )
    lin_sim = run_single_simulation(
        params=params, K=K, initial_state=initial_state, t_span=(0.0, t_end), dt=dt,
        model_type="linear", A=A, B=B,
        saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max,
        manual_force=manual_force,
    )

    th_nl = np.array(nl_sim["theta_deg"])
    th_lin = np.array(lin_sim["theta_deg"])
    x_nl = np.array(nl_sim["x"])
    x_lin = np.array(lin_sim["x"])

    theta_err_deg = np.abs(th_nl - th_lin)
    x_err_m = np.abs(x_nl - x_lin)

    return {
        "nonlinear": nl_sim,
        "linear": lin_sim,
        "theta_error_deg": theta_err_deg.tolist(),
        "x_error_m": x_err_m.tolist(),
        "max_theta_error_deg": float(np.max(theta_err_deg)),
        "max_x_error_m": float(np.max(x_err_m)),
    }


def run_benchmark_tests(
    params: SystemParameters,
    K: np.ndarray
) -> Dict[str, Any]:
    """
    Executes the standard test suite:
    - Test 1: Small angle (5 deg), closed-loop
    - Test 2: Larger angle (10 deg), closed-loop
    - Test 3: Disturbance rejection (+10 N pulse for 0.2s at t=2s)
    - Test 4: Open-loop (K=0) vs Closed-loop (u=-Kx) for 5 deg
    """
    th5 = float(np.radians(5.0))
    th10 = float(np.radians(10.0))

    test1 = run_single_simulation(
        params, K, [0.0, 0.0, th5, 0.0], t_span=(0.0, 8.0), model_type="nonlinear"
    )
    test1_linear = run_single_simulation(
        params, K, [0.0, 0.0, th5, 0.0], t_span=(0.0, 8.0), model_type="linear"
    )
    test2 = run_single_simulation(
        params, K, [0.0, 0.0, th10, 0.0], t_span=(0.0, 8.0), model_type="nonlinear"
    )
    test3 = run_single_simulation(
        params, K, [0.0, 0.0, 0.0, 0.0], t_span=(0.0, 8.0),
        disturbance_mag=10.0, disturbance_start=2.0, disturbance_duration=0.05,
        model_type="nonlinear"
    )
    test4_open = run_single_simulation(
        params, None, [0.0, 0.0, th5, 0.0], t_span=(0.0, 2.5), model_type="nonlinear"
    )

    return {
        "test1_small_angle": test1,
        "test1_linear_comparison": test1_linear,
        "test2_large_angle": test2,
        "test3_disturbance": test3,
        "test4_open_loop": test4_open,
        "test4_closed_loop": test1,
    }


class RealtimeSimulationSession:
    """
    Stateful real-time physics simulation session driven by Python RK4 integration
    and streamed to the frontend over WebSocket.
    """

    def __init__(self, params: Optional[SystemParameters] = None, K: Optional[List[float]] = None):
        self.params = params if params is not None else get_default_parameters()
        self._refresh_linear_matrices()
        self.K = np.array(K if K is not None else [-0.1794, -0.4588, -10.0188, -1.4635], dtype=float)

        # Initial conditions [x, x_dot, theta (rad), theta_dot]
        self.initial_state = np.array([0.0, 0.0, float(np.radians(5.0)), 0.0], dtype=float)
        self.state = self.initial_state.copy()
        self.sim_time: float = 0.0
        self.dt: float = 0.01
        self.duration: float = 30.0  # Max duration if finite stop desired, or 0 for continuous
        self.continuous: bool = True
        self.speed: float = 1.0

        # Modes
        self.model_type: str = "nonlinear"   # "nonlinear" | "linear"
        self.control_mode: str = "auto"      # "auto" | "manual" | "auto_with_disturbance"
        self.status: str = "reset"           # "reset" | "running" | "paused" | "settled" | "unstable" | "completed"

        # Actuator saturation
        self.saturation_enabled: bool = False
        self.u_min: float = -10.0
        self.u_max: float = 10.0

        # Manual / disturbance force state
        self.manual_force_active: float = 0.0
        self.manual_force_until: Optional[float] = None  # sim_time deadline (None = held until released)
        self.impulse_force_active: float = 0.0
        self.impulse_until: Optional[float] = None

        # Latest force & accel telemetry
        self.last_telemetry: Dict[str, Any] = self._compute_current_telemetry()

    def _refresh_linear_matrices(self) -> None:
        lin = compute_linearized_system(self.params)
        self.A = np.array(lin["A"], dtype=float)
        self.B = np.array(lin["B"], dtype=float)

    @property
    def control_enabled(self) -> bool:
        return self.control_mode in ("auto", "auto_with_disturbance")

    def _current_external_force(self) -> float:
        ext = 0.0
        if self.manual_force_active != 0.0:
            if self.manual_force_until is None or self.sim_time <= self.manual_force_until:
                ext += self.manual_force_active
            else:
                self.manual_force_active = 0.0
                self.manual_force_until = None
        if self.impulse_force_active != 0.0:
            if self.impulse_until is not None and self.sim_time <= self.impulse_until:
                ext += self.impulse_force_active
            else:
                self.impulse_force_active = 0.0
                self.impulse_until = None
        return ext

    def _compute_current_telemetry(self) -> Dict[str, Any]:
        ext = self._current_external_force()
        forces = compute_control_and_total_force(
            self.state, self.K, self.control_enabled, ext,
            saturation_enabled=self.saturation_enabled, u_min=self.u_min, u_max=self.u_max
        )
        deriv = evaluate_state_derivative(
            self.state, forces["u_total"], self.params,
            model_type=self.model_type, A=self.A, B=self.B
        )
        forces["x_ddot"] = float(deriv[1])
        forces["theta_ddot"] = float(deriv[3])
        return forces

    def reset(self) -> None:
        self.state = self.initial_state.copy()
        self.sim_time = 0.0
        self.manual_force_active = 0.0
        self.manual_force_until = None
        self.impulse_force_active = 0.0
        self.impulse_until = None
        self.status = "reset"
        self.last_telemetry = self._compute_current_telemetry()

    def clear_initial_conditions(self) -> None:
        self.initial_state = np.array([0.0, 0.0, 0.0, 0.0], dtype=float)
        self.reset()

    def step_once(self) -> Dict[str, Any]:
        if self.status in ("unstable", "completed"):
            return self.snapshot()

        # Check termination / fall-over (> 180 deg in nonlinear or extreme divergence)
        if abs(self.state[2]) > np.pi:
            self.status = "unstable"
            return self.snapshot()

        if not self.continuous and self.sim_time >= self.duration:
            self.status = "completed"
            return self.snapshot()

        ext = self._current_external_force()
        next_state, telem = rk4_step(
            state=self.state,
            dt=self.dt,
            params=self.params,
            K=self.K,
            control_enabled=self.control_enabled,
            external_force=ext,
            model_type=self.model_type,
            A=self.A,
            B=self.B,
            saturation_enabled=self.saturation_enabled,
            u_min=self.u_min,
            u_max=self.u_max,
        )

        # Guard numerical blowup
        if not np.all(np.isfinite(next_state)) or np.max(np.abs(next_state)) > 1e4:
            self.status = "unstable"
            return self.snapshot()

        self.state = next_state
        self.sim_time += self.dt
        self.last_telemetry = telem

        theta_deg = abs(float(np.degrees(self.state[2])))
        if theta_deg > 90.0:
            self.status = "unstable"
        elif (
            self.control_enabled
            and abs(ext) < 1e-6
            and theta_deg < 0.1
            and abs(self.state[3]) < 0.02
            and abs(self.state[0]) < 0.015
            and abs(self.state[1]) < 0.02
            and self.sim_time > 0.8
        ):
            self.status = "settled"
        elif self.status != "paused":
            self.status = "running"

        return self.snapshot()

    def advance_by_wall_dt(self, wall_dt: float) -> Dict[str, Any]:
        if self.status not in ("running", "settled"):
            return self.snapshot()
        target_sim_dt = min(0.05, max(0.0, wall_dt)) * self.speed
        n_steps = max(1, int(round(target_sim_dt / self.dt)))
        for _ in range(n_steps):
            self.step_once()
            if self.status in ("unstable", "completed"):
                break
        return self.snapshot()

    def apply_command(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        cmd = msg.get("cmd")
        if cmd == "start":
            if self.status in ("unstable", "completed"):
                self.reset()
            self.status = "running"
        elif cmd == "pause":
            if self.status in ("running", "settled"):
                self.status = "paused"
        elif cmd == "resume":
            if self.status == "paused":
                self.status = "running"
        elif cmd == "reset":
            self.reset()
        elif cmd == "clear_ic":
            self.clear_initial_conditions()
        elif cmd == "step":
            prev_status = self.status
            if prev_status in ("reset", "paused"):
                self.status = "paused"
            self.step_once()
            if self.status not in ("unstable", "completed"):
                self.status = "paused"
        elif cmd == "set_speed":
            self.speed = float(np.clip(float(msg.get("speed", 1.0)), 0.05, 5.0))
        elif cmd == "set_config":
            if "model_type" in msg and msg["model_type"] in ("nonlinear", "linear"):
                self.model_type = msg["model_type"]
            if "control_mode" in msg and msg["control_mode"] in ("auto", "manual", "auto_with_disturbance"):
                self.control_mode = msg["control_mode"]
            if "dt" in msg:
                self.dt = float(np.clip(float(msg["dt"]), 0.001, 0.05))
            if "duration" in msg:
                self.duration = float(np.clip(float(msg["duration"]), 0.5, 120.0))
            if "continuous" in msg:
                self.continuous = bool(msg["continuous"])
            if "saturation_enabled" in msg:
                self.saturation_enabled = bool(msg["saturation_enabled"])
            if "u_min" in msg:
                self.u_min = float(msg["u_min"])
            if "u_max" in msg:
                self.u_max = float(msg["u_max"])
            if self.u_min >= self.u_max:
                self.u_min = self.u_max - 1.0
            self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "update_params":
            p = msg.get("params", {})
            candidate = SystemParameters(
                M=float(p.get("M", self.params.M)),
                m=float(p.get("m", self.params.m)),
                l=float(p.get("l", self.params.l)),
                I=float(p.get("I", self.params.I)),
                b=float(p.get("b", self.params.b)),
                g=float(p.get("g", self.params.g)),
            )
            ok, _ = candidate.validate()
            if ok:
                self.params = candidate
                self._refresh_linear_matrices()
                self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "update_K":
            K_in = msg.get("K")
            if isinstance(K_in, list) and len(K_in) == 4:
                self.K = np.array([float(v) for v in K_in], dtype=float)
                self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "update_initial_state":
            ic = msg.get("initial_state")
            if isinstance(ic, list) and len(ic) == 4:
                self.initial_state = np.array([float(v) for v in ic], dtype=float)
                if self.status == "reset":
                    self.state = self.initial_state.copy()
                    self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "apply_manual_force":
            mag = float(msg.get("force", 0.0))
            dur = msg.get("duration")  # None means continuous hold until release
            self.manual_force_active = mag
            self.manual_force_until = (self.sim_time + float(dur)) if dur is not None and float(dur) > 0 else None
            self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "release_manual_force":
            self.manual_force_active = 0.0
            self.manual_force_until = None
            self.last_telemetry = self._compute_current_telemetry()
        elif cmd == "apply_impulse":
            mag = float(msg.get("force", 10.0))
            dur = float(np.clip(float(msg.get("duration", 0.2)), 0.02, 5.0))
            self.impulse_force_active = mag
            self.impulse_until = self.sim_time + dur
            self.last_telemetry = self._compute_current_telemetry()

        return self.snapshot()

    def snapshot(self) -> Dict[str, Any]:
        t = self.last_telemetry
        x, x_dot, theta, theta_dot = [float(v) for v in self.state]
        return {
            "type": "sim_state",
            "t": round(self.sim_time, 5),
            "status": self.status,
            "model_type": self.model_type,
            "control_mode": self.control_mode,
            "control_enabled": self.control_enabled,
            "speed": self.speed,
            "dt": self.dt,
            "duration": self.duration,
            "continuous": self.continuous,
            "saturation_enabled": self.saturation_enabled,
            "u_min": self.u_min,
            "u_max": self.u_max,
            "state": {
                "x": x,
                "x_dot": x_dot,
                "theta": theta,
                "theta_deg": float(np.degrees(theta)),
                "theta_dot": theta_dot,
            },
            "telemetry": {
                "x_ddot": t.get("x_ddot", 0.0),
                "theta_ddot": t.get("theta_ddot", 0.0),
                "u_requested": t.get("u_requested", 0.0),
                "u_applied": t.get("u_applied", 0.0),
                "u_external": t.get("u_external", 0.0),
                "u_total": t.get("u_total", 0.0),
                "is_saturated": t.get("is_saturated", False),
            },
        }
