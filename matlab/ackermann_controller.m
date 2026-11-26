function [K, Phi_A, poly_coeffs, A_cl, cl_eigs, err] = ackermann_controller(A, B, desired_poles)
% ACKERMANN_CONTROLLER Designs full-state feedback gain matrix using Ackermann's Formula.
%
% ABSOLUTE RESTRICTION:
%   PID control is STRICTLY PROHIBITED throughout this project.
%   Only full-state feedback u = -K*x is designed and implemented.
%
% Mathematical Formula:
%   K = [0, 0, ..., 1] * inv(C) * Phi(A)
%
% Steps:
%   1. Form desired characteristic polynomial:
%      Phi(s) = (s - p1)(s - p2)(s - p3)(s - p4) = s^4 + a3*s^3 + a2*s^2 + a1*s + a0
%   2. Form matrix polynomial evaluated at A:
%      Phi(A) = A^4 + a3*A^3 + a2*A^2 + a1*A + a0*I
%   3. Construct controllability matrix C = [B, AB, A^2B, A^3B]
%   4. Compute K = e_n' * inv(C) * Phi(A), where e_n = [0; 0; 0; 1]
%   5. Compute closed-loop matrix A_cl = A - B*K
%   6. Verify closed-loop eigenvalues against desired poles.
%   7. Cross-check against MATLAB's built-in acker() function for validation.

    if nargin < 3 || isempty(desired_poles)
        % Desired closed-loop poles:
        % Well-damped dominant conjugate pair + fast decaying secondary pair
        desired_poles = [-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j];
    end

    desired_poles = desired_poles(:);
    n = length(A);

    % Step 1: Desired characteristic polynomial coefficients
    % poly(roots) returns [1, a3, a2, a1, a0]
    poly_coeffs = poly(desired_poles);

    % Step 2: Compute powers of A
    I_n = eye(n);
    A2  = A * A;
    A3  = A * A2;
    A4  = A * A3;

    % Evaluate Phi(A)
    Phi_A = poly_coeffs(1)*A4 + poly_coeffs(2)*A3 + poly_coeffs(3)*A2 + ...
            poly_coeffs(4)*A + poly_coeffs(5)*I_n;

    % Step 3: Controllability matrix
    C_mat = [B, A*B, A2*B, A3*B];

    % Step 4: Gain vector via Ackermann's formula
    % e_n' is the last row of the n x n identity matrix
    e_n = zeros(1, n);
    e_n(n) = 1;

    % Compute manually using linear solve or inverse
    K = e_n * (C_mat \ Phi_A);
    K = real(K);

    % Step 5: Closed-loop dynamics
    A_cl = A - B * K;
    cl_eigs = eig(A_cl);

    % Step 6: Numerical error check
    sorted_desired = sort(desired_poles);
    sorted_actual  = sort(cl_eigs);
    err = max(abs(sorted_desired - sorted_actual));

    % Verification using MATLAB acker (for cross-checking only)
    if exist('acker', 'file') == 2
        K_verify = acker(A, B, desired_poles);
        diff_acker = norm(K - K_verify);
        fprintf('Validation with acker(): Difference = %e\n', diff_acker);
    end

    fprintf('--- ACKERMANN CONTROLLER DESIGN ---\n');
    fprintf('Desired Poles:\n');
    disp(desired_poles);
    fprintf('Polynomial Coefficients [s^4, s^3, s^2, s^1, s^0]:\n');
    disp(poly_coeffs);
    fprintf('Full-State Feedback Gain K = [k1, k2, k3, k4]:\n');
    disp(K);
    fprintf('Closed-Loop Eigenvalues:\n');
    disp(cl_eigs);
    fprintf('Maximum Pole Placement Error: %e\n\n', err);
end
