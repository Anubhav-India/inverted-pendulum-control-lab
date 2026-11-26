"""
Stability Analysis Module for the Inverted Pendulum State-Space System.
Computes open-loop and closed-loop eigenvalues, classifies stability regions
(LHP, RHP, Marginal jw-axis), damping ratios, natural frequencies, and time constants.
"""

import numpy as np
from typing import Dict, Any, List


def _classify_eigenvalue(ev: complex, tol: float = 1e-6) -> str:
    re = float(np.real(ev))
    if re > tol:
        return "unstable_rhp"
    if re < -tol:
        return "stable_lhp"
    return "marginal_jw"


def _format_complex(ev: complex) -> str:
    re = float(np.real(ev))
    im = float(np.imag(ev))
    if abs(im) < 1e-5:
        return f"{re:+.4f}"
    sign = "+" if im >= 0 else "-"
    return f"{re:+.4f} {sign} {abs(im):.4f}j"


def analyze_matrix_stability(M_mat: np.ndarray, label: str = "Open-Loop") -> Dict[str, Any]:
    """
    Computes eigenvalues of a 4x4 state matrix (A or A_cl) and provides
    detailed pole classification and physical stability interpretation.
    """
    M_mat = np.array(M_mat, dtype=float)
    eigenvalues, _ = np.linalg.eig(M_mat)

    idx_sorted = np.argsort(np.real(eigenvalues))
    sorted_eigs = eigenvalues[idx_sorted]

    poles_detail: List[Dict[str, Any]] = []
    n_rhp = 0
    n_lhp = 0
    n_marginal = 0

    for idx, ev in enumerate(sorted_eigs):
        re = float(np.real(ev))
        im = float(np.imag(ev))
        region = _classify_eigenvalue(ev)
        if region == "unstable_rhp":
            n_rhp += 1
        elif region == "stable_lhp":
            n_lhp += 1
        else:
            n_marginal += 1

        wn = float(np.hypot(re, im))
        zeta = float(-re / wn) if wn > 1e-9 else 0.0
        tau = float(-1.0 / re) if re < -1e-6 else None

        poles_detail.append({
            "index": idx + 1,
            "real": re,
            "imag": im,
            "formatted": _format_complex(ev),
            "region": region,
            "natural_frequency_rad_s": wn,
            "damping_ratio": zeta,
            "time_constant_s": tau,
        })

    if n_rhp > 0:
        classification = "Unstable"
        is_stable = False
        summary = (
            f"{label} system is UNSTABLE: {n_rhp} eigenvalue(s) lie in the open Right-Half Plane (Re(s) > 0). "
            "Any tiny angular perturbation grows exponentially like e^(λt) without active control."
        )
    elif n_marginal > 0:
        classification = "Marginally Stable"
        is_stable = False
        summary = (
            f"{label} system is MARGINALLY STABLE: {n_marginal} eigenvalue(s) lie on the imaginary axis (Re(s) = 0) "
            "and none in the RHP."
        )
    else:
        classification = "Asymptotically Stable"
        is_stable = True
        summary = (
            f"{label} system is ASYMPTOTICALLY STABLE: all {len(poles_detail)} eigenvalues lie strictly in the "
            "Left-Half Plane (Re(s) < 0), ensuring trajectories decay back to equilibrium."
        )

    return {
        "label": label,
        "eigenvalues": poles_detail,
        "classification": classification,
        "is_stable": is_stable,
        "counts": {
            "lhp_stable": n_lhp,
            "rhp_unstable": n_rhp,
            "jw_marginal": n_marginal,
        },
        "summary": summary,
    }
