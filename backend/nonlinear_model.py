"""
Nonlinear Mathematical Modeling of the Cart-Mounted Inverted Pendulum.
Includes:
- Analytical Lagrangian derivation (SymPy)
- Parameter substitution with intermediate symbolic/numerical steps
- Acceleration solver: x_ddot = f1(x, x_dot, theta, theta_dot, u), theta_ddot = f2(x, x_dot, theta, theta_dot, u)
- Numerical ODE RHS for simulation
"""

import numpy as np
import sympy as sp
from typing import Dict, Any, Tuple
from parameters import SystemParameters


def derive_lagrangian_equations():
    """
    Performs the exact symbolic derivation of the equations of motion
    using Lagrangian mechanics in SymPy.
    Returns LaTeX strings and symbolic representations.
    """
    # Time variable
    t = sp.Symbol('t')

    # Generalized coordinates and parameters
    M_s, m_s, l_s, I_s, b_s, g_s, u_s = sp.symbols('M m l I b g u', real=True, positive=True)
    
    # State functions of time
    x = sp.Function('x')(t)
    theta = sp.Function('theta')(t)
    
    x_dot = sp.diff(x, t)
    theta_dot = sp.diff(theta, t)
    x_ddot = sp.diff(x_dot, t)
    theta_ddot = sp.diff(theta_dot, t)
    
    # Center of mass coordinates of the pendulum (theta=0 is upright)
    x_p = x + l_s * sp.sin(theta)
    y_p = l_s * sp.cos(theta)
    
    x_p_dot = sp.diff(x_p, t)
    y_p_dot = sp.diff(y_p, t)
    
    # Kinetic energy
    T_cart = sp.Rational(1, 2) * M_s * x_dot**2
    T_pend = sp.Rational(1, 2) * m_s * (x_p_dot**2 + y_p_dot**2) + sp.Rational(1, 2) * I_s * theta_dot**2
    T = sp.simplify(T_cart + T_pend)
    
    # Potential energy (datum at pivot y = 0)
    V = m_s * g_s * y_p
    
    # Lagrangian
    L = sp.simplify(T - V)
    
    # Euler-Lagrange equations:
    # d/dt(dL/d(q_dot)) - dL/dq = Q
    # For x: Q_x = u - b * x_dot
    dL_dx_dot = sp.diff(L, x_dot)
    dt_dL_dx_dot = sp.diff(dL_dx_dot, t)
    dL_dx = sp.diff(L, x)
    eq_x = sp.simplify(dt_dL_dx_dot - dL_dx - (u_s - b_s * x_dot))
    
    # For theta: Q_theta = 0
    dL_dtheta_dot = sp.diff(L, theta_dot)
    dt_dL_dtheta_dot = sp.diff(dL_dtheta_dot, t)
    dL_dtheta = sp.diff(L, theta)
    eq_theta = sp.simplify(dt_dL_dtheta_dot - dL_dtheta)
    
    # Couple in matrix form: M_mat * [x_ddot, theta_ddot]^T = RHS
    # (M + m) * x_ddot + m*l*cos(theta)*theta_ddot = u - b*x_dot + m*l*theta_dot^2*sin(theta)
    # m*l*cos(theta)*x_ddot + (I + m*l^2)*theta_ddot = m*g*l*sin(theta)
    
    sol = sp.solve([eq_x, eq_theta], (x_ddot, theta_ddot))
    x_ddot_solved = sp.simplify(sol[x_ddot])
    theta_ddot_solved = sp.simplify(sol[theta_ddot])
    
    return {
        "generalized_coords": "[x, \\theta]^T",
        "cart_pos": "(x, 0)",
        "pend_com_pos": "(x + l\\sin\\theta, \\; l\\cos\\theta)",
        "x_p_dot": "\\dot{x} + l\\dot{\\theta}\\cos\\theta",
        "y_p_dot": "-l\\dot{\\theta}\\sin\\theta",
        "T_cart": "\\frac{1}{2} M \\dot{x}^2",
        "T_pend": "\\frac{1}{2} m (\\dot{x}_p^2 + \\dot{y}_p^2) + \\frac{1}{2} I \\dot{\\theta}^2",
        "T_total": "\\frac{1}{2}(M + m)\\dot{x}^2 + m l \\dot{x}\\dot{\\theta}\\cos\\theta + \\frac{1}{2}(I + m l^2)\\dot{\\theta}^2",
        "V": "m g l \\cos\\theta",
        "L": "\\frac{1}{2}(M + m)\\dot{x}^2 + m l \\dot{x}\\dot{\\theta}\\cos\\theta + \\frac{1}{2}(I + m l^2)\\dot{\\theta}^2 - m g l \\cos\\theta",
        "eq1_raw": "(M + m)\\ddot{x} + m l \\cos\\theta \\, \\ddot{\\theta} = u - b\\dot{x} + m l \\dot{\\theta}^2 \\sin\\theta",
        "eq2_raw": "m l \\cos\\theta \\, \\ddot{x} + (I + m l^2) \\ddot{\\theta} = m g l \\sin\\theta",
        "det_D": "D(\\theta) = (M + m)(I + m l^2) - (m l \\cos\\theta)^2",
        "x_ddot_solved_latex": sp.latex(x_ddot_solved),
        "theta_ddot_solved_latex": sp.latex(theta_ddot_solved)
    }


