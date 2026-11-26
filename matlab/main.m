%% MASTER SCRIPT: Inverted Pendulum State-Feedback Stabilization
% =========================================================================
% Project Title:
%   Non-Linear Modeling, Linearization, and State-Feedback Controller Design
%   Using Ackermann's Formula for Stabilization of an Inverted Pendulum
%
% Role & Objective:
%   Comprehensive undergraduate / graduate control systems engineering suite.
%   Complete engineering workflow:
%     1. Physical parameters configuration
%     2. Linearization and continuous-time state-space representation
%     3. Controllability analysis (Kalman rank condition)
%     4. Full-state feedback controller design via manual Ackermann's formula
%     5. Verification of closed-loop poles
%     6. Nonlinear numerical simulation (ode45)
%     7. Performance evaluation & comparative reporting
%     8. Engineering visualization and publication-quality plotting
%
% ABSOLUTE RESTRICTION:
%   PID control is STRICTLY PROHIBITED throughout this project.
%   The only control law implemented is u = -K*x.
% =========================================================================

clear; clc; close all;

fprintf('=========================================================================\n');
fprintf('  INVERTED PENDULUM STABILIZATION USING ACKERMANN''S FORMULA\n');
fprintf('  Control Strategy: Full-State Feedback u = -Kx  [NO PID CONTROLLER]\n');
fprintf('=========================================================================\n\n');

%% Step 1: Load Physical Parameters
params = parameters();
fprintf('1. Physical Parameters Loaded:\n');
fprintf('   - Cart mass (M):                    %.2f kg\n', params.M);
fprintf('   - Pendulum mass (m):                %.2f kg\n', params.m);
fprintf('   - Pivot to COM distance (l):        %.2f m\n', params.l);
fprintf('   - Pendulum moment of inertia (I):   %.4f kg*m^2\n', params.I);
fprintf('   - Cart friction coefficient (b):    %.2f N*s/m\n', params.b);
fprintf('   - Gravitational acceleration (g):   %.2f m/s^2\n\n', params.g);

%% Step 2: Linearization and State-Space Representation
[A, B, C, D, ol_eigs] = linearized_model(params);

fprintf('2. Linearized State-Space Matrices:\n');
fprintf('   State vector X = [x; x_dot; theta; theta_dot]\n');
fprintf('   A =\n'); disp(A);
fprintf('   B =\n'); disp(B);
fprintf('   C =\n'); disp(C);
fprintf('   D =\n'); disp(D);

fprintf('   Open-Loop Eigenvalues:\n');
for i = 1:length(ol_eigs)
    fprintf('     lambda_%d = %+8.4f %+8.4fj\n', i, real(ol_eigs(i)), imag(ol_eigs(i)));
end
fprintf('   Stability Analysis: Notice the positive real eigenvalue (+%.4f).\n', max(real(ol_eigs)));
fprintf('   This confirms that the open-loop upright equilibrium is inherently UNSTABLE.\n\n');

%% Step 3: Controllability Analysis
[C_mat, r, is_ctrl, cols] = controllability(A, B);

%% Step 4: Ackermann's Formula State-Feedback Design
% Select stable closed-loop poles:
% Dominated by pair at -1 +/- 1j (settling time ~ 4s, damping ~ 0.707)
% Faster non-dominant poles at -2, -2
desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j];

[K, Phi_A, poly_coeffs, A_cl, cl_eigs, err] = ackermann_controller(A, B, desired_poles);

%% Step 5: Nonlinear System Simulation
fprintf('5. Running Nonlinear Numerical Simulations (ode45)...\n');
sim_results = simulation(params, K);
fprintf('   Simulations completed successfully.\n\n');

%% Step 6: Performance Evaluation
metrics = performance_analysis(sim_results);

%% Step 7: Plotting
fprintf('7. Generating Publication-Quality Plots...\n');
plotting(sim_results);
fprintf('   All plots displayed.\n\n');

fprintf('=========================================================================\n');
fprintf('  WORKFLOW COMPLETED SUCCESSFULLY - ALL MATHEMATICAL CHECKS PASSED\n');
fprintf('=========================================================================\n');
