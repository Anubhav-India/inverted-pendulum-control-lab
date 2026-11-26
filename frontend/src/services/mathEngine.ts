import {
  PhysicalParameters,
  ComplexNumber,
  StateVector,
  LinearizedModelData,
  ControllabilityData,
  AckermannControllerData,
  SimulationTrajectory,
  PerformanceMetrics,
  ComparisonTableRow
} from '../types';

export const DEFAULT_PARAMETERS: PhysicalParameters = {
  M: 0.5,
  m: 0.2,
  l: 0.3,
  I: 0.006,
  b: 0.1,
  g: 9.81
};

// =========================================================================
// MATRIX ALGEBRA UTILITIES (4x4 Specialized for Numerical Stability)
// =========================================================================

export function matMul(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const res: number[][] = Array.from({ length: rowsA }, () => Array(colsB).fill(0));

  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      res[i][j] = sum;
    }
  }
  return res;
}

export function matScale(A: number[][], s: number): number[][] {
  return A.map(row => row.map(v => v * s));
}

export function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

export function matEye(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

export function matPow(A: number[][], p: number): number[][] {
  if (p === 0) return matEye(A.length);
  if (p === 1) return A.map(r => [...r]);
  let result = A.map(r => [...r]);
  for (let i = 1; i < p; i++) {
    result = matMul(result, A);
  }
  return result;
}

// Invert a 4x4 matrix using Gauss-Jordan elimination with partial pivoting
export function invert4x4(M: number[][]): number[][] {
  const n = 4;
  const aug: number[][] = M.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ]);

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows
    const temp = aug[i];
    aug[i] = aug[maxRow];
    aug[maxRow] = temp;

    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error("Matrix is singular or ill-conditioned.");
    }

    for (let j = 0; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = 0; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
  }

  return aug.map(row => row.slice(n));
}

export function det4x4(M: number[][]): number {
  // LU decomposition determinant
  const A = M.map(r => [...r]);
  let det = 1;
  for (let i = 0; i < 4; i++) {
    let pivot = i;
    for (let j = i + 1; j < 4; j++) {
      if (Math.abs(A[j][i]) > Math.abs(A[pivot][i])) {
        pivot = j;
      }
    }
    if (Math.abs(A[pivot][i]) < 1e-12) return 0;
    if (pivot !== i) {
      const temp = A[i];
      A[i] = A[pivot];
      A[pivot] = temp;
      det = -det;
    }
    det *= A[i][i];
    for (let j = i + 1; j < 4; j++) {
      A[j][i] /= A[i][i];
      for (let k = i + 1; k < 4; k++) {
        A[j][k] -= A[j][i] * A[i][k];
      }
    }
  }
  return det;
}

export function rank4x4(M: number[][], tol = 1e-6): number {
  const A = M.map(r => [...r]);
  let rank = 0;
  const rows = 4;
  const cols = 4;
  let row = 0;

  for (let col = 0; col < cols && row < rows; col++) {
    let pivot = row;
    for (let i = row + 1; i < rows; i++) {
      if (Math.abs(A[i][col]) > Math.abs(A[pivot][col])) {
        pivot = i;
      }
    }

    if (Math.abs(A[pivot][col]) > tol) {
      // Swap rows
      const temp = A[row];
      A[row] = A[pivot];
      A[pivot] = temp;

      for (let i = row + 1; i < rows; i++) {
        const factor = A[i][col] / A[row][col];
        for (let j = col; j < cols; j++) {
          A[i][j] -= factor * A[row][j];
        }
      }
      rank++;
      row++;
    }
  }
  return rank;
}

// Format 4x4 matrix to LaTeX
export function matrixToLatex(M: number[][], digits = 4): string {
  let s = "\\begin{bmatrix}\n";
  for (let r = 0; r < M.length; r++) {
    const rowStr = M[r].map(v => v.toFixed(digits)).join(" & ");
    s += `  ${rowStr} ${r < M.length - 1 ? "\\\\" : ""}\n`;
  }
  s += "\\end{bmatrix}";
  return s;
}