def get_nonlinear_substitution_details(params: SystemParameters) -> Dict[str, Any]:
    """
    Substitutes current parameters into the nonlinear equations and
    generates step-by-step intermediate and solved equations.
    """
    M, m, l, I, b, g = params.M, params.m, params.l, params.I, params.b, params.g
    
    M_plus_m = M + m
    ml = m * l
    I_plus_ml2 = I + m * (l**2)
    mgl = m * g * l
    
    # Determinant expression: D(theta) = (M+m)(I+ml^2) - (ml*cos(theta))^2
    det_const = M_plus_m * I_plus_ml2
    ml_sq = ml**2
    
    # Coupled equations with parameter values substituted
    eq1_sub = f"{M_plus_m:.2f}\\ddot{{x}} + {ml:.2f}\\cos\\theta \\, \\ddot{{\\theta}} = u - {b:.2f}\\dot{{x}} + {ml:.2f}\\dot{{\\theta}}^2\\sin\\theta"
    eq2_sub = f"{ml:.2f}\\cos\\theta \\, \\ddot{{x}} + {I_plus_ml2:.4f}\\ddot{{\\theta}} = {mgl:.4f}\\sin\\theta"
    
    det_sub = f"D(\\theta) = ({M_plus_m:.2f})({I_plus_ml2:.4f}) - ({ml:.2f}\\cos\\theta)^2 = {det_const:.6f} - {ml_sq:.6f}\\cos^2\\theta"
    
    # Solved accelerations symbolically with substituted coefficients:
    num_x = f"{I_plus_ml2:.4f}\\left(u - {b:.2f}\\dot{{x}} + {ml:.2f}\\dot{{\\theta}}^2\\sin\\theta\\right) - {ml:.2f}\\cos\\theta ({mgl:.4f}\\sin\\theta)"
    num_th = f"{M_plus_m:.2f}({mgl:.4f}\\sin\\theta) - {ml:.2f}\\cos\\theta \\left(u - {b:.2f}\\dot{{x}} + {ml:.2f}\\dot{{\\theta}}^2\\sin\\theta\\right)"
    den_str = f"{det_const:.6f} - {ml_sq:.6f}\\cos^2\\theta"
    
    x_ddot_formula = f"\\ddot{{x}} = \\frac{{{num_x}}}{{{den_str}}}"
    theta_ddot_formula = f"\\ddot{{\\theta}} = \\frac{{{num_th}}}{{{den_str}}}"
    
    return {
        "parameters": {
            "M": M, "m": m, "l": l, "I": I, "b": b, "g": g,
            "M_plus_m": M_plus_m,
            "ml": ml,
            "I_plus_ml2": I_plus_ml2,
            "mgl": mgl,
            "det_const": det_const,
            "ml_sq": ml_sq
        },
        "eq1_substituted": eq1_sub,
        "eq2_substituted": eq2_sub,
        "determinant_substituted": det_sub,
        "x_ddot_formula": x_ddot_formula,
        "theta_ddot_formula": theta_ddot_formula
    }


