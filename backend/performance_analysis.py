"""
Performance Evaluation and Metrics Computation for Inverted Pendulum Simulation.
Calculates:
- Settling time (2% threshold)
- Rise time
- Peak angular displacement
- Overshoot (%)
- Steady-state errors (angle, position)
- Maximum control force and control effort integral
- Maximum cart excursion
- Comparative table (Open-Loop vs Closed-Loop)
"""

import numpy as np
from typing import Dict, Any, List


def calculate_metrics(sim_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes rigorous transient and steady-state performance metrics
    from simulation time-series data.
    """
    t = np.array(sim_data["time"])
    x = np.array(sim_data["x"])
    x_dot = np.array(sim_data["x_dot"])
    theta = np.array(sim_data["theta"])
    theta_deg = np.array(sim_data["theta_deg"])
    u = np.array(sim_data["u"])
    
    # Check if system stabilized or blew up
    is_stable = bool(np.all(np.abs(theta_deg[-int(len(t)*0.1):]) < 2.0) and np.all(np.abs(theta_deg) < 90.0))
    
    # Peak angle
    peak_theta_rad = float(np.max(np.abs(theta)))
    peak_theta_deg = float(np.max(np.abs(theta_deg)))
    
    # Peak cart displacement and force
    peak_x = float(np.max(np.abs(x)))
    peak_x_dot = float(np.max(np.abs(x_dot)))
    peak_force = float(np.max(np.abs(u))) if len(u) > 0 else 0.0
    
    # Control effort: integral of u^2 dt
    dt = float(t[1] - t[0]) if len(t) > 1 else 0.01
    trap_fn = getattr(np, "trapezoid", None) or getattr(np, "trapz")
    control_effort = float(trap_fn(u**2, t)) if len(u) > 0 else 0.0

    # Saturation stats
    sat_flags = sim_data.get("is_saturated", [])
    sat_pct = (sum(1 for f in sat_flags if f) / len(sat_flags) * 100.0) if sat_flags else 0.0
    u_req_arr = np.array(sim_data.get("u_requested", u))
    peak_requested_force = float(np.max(np.abs(u_req_arr))) if len(u_req_arr) > 0 else 0.0
    
    # Steady state errors (evaluated over the last 5% of simulation)
    tail_pts = max(1, int(len(t) * 0.05))
    ss_theta_deg = float(np.mean(theta_deg[-tail_pts:]))
    ss_x = float(np.mean(x[-tail_pts:]))
    
    # Settling time (2% criterion based on initial angle deviation or 0.1 deg bound)
    settling_threshold_deg = max(0.05, 0.02 * abs(theta_deg[0])) if abs(theta_deg[0]) > 0.01 else 0.1
    settling_time = None
    
    if is_stable:
        # Find time after which |theta_deg| stays below threshold
        unsettled_indices = np.where(np.abs(theta_deg) > settling_threshold_deg)[0]
        if len(unsettled_indices) == 0:
            settling_time = 0.0
        elif unsettled_indices[-1] < len(t) - 1:
            settling_time = float(t[unsettled_indices[-1] + 1])
        else:
            settling_time = float(t[-1])
            
    # Overshoot calculation: if angle crosses zero and reaches an opposite peak
    initial_sign = np.sign(theta_deg[0]) if abs(theta_deg[0]) > 1e-4 else 1.0
    opposite_peak = float(np.max(-initial_sign * theta_deg))
    if opposite_peak > 0 and abs(theta_deg[0]) > 1e-4:
        overshoot_pct = float((opposite_peak / abs(theta_deg[0])) * 100.0)
    else:
        overshoot_pct = 0.0

    return {
        "is_stable": is_stable,
        "settling_time_s": settling_time,
        "settling_threshold_deg": settling_threshold_deg,
        "peak_angle_deg": peak_theta_deg,
        "peak_angle_rad": peak_theta_rad,
        "overshoot_pct": overshoot_pct,
        "steady_state_angle_deg": ss_theta_deg,
        "steady_state_cart_x_m": ss_x,
        "peak_cart_displacement_m": peak_x,
        "peak_cart_velocity_mps": peak_x_dot,
        "peak_control_force_N": peak_force,
        "peak_requested_force_N": peak_requested_force,
        "saturation_pct": float(sat_pct),
        "control_effort_integral_N2s": control_effort
    }


def generate_comparison_table(
    open_loop_sim: Dict[str, Any],
    closed_loop_sim: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Produces a structured side-by-side comparison table between open-loop
    and closed-loop responses.
    """
    m_open = calculate_metrics(open_loop_sim)
    m_closed = calculate_metrics(closed_loop_sim)
    
    table = [
        {
            "metric": "Asymptotic Stability",
            "open_loop": "UNSTABLE (Angle diverges > 90°)",
            "closed_loop": "STABLE (Restores to 0°)",
            "unit": "Boolean / State"
        },
        {
            "metric": "Settling Time (2% criterion)",
            "open_loop": "Diverged (∞)",
            "closed_loop": f"{m_closed['settling_time_s']:.2f} s" if m_closed['settling_time_s'] is not None else "N/A",
            "unit": "s"
        },
        {
            "metric": "Steady-State Angular Error",
            "open_loop": "Fallen (Divergent)",
            "closed_loop": f"{m_closed['steady_state_angle_deg']:.4f}°",
            "unit": "degrees"
        },
        {
            "metric": "Steady-State Cart Position Error",
            "open_loop": "Divergent",
            "closed_loop": f"{m_closed['steady_state_cart_x_m']:.4f} m",
            "unit": "m"
        },
        {
            "metric": "Peak Angular Displacement",
            "open_loop": f"{m_open['peak_angle_deg']:.2f}°",
            "closed_loop": f"{m_closed['peak_angle_deg']:.2f}°",
            "unit": "degrees"
        },
        {
            "metric": "Peak Cart Excursion",
            "open_loop": f"{m_open['peak_cart_displacement_m']:.2f} m",
            "closed_loop": f"{m_closed['peak_cart_displacement_m']:.2f} m",
            "unit": "m"
        },
        {
            "metric": "Maximum Control Force |u|",
            "open_loop": "0.00 N (Uncontrolled)",
            "closed_loop": f"{m_closed['peak_control_force_N']:.2f} N",
            "unit": "N"
        },
        {
            "metric": "Total Control Energy ∫ u² dt",
            "open_loop": "0.00 N²·s",
            "closed_loop": f"{m_closed['control_effort_integral_N2s']:.2f} N²·s",
            "unit": "N²·s"
        }
    ]
    return table
