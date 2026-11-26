function sim_results = simulation(params, K)
% SIMULATION Executes standard tests on the cart-inverted pendulum system.
%
% Tests performed:
%   Test 1: Small initial angular displacement (5 deg = 0.0873 rad)
%   Test 2: Larger initial angular displacement (10 deg = 0.1745 rad)
%   Test 3: External disturbance pulse (+10 N at t = 2.0s to 2.2s)
%   Test 4: Open-loop response (K = 0) vs Closed-loop response (u = -K*x)
%
% Uses ode45 for accurate numerical integration of the nonlinear model.

    t_span_normal = [0, 8];
    t_span_open   = [0, 2.5]; % Open-loop diverges very quickly

    options = odeset('RelTol', 1e-7, 'AbsTol', 1e-9);

    % Test 1: Small angle (5 deg)
    theta0_small = 5 * (pi / 180);
    x0_test1 = [0; 0; theta0_small; 0];
    [t1, y1] = ode45(@(t, y) nonlinear_model(t, y, params, K, []), t_span_normal, x0_test1, options);

    % Test 1 Linearized model for validation
    [A, B] = linearized_model(params);
    A_cl = A - B * K;
    [t1_lin, y1_lin] = ode45(@(t, y) A_cl * y, t_span_normal, x0_test1, options);

    % Test 2: Larger angle (10 deg)
    theta0_large = 10 * (pi / 180);
    x0_test2 = [0; 0; theta0_large; 0];
    [t2, y2] = ode45(@(t, y) nonlinear_model(t, y, params, K, []), t_span_normal, x0_test2, options);

    % Test 3: Disturbance rejection (10 N pulse at 2.0s <= t <= 2.2s)
    dist_fn = @(t) (10.0 * (t >= 2.0 & t <= 2.2));
    x0_test3 = [0; 0; 0; 0]; % Equilibrium initial condition
    [t3, y3] = ode45(@(t, y) nonlinear_model(t, y, params, K, dist_fn), t_span_normal, x0_test3, options);

    % Test 4: Open loop (K = 0)
    K_zero = [0, 0, 0, 0];
    [t4_ol, y4_ol] = ode45(@(t, y) nonlinear_model(t, y, params, K_zero, []), t_span_open, x0_test1, options);

    % Compute control forces
    u1 = - (K * y1')';
    u2 = - (K * y2')';
    u3 = - (K * y3')';
    d3 = arrayfun(dist_fn, t3);

    % Package outputs
    sim_results.test1.t = t1;
    sim_results.test1.y = y1;
    sim_results.test1.u = u1;
    sim_results.test1.y_lin = y1_lin;
    sim_results.test1.t_lin = t1_lin;

    sim_results.test2.t = t2;
    sim_results.test2.y = y2;
    sim_results.test2.u = u2;

    sim_results.test3.t = t3;
    sim_results.test3.y = y3;
    sim_results.test3.u = u3;
    sim_results.test3.d = d3;

    sim_results.test4.t_ol = t4_ol;
    sim_results.test4.y_ol = y4_ol;
    sim_results.test4.t_cl = t1;
    sim_results.test4.y_cl = y1;
end