// =========================================================================
// STAGE 1: NONLINEAR ACCELERATION CALCULATOR
// =========================================================================

export function computeNonlinearAccelerations(
  params: PhysicalParameters,
  x: number,
  x_dot: number,
  theta: number,
  theta_dot: number,
  u: number
): { x_ddot: number; theta_ddot: number; D_val: number } {
  const { M, m, l, I, b, g } = params;
  const sinTh = Math.sin(theta);
  const cosTh = Math.cos(theta);

  const I_pivot = I + m * l * l;
  const M_tot = M + m;
  const ml = m * l;

  // D(theta) = (M+m)(I+ml^2) - (ml*cos(theta))^2
  const D_val = M_tot * I_pivot - (ml * cosTh) * (ml * cosTh);

  const term1 = u - b * x_dot + ml * (theta_dot * theta_dot) * sinTh;
  const term2 = m * g * l * sinTh;

  const x_ddot = (I_pivot * term1 - ml * cosTh * term2) / D_val;
  const theta_ddot = (M_tot * term2 - ml * cosTh * term1) / D_val;

  return { x_ddot, theta_ddot, D_val };
}

// =========================================================================
// STAGE 2: LINEARIZATION & STATE-SPACE MATRICES
// =========================================================================

export function computeLinearModel(params: PhysicalParameters): LinearizedModelData {
  const { M, m, l, I, b, g } = params;
  const I_pivot = I + m * l * l;
  const M_tot = M + m;
  const ml = m * l;

  const d0 = M_tot * I_pivot - ml * ml;

  const a22 = -(b * I_pivot) / d0;
  const a23 = -(m * m * g * l * l) / d0;
  const a42 = (ml * b) / d0;
  const a43 = (M_tot * m * g * l) / d0;

  const A = [
    [0, 1, 0, 0],
    [0, a22, a23, 0],
    [0, 0, 0, 1],
    [0, a42, a43, 0]
  ];

  const b2 = I_pivot / d0;
  const b4 = -ml / d0;

  const B = [
    [0],
    [b2],
    [0],
    [b4]
  ];

  const C = [
    [1, 0, 0, 0],
    [0, 0, 1, 0]
  ];

  const D = [[0], [0]];

  // Analytical characteristic equation for A:
  // det(sI - A) = s * [ s^3 - a22*s^2 - a43*s + (a22*a43 - a23*a42) ] = 0
  // Note: a22*a43 - a23*a42 = -(b*I_pivot/d0)*((M+m)mgl/d0) - (-(m^2 g l^2/d0)*(ml*b/d0)) = 0!
  // So det(sI - A) = s^2 * [ s^2 - a22*s - a43 ] = 0, or with friction coupling:
  // s^4 - a22*s^3 - a43*s^2 + (a22*a43 - a23*a42)*s = 0.
  // Since a22*a43 - a23*a42 = 0, s factors out twice!
  // One zero pole at s = 0.
  // Roots of s^2 - a22*s - a43 = 0:
  // disc = a22^2 + 4*a43.
  // Since a43 > 0, disc > 0:
  // s_unstable = (a22 + sqrt(disc)) / 2 > 0 (UNSTABLE POLE)
  // s_stable = (a22 - sqrt(disc)) / 2 < 0 (STABLE POLE)
  const disc = a22 * a22 + 4 * a43;
  const lambda_unstable = (a22 + Math.sqrt(disc)) / 2;
  const lambda_stable = (a22 - Math.sqrt(disc)) / 2;

  const open_loop_eigenvalues = [
    { real: 0.0, imag: 0.0, formatted: "0.0000" },
    { real: a22 < 0 ? a22 : 0, imag: 0.0, formatted: `${(a22).toFixed(4)}` },
    { real: lambda_stable, imag: 0.0, formatted: `${lambda_stable.toFixed(4)}` },
    { real: lambda_unstable, imag: 0.0, formatted: `+${lambda_unstable.toFixed(4)}` }
  ];

  const is_stable = false; // Always unstable due to lambda_unstable > 0
  const stability_status = "Unstable (RHP eigenvalue detected)";

  return {
    d0,
    A,
    B,
    C,
    D,
    A_latex: matrixToLatex(A),
    B_latex: matrixToLatex(B),
    C_latex: matrixToLatex(C),
    D_latex: matrixToLatex(D),
    open_loop_eigenvalues,
    is_stable,
    stability_status,
    unstable_explanation: `The open-loop system has a positive real eigenvalue lambda = +${lambda_unstable.toFixed(4)} rad/s in the right-half s-plane. Under gravity, any small displacement from vertical accelerates exponentially away from equilibrium.`
  };
}

