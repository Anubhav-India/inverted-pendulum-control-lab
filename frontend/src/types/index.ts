export interface PhysicalParameters {
  M: number; // Cart mass (kg)
  m: number; // Pendulum mass (kg)
  l: number; // Distance to center of mass (m)
  I: number; // Pendulum moment of inertia about COM (kg*m^2)
  b: number; // Cart viscous friction coefficient (N*s/m)
  g: number; // Gravitational acceleration (m/s^2)
}

export interface InitialConditions {
  x0: number;
  x_dot0: number;
  theta0_deg: number;
  theta_dot0: number;
}

export interface ComplexNumber {
  real: number;
  imag: number;
}

export interface StateVector {
  x: number;          // Cart position (m)
  x_dot: number;      // Cart velocity (m/s)
  theta: number;      // Pendulum angle (rad, 0 = upright)
  theta_dot: number;  // Pendulum angular velocity (rad/s)
}

export interface EigenvalueDetail {
  index?: number;
  real: number;
  imag: number;
  formatted: string;
  region?: 'stable_lhp' | 'unstable_rhp' | 'marginal_jw';
  natural_frequency_rad_s?: number;
  damping_ratio?: number;
  time_constant_s?: number | null;
}

export interface StabilityAnalysisData {
  label: string;
  eigenvalues: EigenvalueDetail[];
  classification: string;
  is_stable: boolean;
  counts: {
    lhp_stable: number;
    rhp_unstable: number;
    jw_marginal: number;
  };
  summary: string;
}

export interface LinearizedModelData {
  d0: number;
  p?: number;
  A: number[][];
  B: number[][];
  C: number[][];
  D: number[][];
  measured_states?: string[];
  A_latex: string;
  B_latex: string;
  C_latex: string;
  D_latex: string;
  coefficients?: {
    a22: number;
    a23: number;
    a42: number;
    a43: number;
    b2: number;
    b4: number;
    p: number;
  };
  open_loop_eigenvalues: EigenvalueDetail[];
  stability?: StabilityAnalysisData;
  is_stable: boolean;
  stability_status: string;
  unstable_explanation: string;
}

export interface ControllabilityData {
  col_B: number[][];
  col_AB: number[][];
  col_A2B: number[][];
  col_A3B: number[][];
  col_B_latex: string;
  col_AB_latex: string;
  col_A2B_latex: string;
  col_A3B_latex: string;
  C_matrix: number[][];
  C_matrix_latex: string;
  determinant: number;
  rank: number;
  n_states?: number;
  singular_values?: number[];
  condition_number?: number | null;
  is_controllable: boolean;
  is_well_conditioned?: boolean;
  mathematical_conclusion: string;
  physical_interpretation: string;
}

export interface AckermannControllerData {
  is_controllable?: boolean;
  feasible?: boolean;
  errors?: string[];
  warnings?: string[];
  condition_number_C?: number;
  desired_poles: ComplexNumber[];
  desired_poles_display: string[];
  polynomial_coefficients: {
    alpha4: number;
    alpha3: number;
    alpha2: number;
    alpha1: number;
    alpha0: number;
  };
  polynomial_latex: string;
  A2: number[][];
  A3: number[][];
  A4: number[][];
  Phi_A: number[][];
  Phi_A_latex: string;
  C_inv: number[][];
  C_inv_latex: string;
  K: number[];
  K_latex: string;
  scipy_K?: number[];
  scipy_ackermann_max_diff?: number;
  A_cl: number[][];
  A_cl_latex: string;
  closed_loop_eigenvalues: string[];
  closed_loop_poles_complex?: ComplexNumber[];
  max_pole_placement_error: number;
  is_closed_loop_stable?: boolean;
  is_verified: boolean;
  verification_message: string;
}

export interface PolePreset {
  label: string;
  description: string;
  poles: ComplexNumber[];
}

export interface LagrangianData {
  derivation: Record<string, string>;
  substitutions: {
    parameters: Record<string, number>;
    eq1_substituted: string;
    eq2_substituted: string;
    determinant_substituted: string;
    x_ddot_formula: string;
    theta_ddot_formula: string;
  };
}

export interface ConsolidatedAnalysisResponse {
  parameters: Record<string, any>;
  raw_parameters: PhysicalParameters;
  lagrangian: LagrangianData;
  linearized: LinearizedModelData;
  stability: StabilityAnalysisData;
  closed_loop_stability: StabilityAnalysisData | null;
  controllability: ControllabilityData;
  ackermann: AckermannControllerData;
  pole_presets: Record<string, PolePreset>;
}

export interface SimulationTrajectory {
  time: number[];
  x: number[];
  x_dot: number[];
  theta: number[];
  theta_deg: number[];
  theta_dot: number[];
  x_ddot?: number[];
  theta_ddot?: number[];
  u: number[];
  u_requested?: number[];
  u_applied?: number[];
  is_saturated?: boolean[];
  saturation_enabled?: boolean;
  disturbance: number[];
  total_force: number[];
  model_type: 'nonlinear' | 'linear';
  is_closed_loop: boolean;
}

export interface PerformanceMetrics {
  is_stable: boolean;
  settling_time_s: number | null;
  settling_threshold_deg: number;
  peak_angle_deg: number;
  peak_angle_rad: number;
  overshoot_pct: number;
  steady_state_angle_deg: number;
  steady_state_cart_x_m: number;
  peak_cart_displacement_m: number;
  peak_cart_velocity_mps: number;
  peak_control_force_N: number;
  peak_requested_force_N?: number;
  saturation_pct?: number;
  control_effort_integral_N2s: number;
}

export interface ComparisonTableRow {
  metric: string;
  open_loop: string;
  closed_loop: string;
  unit: string;
}

export type SimulationStatus = 'running' | 'paused' | 'settled' | 'unstable' | 'reset' | 'completed';
export type ModelType = 'nonlinear' | 'linear';
export type ControlMode = 'auto' | 'manual' | 'auto_with_disturbance';

export interface RealtimeSimSnapshot {
  type: 'sim_state';
  t: number;
  status: SimulationStatus;
  model_type: ModelType;
  control_mode: ControlMode;
  control_enabled: boolean;
  speed: number;
  dt: number;
  duration: number;
  continuous: boolean;
  saturation_enabled: boolean;
  u_min: number;
  u_max: number;
  state: {
    x: number;
    x_dot: number;
    theta: number;
    theta_deg: number;
    theta_dot: number;
  };
  telemetry: {
    x_ddot: number;
    theta_ddot: number;
    u_requested: number;
    u_applied: number;
    u_external: number;
    u_total: number;
    is_saturated: boolean;
  };
}