def calculate_nonlinear_accelerations(
    params: SystemParameters,
    x: float,
    x_dot: float,
    theta: float,
    theta_dot: float,
    u: float
) -> Tuple[float, float, float]:
    """
    Evaluates x_ddot and theta_ddot for any state [x, x_dot, theta, theta_dot]
    and applied control force u.
    Returns (x_ddot, theta_ddot, D_val).
    """
    M, m, l, I, b, g = params.M, params.m, params.l, params.I, params.b, params.g
    
    sin_th = np.sin(theta)
    cos_th = np.cos(theta)
    
    D_val = (M + m) * (I + m * (l**2)) - (m * l * cos_th)**2
    
    term1 = u - b * x_dot + m * l * (theta_dot**2) * sin_th
    term2 = m * g * l * sin_th
    
    x_ddot = ((I + m * (l**2)) * term1 - m * l * cos_th * term2) / D_val
    theta_ddot = ((M + m) * term2 - m * l * cos_th * term1) / D_val
    
    return float(x_ddot), float(theta_ddot), float(D_val)


def nonlinear_dynamics_rhs(
    t: float,
    state: np.ndarray,
    params: SystemParameters,
    K: np.ndarray = None,
    disturbance_val: float = 0.0
) -> np.ndarray:
    """
    RHS derivative function for numerical ODE integration:
    d/dt [x, x_dot, theta, theta_dot]^T
    Control law: u = -K * state (if K is provided).
    Total force = u + disturbance_val.
    """
    x, x_dot, theta, theta_dot = state
    
    if K is not None:
        u_control = -float(np.dot(K, state))
    else:
        u_control = 0.0
        
    u_total = u_control + disturbance_val
    
    x_ddot, theta_ddot, _ = calculate_nonlinear_accelerations(
        params, x, x_dot, theta, theta_dot, u_total
    )
    
    return np.array([x_dot, x_ddot, theta_dot, theta_ddot])


def get_nonlinear_term_breakdown(
    params: SystemParameters,
    x: float,
    x_dot: float,
    theta: float,
    theta_dot: float,
    u: float
) -> Dict[str, Any]:
    """
    Breaks down the individual physical terms in the nonlinear equations
    at a given state [x, x_dot, theta, theta_dot] and force u.
    """
    M, m, l, I, b, g = params.M, params.m, params.l, params.I, params.b, params.g
    sin_th = float(np.sin(theta))
    cos_th = float(np.cos(theta))
    x_ddot, theta_ddot, D_val = calculate_nonlinear_accelerations(
        params, x, x_dot, theta, theta_dot, u
    )

    friction_force = float(b * x_dot)
    centrifugal_force = float(m * l * (theta_dot ** 2) * sin_th)
    coupling_cart_from_pend = float(m * l * theta_ddot * cos_th)
    gravity_torque = float(m * g * l * sin_th)
    coupling_pend_from_cart = float(m * l * x_ddot * cos_th)
    effective_inertia = float(I + m * (l ** 2))

    return {
        "x_ddot": x_ddot,
        "theta_ddot": theta_ddot,
        "theta_ddot_deg": float(np.degrees(theta_ddot)),
        "determinant_D": D_val,
        "sin_theta": sin_th,
        "cos_theta": cos_th,
        "friction_force_N": friction_force,
        "centrifugal_force_N": centrifugal_force,
        "coupling_cart_from_pend_N": coupling_cart_from_pend,
        "gravity_torque_Nm": gravity_torque,
        "coupling_pend_from_cart_Nm": coupling_pend_from_cart,
        "effective_inertia_kgm2": effective_inertia,
    }