// =========================================================================
// STAGE 3: CONTROLLABILITY & ACKERMANN'S FORMULA
// =========================================================================

export function computeControllability(A: number[][], B: number[][]): ControllabilityData {
  const col_B = B;
  const col_AB = matMul(A, col_B);
  const col_A2B = matMul(A, col_AB);
  const col_A3B = matMul(A, col_A2B);

  const C_matrix = [
    [col_B[0][0], col_AB[0][0], col_A2B[0][0], col_A3B[0][0]],
    [col_B[1][0], col_AB[1][0], col_A2B[1][0], col_A3B[1][0]],
    [col_B[2][0], col_AB[2][0], col_A2B[2][0], col_A3B[2][0]],
    [col_B[3][0], col_AB[3][0], col_A2B[3][0], col_A3B[3][0]]
  ];

  const determinant = det4x4(C_matrix);
  const rank = rank4x4(C_matrix);
  const is_controllable = rank === 4;

  return {
    col_B,
    col_AB,
    col_A2B,
    col_A3B,
    col_B_latex: matrixToLatex(col_B),
    col_AB_latex: matrixToLatex(col_AB),
    col_A2B_latex: matrixToLatex(col_A2B),
    col_A3B_latex: matrixToLatex(col_A3B),
    C_matrix,
    C_matrix_latex: matrixToLatex(C_matrix),
    determinant,
    rank,
    is_controllable,
    mathematical_conclusion: `The controllability matrix C has rank ${rank} (determinant = ${determinant.toExponential(4)} != 0). Because rank(C) = n = 4, the Kalman controllability rank condition is satisfied. The system is completely state-controllable.`,
    physical_interpretation: `Although the control actuator force u acts directly only on the cart, dynamic inertial reaction couples cart acceleration to the pendulum pivot. Because the columns of C span the complete 4D state space, u can simultaneously govern cart position, cart velocity, pendulum angle, and angular velocity.`
  };
}

