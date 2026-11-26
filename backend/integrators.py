"""
Numerical Integration Module for the Inverted Pendulum Platform.
Provides:
- Fixed-step 4th-order Runge-Kutta (RK4) for real-time interactive simulation
- Actuator saturation clipping (u_min <= u_applied <= u_max)
- Consistent state derivatives for both nonlinear and linearized models
"""

import numpy as np
from typing import Optional, Tuple, Dict, Any
from parameters import SystemParameters
from nonlinear_model import calculate_nonlinear_accelerations
from linearized_model import compute_linear_accelerations


def compute_control_and_total_force(
    state: np.ndarray,
    K: Optional[np.ndarray],
    control_enabled: bool,
    external_force: float,
    saturation_enabled: bool = False,
    u_min: float = -10.0,
    u_max: float = 10.0,
) -> Dict[str, Any]:
    """
    Computes requested feedback force u_req = -K*X (if control enabled),
    applies actuator saturation if enabled, and adds external/manual/disturbance force.
    """
    if control_enabled and K is not None:
        u_requested = -float(np.dot(K, state))
    else:
        u_requested = 0.0

    is_saturated = False
    if control_enabled and saturation_enabled:
        u_applied = float(np.clip(u_requested, u_min, u_max))
        is_saturated = abs(u_applied - u_requested) > 1e-9
    else:
        u_applied = u_requested

    u_total = u_applied + float(external_force)
    return {
        "u_requested": u_requested,
        "u_applied": u_applied,
        "u_external": float(external_force),
        "u_total": u_total,
        "is_saturated": is_saturated,
    }


def evaluate_state_derivative(
    state: np.ndarray,
    u_total: float,
    params: SystemParameters,
    model_type: str = "nonlinear",
    A: Optional[np.ndarray] = None,
    B: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    Evaluates dX/dt = [x_dot, x_ddot, theta_dot, theta_ddot]^T
    for either the nonlinear Lagrangian equations or the linearized state-space model.
    """
    x, x_dot, theta, theta_dot = state
    if model_type == "linear" and A is not None and B is not None:
        x_ddot, theta_ddot = compute_linear_accelerations(A, B, state, u_total)
    else:
        x_ddot, theta_ddot, _ = calculate_nonlinear_accelerations(
            params, x, x_dot, theta, theta_dot, u_total
        )
    return np.array([x_dot, x_ddot, theta_dot, theta_ddot], dtype=float)


def rk4_step(
    state: np.ndarray,
    dt: float,
    params: SystemParameters,
    K: Optional[np.ndarray],
    control_enabled: bool,
    external_force: float,
    model_type: str = "nonlinear",
    A: Optional[np.ndarray] = None,
    B: Optional[np.ndarray] = None,
    saturation_enabled: bool = False,
    u_min: float = -10.0,
    u_max: float = 10.0,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Advances the 4-state vector by one time step dt using 4th-order Runge-Kutta.
    """
    def rhs(s: np.ndarray) -> np.ndarray:
        forces = compute_control_and_total_force(
            s, K, control_enabled, external_force,
            saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max
        )
        return evaluate_state_derivative(
            s, forces["u_total"], params, model_type=model_type, A=A, B=B
        )

    k1 = rhs(state)
    k2 = rhs(state + 0.5 * dt * k1)
    k3 = rhs(state + 0.5 * dt * k2)
    k4 = rhs(state + dt * k3)

    next_state = state + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)

    # Evaluate forces and accelerations at the updated state for telemetry
    final_forces = compute_control_and_total_force(
        next_state, K, control_enabled, external_force,
        saturation_enabled=saturation_enabled, u_min=u_min, u_max=u_max
    )
    deriv = evaluate_state_derivative(
        next_state, final_forces["u_total"], params, model_type=model_type, A=A, B=B
    )
    final_forces["x_ddot"] = float(deriv[1])
    final_forces["theta_ddot"] = float(deriv[3])

    return next_state, final_forces
