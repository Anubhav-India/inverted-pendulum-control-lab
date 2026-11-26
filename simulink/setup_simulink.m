%% SETUP_SIMULINK: Configures MATLAB Workspace for the Simulink Inverted Pendulum Model
% =========================================================================
% Prepares all state-space matrices, nonlinear parameters, controller gains,
% and disturbance parameters for the Simulink simulation.
%
% Strictly NO PID blocks are used. Only full-state feedback u = -K*x.
% =========================================================================

clear; clc;

% Add matlab directory to path
addpath('../matlab');

% Load physical parameters
params = parameters();
M = params.M;
m = params.m;
l = params.l;
I = params.I;
b = params.b;
g = params.g;
I_pivot = params.I_total;
M_total = params.M_total;

% Compute linear state-space model
[A, B, C, D, ol_eigs] = linearized_model(params);

% Design full-state feedback gain via Ackermann's formula
desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j];
[K, Phi_A, poly_coeffs, A_cl, cl_eigs, err] = ackermann_controller(A, B, desired_poles);

% Initial conditions for Simulink Integrators
x_init         = 0.0;                 % Initial cart position [m]
x_dot_init     = 0.0;                 % Initial cart velocity [m/s]
theta_init     = 5.0 * (pi / 180);    % Initial angle: 5 degrees [rad]
theta_dot_init = 0.0;                 % Initial angular velocity [rad/s]

% Initial state vector
X0 = [x_init; x_dot_init; theta_init; theta_dot_init];

% Disturbance configuration
dist_magnitude  = 10.0;   % Pulse amplitude [N]
dist_start_time = 2.0;    % Start time [s]
dist_pulse_width= 0.2;    % Duration [s]

fprintf('Simulink workspace successfully initialized!\n');
fprintf('State-Feedback Gain K = [%.4f, %.4f, %.4f, %.4f]\n', K(1), K(2), K(3), K(4));
fprintf('Initial Pendulum Angle = %.2f degrees\n', theta_init * 180 / pi);
fprintf('Open model: inverted_pendulum_sim.slx (see simulink_model_guide.md for layout)\n');
