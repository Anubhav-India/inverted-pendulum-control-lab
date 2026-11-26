function [A, B, C, D, ol_eigs] = linearized_model(params)
% LINEARIZED_MODEL Derives the continuous-time state-space representation.
%
% Linearization around the upright equilibrium:
%   x_e = 0, x_dot_e = 0, theta_e = 0, theta_dot_e = 0, u_e = 0
% Small angle approximations:
%   sin(theta) ≈ theta,  cos(theta) ≈ 1,  cos^2(theta) ≈ 1,  theta_dot^2 ≈ 0
%
% State vector:
%   X = [x; x_dot; theta; theta_dot]
%
% Continuous-time state-space model:
%   dX/dt = A*X + B*u
%   Y     = C*X + D*u

    M = params.M;
    m = params.m;
    l = params.l;
    I = params.I;
    b = params.b;
    g = params.g;

    % Determinant at theta = 0
    d0 = (M + m)*(I + m*l^2) - (m*l)^2;
    I_pivot = I + m*l^2;

    % State matrix A (4x4)
    A = [
        0,   1,                           0,                                0;
        0,  -(b*I_pivot)/d0,             -(m^2 * g * l^2)/d0,               0;
        0,   0,                           0,                                1;
        0,   (m*l*b)/d0,                  ((M + m)*m*g*l)/d0,               0
    ];

    % Input matrix B (4x1)
    B = [
        0;
        I_pivot / d0;
        0;
        -(m*l) / d0
    ];

    % Output matrix C (measured cart position and pendulum angle)
    C = [
        1, 0, 0, 0;
        0, 0, 1, 0
    ];

    % Direct transmission matrix D
    D = [
        0;
        0
    ];

    % Calculate open-loop eigenvalues
    ol_eigs = eig(A);
end
