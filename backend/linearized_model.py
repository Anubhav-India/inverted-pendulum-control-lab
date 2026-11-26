"""
Linearization and State-Space Representation of the Inverted Pendulum.
Includes:
- Small-angle approximation around upright equilibrium (theta = 0)
- State vector definition: X = [x, x_dot, theta, theta_dot]^T
- Exact derivation of A, B, C, D matrices with configurable output matrix C
- Open-loop eigenvalue calculation and physical stability analysis
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from parameters import SystemParameters
from stability_analysis import analyze_matrix_stability

STATE_NAMES = ["x", "x_dot", "theta", "theta_dot"]


def build_output_matrices(measured_states: Optional[List[str]] = None) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Constructs configurable output matrix C and feedthrough matrix D
    for any non-empty subset of ['x', 'x_dot', 'theta', 'theta_dot'].
    Defaults to measuring cart position x and pendulum angle theta.
    """
    if not measured_states:
        selected = ["x", "theta"]
    else:
        selected = [s for s in measured_states if s in STATE_NAMES]
        if not selected:
            selected = ["x", "theta"]

    rows = []
    for name in selected:
        row = [1.0 if s == name else 0.0 for s in STATE_NAMES]
        rows.append(row)

    C = np.array(rows, dtype=float)
    D = np.zeros((len(selected), 1), dtype=float)
    return C, D, selected


def _matrix_to_latex(M: np.ndarray, digits: int = 6) -> str:
    rows = []
    for r in range(M.shape[0]):
        row_str = " & ".join(
            f"{M[r, c]:.{digits}f}" if abs(M[r, c]) > 1e-12 and not float(M[r, c]).is_integer()
            else f"{int(round(M[r, c]))}" if abs(M[r, c] - round(M[r, c])) < 1e-12
            else f"{M[r, c]:.{digits}f}"
            for c in range(M.shape[1])
        )
        rows.append(row_str)
    return "\\begin{bmatrix} " + " \\\\ ".join(rows) + " \\end{bmatrix}"


def compute_linearized_system(
    params: SystemParameters,
    measured_states: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Computes the linearized continuous-time state-space matrices A, B, C, D
    and evaluates open-loop stability.
    Consistent with theta = 0 upright, theta > 0 clockwise (x_p = x + l*sin(theta)):
      (M + m)x_ddot + b*x_dot + m*l*theta_ddot = u
      (I + m*l^2)theta_ddot + m*l*x_ddot = m*g*l*theta
    """
    M = params.M
    m = params.m
    l = params.l
    I = params.I
    b = params.b
    g = params.g

    I_plus_ml2 = I + m * (l ** 2)
    M_plus_m = M + m
    ml = m * l

    # p = I*(M + m) + M*m*l^2 == (M + m)*(I + m*l^2) - (m*l)^2
    d0 = I * M_plus_m + M * m * (l ** 2)

    a22 = -(b * I_plus_ml2) / d0
    a23 = -((m ** 2) * g * (l ** 2)) / d0
    a42 = (ml * b) / d0
    a43 = (M_plus_m * m * g * l) / d0

    A = np.array([
        [0.0, 1.0, 0.0, 0.0],
        [0.0, a22, a23, 0.0],
        [0.0, 0.0, 0.0, 1.0],
        [0.0, a42, a43, 0.0]
    ], dtype=float)

    b2 = I_plus_ml2 / d0
    b4 = -ml / d0

    B = np.array([
        [0.0],
        [b2],
        [0.0],
        [b4]
    ], dtype=float)

    C, D, selected_outputs = build_output_matrices(measured_states)

    # Open-loop stability analysis
    stability = analyze_matrix_stability(A, label="Open-Loop")

    # Format LaTeX expressions
    A_latex = _matrix_to_latex(A, 6)
    B_latex = _matrix_to_latex(B, 6)
    C_latex = _matrix_to_latex(C, 0)
    D_latex = _matrix_to_latex(D, 0)

    eigs_formatted = [
        {
            "real": ev["real"],
            "imag": ev["imag"],
            "formatted": ev["formatted"],
            "region": ev["region"],
            "natural_frequency_rad_s": ev["natural_frequency_rad_s"],
            "damping_ratio": ev["damping_ratio"],
            "time_constant_s": ev["time_constant_s"],
        }
        for ev in stability["eigenvalues"]
    ]

    return {
        "d0": float(d0),
        "p": float(d0),
        "A": A.tolist(),
        "B": B.tolist(),
        "C": C.tolist(),
        "D": D.tolist(),
        "measured_states": selected_outputs,
        "A_latex": A_latex,
        "B_latex": B_latex,
        "C_latex": C_latex,
        "D_latex": D_latex,
        "coefficients": {
            "a22": float(a22),
            "a23": float(a23),
            "a42": float(a42),
            "a43": float(a43),
            "b2": float(b2),
            "b4": float(b4),
            "p": float(d0),
        },
        "open_loop_eigenvalues": eigs_formatted,
        "stability": stability,
        "is_stable": stability["is_stable"],
        "stability_status": "Unstable (RHP eigenvalue detected)" if not stability["is_stable"] else "Marginally Stable",
        "unstable_explanation": (
            "The system possesses a purely positive real eigenvalue (in the right-half s-plane). "
            "Physically, this reflects the inverted pendulum falling exponentially away from the upright equilibrium "
            "under the influence of gravity when unactuated."
        )
    }


def compute_linear_accelerations(
    A: np.ndarray,
    B: np.ndarray,
    state: np.ndarray,
    u: float
) -> Tuple[float, float]:
    """Evaluates linear x_ddot and theta_ddot from X_dot = A*X + B*u."""
    dxdt = A @ state + B.flatten() * u
    return float(dxdt[1]), float(dxdt[3])


def analyze_small_angle_approximation(theta_deg: float) -> Dict[str, Any]:
    """
    Quantifies small-angle linearization errors at a given angle theta_deg.
    """
    theta_rad = float(np.radians(theta_deg))
    sin_exact = float(np.sin(theta_rad))
    cos_exact = float(np.cos(theta_rad))
    sin_approx = theta_rad
    cos_approx = 1.0

    sin_abs_err = abs(sin_exact - sin_approx)
    cos_abs_err = abs(cos_exact - cos_approx)
    sin_rel_err_pct = (sin_abs_err / abs(sin_exact) * 100.0) if abs(sin_exact) > 1e-12 else 0.0
    cos_rel_err_pct = (cos_abs_err / abs(cos_exact) * 100.0) if abs(cos_exact) > 1e-12 else 0.0

    return {
        "theta_deg": float(theta_deg),
        "theta_rad": theta_rad,
        "sin_exact": sin_exact,
        "sin_approx": sin_approx,
        "sin_abs_err": sin_abs_err,
        "sin_rel_err_pct": sin_rel_err_pct,
        "cos_exact": cos_exact,
        "cos_approx": cos_approx,
        "cos_abs_err": cos_abs_err,
        "cos_rel_err_pct": cos_rel_err_pct,
        "is_accurate_regime": abs(theta_deg) <= 10.0,
    }