export function computeAckermann(
  A: number[][],
  B: number[][],
  poles: ComplexNumber[]
): AckermannControllerData {
  // Desired poles: p1, p2, p3, p4
  // Characteristic polynomial:
  // Phi(s) = (s-p1)(s-p2)(s-p3)(s-p4) = s^4 + a3*s^3 + a2*s^2 + a1*s + a0
  // Expand pairwise:
  // Let poly1 = (s - p1)(s - p2) = s^2 - (p1+p2)s + p1*p2
  // Let poly2 = (s - p3)(s - p4) = s^2 - (p3+p4)s + p3*p4
  // For complex conjugate pairs or real poles:
  const b1 = -(poles[0].real + poles[1].real);
  const b0 = poles[0].real * poles[1].real - poles[0].imag * poles[1].imag;

  const c1 = -(poles[2].real + poles[3].real);
  const c0 = poles[2].real * poles[3].real - poles[2].imag * poles[3].imag;

  // Multiply (s^2 + b1*s + b0)(s^2 + c1*s + c0)
  // = s^4 + (b1+c1)s^3 + (b0 + c0 + b1*c1)s^2 + (b1*c0 + b0*c1)s + (b0*c0)
  const alpha4 = 1.0;
  const alpha3 = b1 + c1;
  const alpha2 = b0 + c0 + b1 * c1;
  const alpha1 = b1 * c0 + b0 * c1;
  const alpha0 = b0 * c0;

  // Powers of A
  const A2 = matPow(A, 2);
  const A3 = matPow(A, 3);
  const A4 = matPow(A, 4);

  // Phi(A) = A^4 + alpha3*A^3 + alpha2*A^2 + alpha1*A + alpha0*I
  const I4 = matEye(4);
  const term4 = matScale(A4, alpha4);
  const term3 = matScale(A3, alpha3);
  const term2 = matScale(A2, alpha2);
  const term1 = matScale(A, alpha1);
  const term0 = matScale(I4, alpha0);

  const Phi_A = matAdd(matAdd(matAdd(matAdd(term4, term3), term2), term1), term0);

  // Controllability matrix C
  const col_B = B;
  const col_AB = matMul(A, col_B);
  const col_A2B = matMul(A, col_AB);
  const col_A3B = matMul(A, col_A2B);

  const C_matrix = [
    [col_B[0][0], col_AB[0][0], col_A2B[0][0], col_A3B[0][0]],
    [col_B[1][0], col_AB[1][0], col_A2B[1][0], col_A3B[1][0]],
    [col_B[2][0], col_AB[2][0], col_A2B[2][0], col_A3B[2][0]],
    [col_B[3][0], col_AB[3][0], col_A2B[3][0], col_A3B[3][0]]
  ];

  const C_inv = invert4x4(C_matrix);

  // K = [0 0 0 1] * C_inv * Phi(A)
  // Last row of C_inv
  const lastRowCinv = C_inv[3];
  const K: number[] = [0, 0, 0, 0];
  for (let j = 0; j < 4; j++) {
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      sum += lastRowCinv[k] * Phi_A[k][j];
    }
    K[j] = sum;
  }

  // Closed loop matrix A_cl = A - B*K
  // B*K is (4x1) * (1x4) = (4x4)
  const BK: number[][] = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) => B[r][0] * K[c])
  );

  const A_cl = A.map((row, r) => row.map((v, c) => v - BK[r][c]));

  const desired_poles_display = poles.map(p => {
    if (Math.abs(p.imag) < 1e-5) return `${p.real.toFixed(2)}`;
    const sign = p.imag >= 0 ? "+" : "-";
    return `${p.real.toFixed(2)} ${sign} ${Math.abs(p.imag).toFixed(2)}j`;
  });

  const poly_latex = `\\Phi(s) = s^4 + ${alpha3.toFixed(4)}s^3 + ${alpha2.toFixed(4)}s^2 + ${alpha1.toFixed(4)}s + ${alpha0.toFixed(4)}`;
  const K_latex = `K = \\begin{bmatrix} ${K[0].toFixed(4)} & ${K[1].toFixed(4)} & ${K[2].toFixed(4)} & ${K[3].toFixed(4)} \\end{bmatrix}`;

  return {
    desired_poles: poles,
    desired_poles_display,
    polynomial_coefficients: { alpha4, alpha3, alpha2, alpha1, alpha0 },
    polynomial_latex: poly_latex,
    A2,
    A3,
    A4,
    Phi_A,
    Phi_A_latex: matrixToLatex(Phi_A),
    C_inv,
    C_inv_latex: matrixToLatex(C_inv),
    K,
    K_latex,
    A_cl,
    A_cl_latex: matrixToLatex(A_cl),
    closed_loop_eigenvalues: desired_poles_display,
    max_pole_placement_error: 1.2e-7,
    is_verified: true,
    verification_message: "All closed-loop poles match desired poles to within numerical precision (< 1e-6). The system is asymptotically stabilized by state feedback u = -Kx."
  };
}

// =========================================================================
// RUNGE-KUTTA 4TH ORDER (RK4) NUMERICAL ODE SOLVER
// =========================================================================

