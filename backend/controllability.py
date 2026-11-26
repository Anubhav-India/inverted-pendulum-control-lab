"""
Controllability Analysis of the Linearized Cart-Inverted Pendulum System.
Calculates:
- Step-by-step vector products: B, A*B, A^2*B, A^3*B
- Full Controllability Matrix: C = [B, AB, A^2B, A^3B]
- Determinant, Rank, Singular Values, and Condition Number of C
- Physical explanation of controllability and actuator coupling
"""

import numpy as np
from typing import Dict, Any


def analyze_controllability(A: np.ndarray, B: np.ndarray) -> Dict[str, Any]:
    """
    Performs full controllability matrix computation, rank analysis, and conditioning check.
    """
    A = np.array(A, dtype=float)
    B = np.array(B, dtype=float).reshape(4, 1)

    col0 = B
    col1 = A @ B
    col2 = A @ col1
    col3 = A @ col2

    C_mat = np.hstack([col0, col1, col2, col3])

    det_C = float(np.linalg.det(C_mat))
    rank_C = int(np.linalg.matrix_rank(C_mat))
    singular_values = [float(s) for s in np.linalg.svd(C_mat, compute_uv=False)]
    cond_number = float(np.linalg.cond(C_mat)) if singular_values[-1] > 1e-15 else float("inf")
    is_controllable = (rank_C == 4)
    is_well_conditioned = is_controllable and cond_number < 1e10

    def vec_to_latex(v: np.ndarray) -> str:
        return (
            "\\begin{bmatrix} "
            f"{v[0,0]:.4f} \\\\ {v[1,0]:.4f} \\\\ {v[2,0]:.4f} \\\\ {v[3,0]:.4f} "
            "\\end{bmatrix}"
        )

    C_mat_latex = "\\begin{bmatrix}\n"
    for r in range(4):
        row_str = " & ".join(f"{C_mat[r, c]:.4f}" for c in range(4))
        C_mat_latex += f"  {row_str} \\\\\n"
    C_mat_latex += "\\end{bmatrix}"

    if is_controllable:
        conclusion = (
            f"The controllability matrix C has rank {rank_C} out of 4 (determinant = {det_C:.4e} ≠ 0). "
            "Because rank(C) equals the system order (n = 4), the Kalman controllability rank condition "
            "is satisfied. Arbitrary pole placement via u = -KX is mathematically feasible."
        )
    else:
        conclusion = (
            f"WARNING: Controllability matrix rank is {rank_C} < 4 (det = {det_C:.4e}). "
            "The system is NOT completely state-controllable. Pole placement via Ackermann's formula cannot assign all 4 poles."
        )

    return {
        "col_B": col0.tolist(),
        "col_AB": col1.tolist(),
        "col_A2B": col2.tolist(),
        "col_A3B": col3.tolist(),
        "col_B_latex": vec_to_latex(col0),
        "col_AB_latex": vec_to_latex(col1),
        "col_A2B_latex": vec_to_latex(col2),
        "col_A3B_latex": vec_to_latex(col3),
        "C_matrix": C_mat.tolist(),
        "C_matrix_latex": C_mat_latex,
        "determinant": det_C,
        "rank": rank_C,
        "n_states": 4,
        "singular_values": singular_values,
        "condition_number": cond_number if np.isfinite(cond_number) else None,
        "is_controllable": is_controllable,
        "is_well_conditioned": is_well_conditioned,
        "mathematical_conclusion": conclusion,
        "physical_interpretation": (
            "Physically, although the horizontal actuator force u acts directly only on the cart, "
            "the dynamic inertial coupling through the pivot connects cart acceleration to pendulum angular acceleration. "
            "Because the columns of C span the entire 4D state space, the control input u can steer all four state variables "
            "(cart position, cart velocity, pendulum angle, and angular velocity) from any arbitrary initial condition to the origin."
        )
    }
