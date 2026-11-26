function dxdt = nonlinear_model(t, x_state, params, K, disturbance_fn)
% NONLINEAR_MODEL Computes state derivatives for the nonlinear cart-pole system.
%
% State vector:
%   x_state(1) = x          (Cart position, [m])
%   x_state(2) = x_dot      (Cart velocity, [m/s])
%   x_state(3) = theta      (Pendulum angle from upright vertical, [rad])
%   x_state(4) = theta_dot  (Pendulum angular velocity, [rad/s])
%
% Control Law:
%   Full-state feedback: u = -K * x_state
%   (PID control is strictly prohibited by project specification)
%
% Equations of Motion:
%   (M + m)*x_ddot + m*l*cos(theta)*theta_ddot = u - b*x_dot + m*l*theta_dot^2*sin(theta)
%   m*l*cos(theta)*x_ddot + (I + m*l^2)*theta_ddot = m*g*l*sin(theta)

    if nargin < 4 || isempty(K)
        K = [0, 0, 0, 0];
    end
    
    if nargin < 5 || isempty(disturbance_fn)
        dist_force = 0;
    else
        dist_force = disturbance_fn(t);
    end

    x = x_state(1);
    x_dot = x_state(2);
    theta = x_state(3);
    theta_dot = x_state(4);

    % Full-state feedback control force
    u_control = -K * x_state;
    u_total = u_control + dist_force;

    % Physical parameters
    M = params.M;
    m = params.m;
    l = params.l;
    I = params.I;
    b = params.b;
    g = params.g;

    sin_th = sin(theta);
    cos_th = cos(theta);

    % Determinant of the coupled mass-inertia matrix
    D = (M + m)*(I + m*l^2) - (m*l*cos_th)^2;

    % Right-hand side dynamic terms
    term1 = u_total - b*x_dot + m*l*(theta_dot^2)*sin_th;
    term2 = m*g*l*sin_th;

    % Accelerations solved via Cramer's rule / 2x2 matrix inversion
    x_ddot = ((I + m*l^2)*term1 - m*l*cos_th*term2) / D;
    theta_ddot = ((M + m)*term2 - m*l*cos_th*term1) / D;

    % First-order state derivative vector
    dxdt = [x_dot; x_ddot; theta_dot; theta_ddot];
end