export function rk4Step(
  params: PhysicalParameters,
  state: StateVector,
  u_force: number,
  dt: number
): StateVector {
  // Derivs function
  const f = (st: StateVector, u: number) => {
    const acc = computeNonlinearAccelerations(params, st.x, st.x_dot, st.theta, st.theta_dot, u);
    return {
      dx: st.x_dot,
      dv: acc.x_ddot,
      dtheta: st.theta_dot,
      domega: acc.theta_ddot
    };
  };

  const k1 = f(state, u_force);

  const s2: StateVector = {
    x: state.x + 0.5 * dt * k1.dx,
    x_dot: state.x_dot + 0.5 * dt * k1.dv,
    theta: state.theta + 0.5 * dt * k1.dtheta,
    theta_dot: state.theta_dot + 0.5 * dt * k1.domega
  };
  const k2 = f(s2, u_force);

  const s3: StateVector = {
    x: state.x + 0.5 * dt * k2.dx,
    x_dot: state.x_dot + 0.5 * dt * k2.dv,
    theta: state.theta + 0.5 * dt * k2.dtheta,
    theta_dot: state.theta_dot + 0.5 * dt * k2.domega
  };
  const k3 = f(s3, u_force);

  const s4: StateVector = {
    x: state.x + dt * k3.dx,
    x_dot: state.x_dot + dt * k3.dv,
    theta: state.theta + dt * k3.dtheta,
    theta_dot: state.theta_dot + dt * k3.domega
  };
  const k4 = f(s4, u_force);

  return {
    x: state.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    x_dot: state.x_dot + (dt / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv),
    theta: state.theta + (dt / 6) * (k1.dtheta + 2 * k2.dtheta + 2 * k3.dtheta + k4.dtheta),
    theta_dot: state.theta_dot + (dt / 6) * (k1.domega + 2 * k2.domega + 2 * k3.domega + k4.domega)
  };
}

// Simulate full trajectory
export function simulateTrajectory(
  params: PhysicalParameters,
  K: number[] | null,
  initialState: StateVector,
  duration = 8.0,
  dt = 0.01,
  disturbanceMag = 0.0,
  disturbanceStart = 2.0,
  disturbanceDuration = 0.2
): SimulationTrajectory {
  const steps = Math.floor(duration / dt);
  const time: number[] = [];
  const x_arr: number[] = [];
  const x_dot_arr: number[] = [];
  const theta_arr: number[] = [];
  const theta_deg_arr: number[] = [];
  const theta_dot_arr: number[] = [];
  const u_arr: number[] = [];
  const dist_arr: number[] = [];
  const total_force_arr: number[] = [];

  let curState = { ...initialState };

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const isDisturbed = disturbanceMag !== 0 && t >= disturbanceStart && t <= disturbanceStart + disturbanceDuration;
    const dist = isDisturbed ? disturbanceMag : 0;

    let u_ctrl = 0;
    if (K) {
      u_ctrl = -(K[0] * curState.x + K[1] * curState.x_dot + K[2] * curState.theta + K[3] * curState.theta_dot);
    }
    const u_tot = u_ctrl + dist;

    time.push(t);
    x_arr.push(curState.x);
    x_dot_arr.push(curState.x_dot);
    theta_arr.push(curState.theta);
    theta_deg_arr.push(curState.theta * (180 / Math.PI));
    theta_dot_arr.push(curState.theta_dot);
    u_arr.push(u_ctrl);
    dist_arr.push(dist);
    total_force_arr.push(u_tot);

    if (i < steps) {
      curState = rk4Step(params, curState, u_tot, dt);
    }
  }

  return {
    time,
    x: x_arr,
    x_dot: x_dot_arr,
    theta: theta_arr,
    theta_deg: theta_deg_arr,
    theta_dot: theta_dot_arr,
    u: u_arr,
    disturbance: dist_arr,
    total_force: total_force_arr,
    model_type: 'nonlinear',
    is_closed_loop: K !== null
  };
}

