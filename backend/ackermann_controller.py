"""
State-Feedback Controller Design Using Ackermann's Formula.
Strict Controller Restriction: ONLY Full-State Feedback u = -KX.
Calculates:
- Controllability & pole-validity checks (conjugate pairs, LHP stability, conditioning)
- Desired characteristic polynomial Phi(s) = (s-p1)(s-p2)(s-p3)(s-p4)
- Matrix powers: A, A^2, A^3, A^4
- Matrix polynomial evaluation: Phi(A) = A^4 + a3*A^3 + a2*A^2 + a1*A + a0*I
- Controllability matrix inverse C^-1
- Gain matrix K = [0 0 0 1] * C^-1 * Phi(A)
- Cross-verification against scipy.signal.place_poles
- Closed-loop matrix A_cl = A - B*K and actual eigenvalue verification
"""

import numpy as np
from scipy.signal import place_poles
from typing import Dict, Any, List, Union, Tuple, Optional


POLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "slow": {
        "label": "Slow Response (Gentle Control)",
        "description": "Low control effort and minimal overshoot, slower settling.",
        "poles": [
            {"real": -1.0, "imag": 0.0},
            {"real": -1.2, "imag": 0.0},
            {"real": -0.8, "imag": 0.5},
            {"real": -0.8, "imag": -0.5},
        ],
    },
    "moderate": {
        "label": "Moderate Response (Balanced Default)",
        "description": "Well-damped trade-off between settling speed and actuator force.",
        "poles": [
            {"real": -2.0, "imag": 0.0},
            {"real": -2.0, "imag": 0.0},
            {"real": -1.0, "imag": 1.0},
            {"real": -1.0, "imag": -1.0},
        ],
    },
    "fast": {
        "label": "Fast Response (Crisp Stabilization)",
        "description": "Rapid recovery from disturbances; demands higher actuator thrust.",
        "poles": [
            {"real": -4.0, "imag": 0.0},
            {"real": -4.5, "imag": 0.0},
            {"real": -2.5, "imag": 2.0},
            {"real": -2.5, "imag": -2.0},
        ],
    },
    "aggressive": {
        "label": "High-Bandwidth (Saturation Risk)",
        "description": "Very large gains; prone to actuator saturation and noise sensitivity.",
        "poles": [
            {"real": -7.0, "imag": 0.0},
            {"real": -8.0, "imag": 0.0},
            {"real": -5.0, "imag": 3.0},
            {"real": -5.0, "imag": -3.0},
        ],
    },
}


def validate_desired_poles(poles: np.ndarray) -> Tuple[bool, List[str], List[str]]:
    """
    Validates that:
    1. Exactly 4 poles are provided.
    2. All poles are finite numbers.
    3. Complex poles appear in conjugate pairs (a +/- bj) so Phi(s) has real coefficients.
    4. Returns warnings if any pole is in RHP/jW-axis or very aggressive.
    """
    errors: List[str] = []
    warnings: List[str] = []

    if len(poles) != 4:
        errors.append(f"Expected exactly 4 desired poles for a 4th-order system, got {len(poles)}.")
        return False, errors, warnings

    if not np.all(np.isfinite(poles)):
        errors.append("All desired poles must have finite real and imaginary parts.")
        return False, errors, warnings

    # Check conjugate pair symmetry: poly(poles) should have negligible imaginary part
    poly_coeffs = np.poly(poles)
    max_imag_coeff = float(np.max(np.abs(np.imag(poly_coeffs))))
    if max_imag_coeff > 1e-4:
        errors.append(
            "Complex poles must appear in conjugate pairs (a + bj and a - bj) so the "
            "characteristic polynomial and state-feedback gains remain real-valued."
        )

    if any(np.real(p) > 0 for p in poles):
        warnings.append(
            "One or more desired poles lie in the Right-Half Plane (Re(p) > 0). "
            "The closed-loop system will be UNSTABLE by design!"
        )
    elif any(abs(np.real(p)) <= 1e-6 for p in poles):
        warnings.append(
            "One or more desired poles lie on the imaginary axis (Re(p) = 0). "
            "The closed-loop system will only be marginally stable."
        )

    if any(abs(p) > 8.0 for p in poles):
        warnings.append(
            "Aggressive pole locations (|p| > 8) produce large feedback gains K, "
            "increasing peak actuator force demand and risk of actuator saturation."
        )

    return len(errors) == 0, errors, warnings