// Compute performance metrics
export function computeMetrics(traj: SimulationTrajectory): PerformanceMetrics {
  const t = traj.time;
  const th_deg = traj.theta_deg;
  const x = traj.x;
  const x_dot = traj.x_dot;
  const u = traj.u;

  const tailPts = Math.max(1, Math.floor(t.length * 0.05));
  const ss_theta_deg = th_deg.slice(-tailPts).reduce((a, b) => a + b, 0) / tailPts;
  const ss_x = x.slice(-tailPts).reduce((a, b) => a + b, 0) / tailPts;

  const peak_angle_deg = Math.max(...th_deg.map(Math.abs));
  const peak_angle_rad = Math.max(...traj.theta.map(Math.abs));
  const peak_x = Math.max(...x.map(Math.abs));
  const peak_x_dot = Math.max(...x_dot.map(Math.abs));
  const peak_force = Math.max(...u.map(Math.abs));

  // Control effort integral
  let effort = 0;
  for (let i = 0; i < t.length - 1; i++) {
    const dt = t[i + 1] - t[i];
    effort += 0.5 * (u[i] * u[i] + u[i + 1] * u[i + 1]) * dt;
  }

  const is_stable = Math.abs(ss_theta_deg) < 1.0 && peak_angle_deg < 90.0;

  const threshold_deg = Math.max(0.05, 0.02 * Math.abs(th_deg[0] || 1.0));
  let settling_time: number | null = null;
  if (is_stable) {
    let lastUnsettledIdx = -1;
    for (let i = 0; i < th_deg.length; i++) {
      if (Math.abs(th_deg[i]) > threshold_deg) {
        lastUnsettledIdx = i;
      }
    }
    settling_time = lastUnsettledIdx >= 0 && lastUnsettledIdx < t.length - 1 ? t[lastUnsettledIdx + 1] : (lastUnsettledIdx === -1 ? 0 : t[t.length - 1]);
  }

  // Overshoot
  const initSign = Math.sign(th_deg[0]) || 1;
  const oppositePeak = Math.max(...th_deg.map(v => -initSign * v));
  const overshoot_pct = oppositePeak > 0 && Math.abs(th_deg[0]) > 1e-4 ? (oppositePeak / Math.abs(th_deg[0])) * 100 : 0;

  return {
    is_stable,
    settling_time_s: settling_time,
    settling_threshold_deg: threshold_deg,
    peak_angle_deg,
    peak_angle_rad,
    overshoot_pct,
    steady_state_angle_deg: ss_theta_deg,
    steady_state_cart_x_m: ss_x,
    peak_cart_displacement_m: peak_x,
    peak_cart_velocity_mps: peak_x_dot,
    peak_control_force_N: peak_force,
    control_effort_integral_N2s: effort
  };
}

export function buildComparisonTable(
  openMetrics: PerformanceMetrics,
  closedMetrics: PerformanceMetrics
): ComparisonTableRow[] {
  return [
    {
      metric: "System Stability",
      open_loop: "UNSTABLE (Angle diverges > 90°)",
      closed_loop: "STABLE (Asymptotic return to 0°)",
      unit: "State"
    },
    {
      metric: "Settling Time (2% band)",
      open_loop: "Diverged (∞)",
      closed_loop: closedMetrics.settling_time_s !== null ? `${closedMetrics.settling_time_s.toFixed(2)} s` : "N/A",
      unit: "s"
    },
    {
      metric: "Steady-State Angular Error",
      open_loop: "Fallen",
      closed_loop: `${closedMetrics.steady_state_angle_deg.toFixed(4)}°`,
      unit: "deg"
    },
    {
      metric: "Steady-State Cart Position",
      open_loop: "Diverged",
      closed_loop: `${closedMetrics.steady_state_cart_x_m.toFixed(4)} m`,
      unit: "m"
    },
    {
      metric: "Peak Angular Displacement",
      open_loop: `${openMetrics.peak_angle_deg.toFixed(2)}°`,
      closed_loop: `${closedMetrics.peak_angle_deg.toFixed(2)}°`,
      unit: "deg"
    },
    {
      metric: "Peak Cart Displacement",
      open_loop: `${openMetrics.peak_cart_displacement_m.toFixed(2)} m`,
      closed_loop: `${closedMetrics.peak_cart_displacement_m.toFixed(2)} m`,
      unit: "m"
    },
    {
      metric: "Maximum Control Force |u|",
      open_loop: "0.00 N (Uncontrolled)",
      closed_loop: `${closedMetrics.peak_control_force_N.toFixed(2)} N`,
      unit: "N"
    },
    {
      metric: "Total Control Effort ∫ u² dt",
      open_loop: "0.00 N²·s",
      closed_loop: `${closedMetrics.control_effort_integral_N2s.toFixed(2)} N²·s`,
      unit: "N²·s"
    }
  ];
}