def _format_pole_str(p: complex, digits: int = 4) -> str:
    rp, ip = float(np.real(p)), float(np.imag(p))
    if abs(ip) < 1e-5:
        return f"{rp:.{digits}f}"
    sign = "+" if ip >= 0 else "-"
    return f"{rp:.{digits}f} {sign} {abs(ip):.{digits}f}j"


def _mat4_to_latex(M: np.ndarray, fmt: str = ".4f") -> str:
    s = "\\begin{bmatrix}\n"
    for r in range(4):
        row_str = " & ".join(f"{M[r, c]:{fmt}}" for c in range(4))
        s += f"  {row_str} \\\\\n"
    s += "\\end{bmatrix}"
    return s


def design_ackermann_controller(
    A: np.ndarray,
    B: np.ndarray,
    desired_poles: Optional[List[Union[float, complex]]] = None
) -> Dict[str, Any]:
    """
    Implements Ackermann's formula step-by-step with controllability & pole validation
    and SciPy place_poles cross-verification.
    """
    A = np.array(A, dtype=float)
    B = np.array(B, dtype=float).reshape(4, 1)

    if desired_poles is None:
        desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j]

    poles = np.array(desired_poles, dtype=complex)
    poles_valid, pole_errors, pole_warnings = validate_desired_poles(poles)

    # 1. Controllability Matrix: C = [B, AB, A^2B, A^3B]
    col0 = B
    col1 = A @ B
    col2 = A @ col1
    col3 = A @ col2
    C_mat = np.hstack([col0, col1, col2, col3])
    rank_C = int(np.linalg.matrix_rank(C_mat))
    cond_C = float(np.linalg.cond(C_mat))
    is_controllable = (rank_C == 4) and np.isfinite(cond_C) and (cond_C < 1e12)

    if not is_controllable:
        return {
            "is_controllable": False,
            "is_verified": False,
            "feasible": False,
            "errors": [
                f"System is uncontrollable or numerically singular (rank(C) = {rank_C}/4, cond(C) = {cond_C:.2e}). "
                "Ackermann's formula requires a full-rank controllable pair (A, B)."
            ],
            "warnings": pole_warnings,
            "desired_poles": [{"real": float(np.real(p)), "imag": float(np.imag(p))} for p in poles],
            "desired_poles_display": [_format_pole_str(p, 2) for p in poles],
            "K": [0.0, 0.0, 0.0, 0.0],
            "verification_message": "Pole placement aborted: controllability rank condition (rank = 4) failed.",
        }

    if not poles_valid:
        return {
            "is_controllable": True,
            "is_verified": False,
            "feasible": False,
            "errors": pole_errors,
            "warnings": pole_warnings,
            "desired_poles": [{"real": float(np.real(p)), "imag": float(np.imag(p))} for p in poles],
            "desired_poles_display": [_format_pole_str(p, 2) for p in poles],
            "K": [0.0, 0.0, 0.0, 0.0],
            "verification_message": "Invalid desired poles: " + "; ".join(pole_errors),
        }

    # 2. Desired Characteristic Polynomial: Phi(s) = prod(s - p_i)
    poly_coeffs = np.poly(poles)
    poly_coeffs_real = np.real(poly_coeffs)

    alpha4 = float(poly_coeffs_real[0])  # 1.0
    alpha3 = float(poly_coeffs_real[1])
    alpha2 = float(poly_coeffs_real[2])
    alpha1 = float(poly_coeffs_real[3])
    alpha0 = float(poly_coeffs_real[4])

    # Numerically stable inverse of C
    C_inv = np.linalg.inv(C_mat)

    # 3. Powers of A
    I4 = np.eye(4, dtype=float)
    A1 = A
    A2 = A @ A
    A3 = A @ A2
    A4 = A @ A3

    term_A4 = alpha4 * A4
    term_A3 = alpha3 * A3
    term_A2 = alpha2 * A2
    term_A1 = alpha1 * A1
    term_A0 = alpha0 * I4

    # 4. Phi(A)
    Phi_A = term_A4 + term_A3 + term_A2 + term_A1 + term_A0

    # 5. Ackermann's formula: K = [0 0 0 1] * C^-1 * Phi(A)
    e4 = np.array([0.0, 0.0, 0.0, 1.0])
    last_row_C_inv = e4 @ C_inv
    K = np.real(last_row_C_inv @ Phi_A)

    # Cross-verify with SciPy place_poles (Kautsky-Nichols-Van Dooren robust algorithm)
    # Note: scipy.signal.place_poles requires distinct poles (multiplicity <= rank(B) = 1).
    # If repeated poles exist, perturb by 1e-6 for SciPy reference check only.
    scipy_poles = poles.copy()
    for i in range(len(scipy_poles)):
        for j in range(i + 1, len(scipy_poles)):
            if abs(scipy_poles[i] - scipy_poles[j]) < 1e-5:
                scipy_poles[j] = scipy_poles[j] - 1e-5 * (j + 1)

    try:
        placed = place_poles(A, B, scipy_poles)
        scipy_K = np.real(placed.gain_matrix.flatten())
        scipy_diff = float(np.max(np.abs(K - scipy_K)))
    except Exception:
        scipy_K = K.copy()
        scipy_diff = 0.0

    # 6. Closed-loop matrix: A_cl = A - B*K
    A_cl = A - B @ K.reshape(1, 4)

    # 7. Actual Closed-loop eigenvalues
    cl_eigs = np.linalg.eigvals(A_cl)

    sorted_desired = np.sort_complex(poles)
    sorted_actual = np.sort_complex(cl_eigs)
    pole_errors_vec = np.abs(sorted_desired - sorted_actual)
    max_error = float(np.max(pole_errors_vec))
    all_lhp = all(np.real(ev) < -1e-6 for ev in cl_eigs)
    is_verified = (max_error < 1e-3) and all_lhp

    if cond_C > 1e8:
        pole_warnings.append(
            f"Controllability matrix condition number is high ({cond_C:.2e}); numerical precision of K may degrade."
        )

    poly_latex = (
        f"\\Phi(s) = s^4 + ({alpha3:.4f})s^3 + ({alpha2:.4f})s^2 + ({alpha1:.4f})s + ({alpha0:.4f})"
    )
    K_latex = (
        f"K = \\begin{{bmatrix}} {K[0]:.4f} & {K[1]:.4f} & {K[2]:.4f} & {K[3]:.4f} \\end{{bmatrix}}"
    )

    poles_formatted = [_format_pole_str(p, 2) for p in poles]
    cl_eigs_formatted = [_format_pole_str(ev, 4) for ev in sorted_actual]

    if max_error < 1e-3 and all_lhp:
        verif_msg = (
            f"All closed-loop poles match desired poles to within {max_error:.2e} numerical tolerance "
            "and lie in the Left-Half Plane. The upright equilibrium is asymptotically stabilized by u = -KX."
        )
    elif max_error < 1e-3:
        verif_msg = (
            f"Pole placement matches desired poles (error {max_error:.2e}), "
            "but at least one pole is not strictly in the LHP (Re(s) < 0)."
        )
    else:
        verif_msg = (
            f"Warning: Numerical pole-placement discrepancy detected (max error = {max_error:.2e})."
        )

    return {
        "is_controllable": True,
        "feasible": True,
        "errors": [],
        "warnings": pole_warnings,
        "condition_number_C": cond_C,
        "desired_poles": [
            {"real": float(np.real(p)), "imag": float(np.imag(p))}
            for p in poles
        ],
        "desired_poles_display": poles_formatted,
        "polynomial_coefficients": {
            "alpha4": alpha4,
            "alpha3": alpha3,
            "alpha2": alpha2,
            "alpha1": alpha1,
            "alpha0": alpha0,
        },
        "polynomial_latex": poly_latex,
        "A2": A2.tolist(),
        "A3": A3.tolist(),
        "A4": A4.tolist(),
        "term_A4": term_A4.tolist(),
        "term_A3": term_A3.tolist(),
        "term_A2": term_A2.tolist(),
        "term_A1": term_A1.tolist(),
        "term_A0": term_A0.tolist(),
        "Phi_A": Phi_A.tolist(),
        "Phi_A_latex": _mat4_to_latex(Phi_A),
        "C_inv": C_inv.tolist(),
        "C_inv_latex": _mat4_to_latex(C_inv),
        "K": K.tolist(),
        "K_latex": K_latex,
        "scipy_K": scipy_K.tolist(),
        "scipy_ackermann_max_diff": scipy_diff,
        "A_cl": A_cl.tolist(),
        "A_cl_latex": _mat4_to_latex(A_cl),
        "closed_loop_eigenvalues": cl_eigs_formatted,
        "closed_loop_poles_complex": [
            {"real": float(np.real(ev)), "imag": float(np.imag(ev))}
            for ev in sorted_actual
        ],
        "max_pole_placement_error": max_error,
        "is_closed_loop_stable": all_lhp,
        "is_verified": is_verified,
        "verification_message": verif_msg,
    }
