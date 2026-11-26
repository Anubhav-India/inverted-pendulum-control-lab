function plotting(sim_results)
% PLOTTING Generates high-quality engineering plots for all test scenarios.
% Uses a clean light theme, visible labels, proper units, and distinct colors.

    % Define consistent color palette (light theme)
    c_blue   = [0.23, 0.51, 0.96]; % #3B82F6
    c_green  = [0.09, 0.64, 0.29]; % #16A34A
    c_orange = [0.98, 0.45, 0.09]; % #F97316
    c_red    = [0.86, 0.15, 0.15]; % #DC2626
    c_gray   = [0.39, 0.45, 0.55]; % #64748B

    %% Figure 1: Test 1 - Small Angle Stabilization (5 deg) & Linear Comparison
    f1 = figure('Name', 'Test 1: Small Angle Stabilization (5 deg)', 'Color', 'w', 'Position', [100, 100, 1000, 700]);

    % Subplot 1: Pendulum Angle (deg)
    subplot(2, 2, 1);
    plot(sim_results.test1.t, sim_results.test1.y(:, 3) * (180/pi), 'Color', c_blue, 'LineWidth', 2, 'DisplayName', 'Nonlinear Plant');
    hold on;
    plot(sim_results.test1.t_lin, sim_results.test1.y_lin(:, 3) * (180/pi), '--', 'Color', c_orange, 'LineWidth', 1.8, 'DisplayName', 'Linearized Model');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Pendulum Angle \theta (deg)');
    title('Pendulum Angle vs Time (\theta_0 = 5^\circ)');
    legend('Location', 'northeast');

    % Subplot 2: Cart Position (m)
    subplot(2, 2, 2);
    plot(sim_results.test1.t, sim_results.test1.y(:, 1), 'Color', c_green, 'LineWidth', 2, 'DisplayName', 'Nonlinear Plant');
    hold on;
    plot(sim_results.test1.t_lin, sim_results.test1.y_lin(:, 1), '--', 'Color', c_orange, 'LineWidth', 1.8, 'DisplayName', 'Linearized Model');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Cart Position x (m)');
    title('Cart Position vs Time');
    legend('Location', 'northeast');

    % Subplot 3: Angular Velocity (rad/s)
    subplot(2, 2, 3);
    plot(sim_results.test1.t, sim_results.test1.y(:, 4), 'Color', c_blue, 'LineWidth', 1.8);
    grid on; box on;
    xlabel('Time (s)'); ylabel('Angular Velocity d\theta/dt (rad/s)');
    title('Pendulum Angular Velocity');

    % Subplot 4: Applied Control Force (N)
    subplot(2, 2, 4);
    plot(sim_results.test1.t, sim_results.test1.u, 'Color', c_red, 'LineWidth', 2);
    grid on; box on;
    xlabel('Time (s)'); ylabel('Actuator Force u (N)');
    title('State-Feedback Control Force: u = -Kx');

    %% Figure 2: Test 2 - Initial Condition Comparison (5 deg vs 10 deg)
    f2 = figure('Name', 'Test 2: Angle Comparison (5 deg vs 10 deg)', 'Color', 'w', 'Position', [150, 150, 900, 500]);

    subplot(1, 2, 1);
    plot(sim_results.test1.t, sim_results.test1.y(:, 3) * (180/pi), 'Color', c_blue, 'LineWidth', 2, 'DisplayName', '\theta_0 = 5^\circ');
    hold on;
    plot(sim_results.test2.t, sim_results.test2.y(:, 3) * (180/pi), 'Color', c_orange, 'LineWidth', 2, 'DisplayName', '\theta_0 = 10^\circ');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Pendulum Angle (deg)');
    title('Angle Response Comparison');
    legend('Location', 'northeast');

    subplot(1, 2, 2);
    plot(sim_results.test1.t, sim_results.test1.u, 'Color', c_blue, 'LineWidth', 2, 'DisplayName', '\theta_0 = 5^\circ');
    hold on;
    plot(sim_results.test2.t, sim_results.test2.u, 'Color', c_orange, 'LineWidth', 2, 'DisplayName', '\theta_0 = 10^\circ');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Actuator Force u (N)');
    title('Control Effort Comparison');
    legend('Location', 'northeast');

    %% Figure 3: Test 3 - Disturbance Rejection
    f3 = figure('Name', 'Test 3: External Disturbance Response', 'Color', 'w', 'Position', [200, 200, 950, 550]);

    subplot(3, 1, 1);
    plot(sim_results.test3.t, sim_results.test3.d, 'Color', c_red, 'LineWidth', 2);
    grid on; box on;
    xlabel('Time (s)'); ylabel('Disturbance (N)');
    title('External Disturbance Force Input (+10 N Pulse at t = 2s)');

    subplot(3, 1, 2);
    plot(sim_results.test3.t, sim_results.test3.y(:, 3) * (180/pi), 'Color', c_blue, 'LineWidth', 2);
    grid on; box on;
    xlabel('Time (s)'); ylabel('Pendulum Angle (deg)');
    title('Pendulum Angle Response Under Disturbance');

    subplot(3, 1, 3);
    plot(sim_results.test3.t, sim_results.test3.u, 'Color', c_green, 'LineWidth', 2);
    grid on; box on;
    xlabel('Time (s)'); ylabel('Control Force u (N)');
    title('Active State-Feedback Restoring Force');

    %% Figure 4: Test 4 - Open-Loop vs Closed-Loop
    f4 = figure('Name', 'Test 4: Open-Loop vs Closed-Loop Comparison', 'Color', 'w', 'Position', [250, 250, 850, 450]);

    subplot(1, 2, 1);
    plot(sim_results.test4.t_ol, sim_results.test4.y_ol(:, 3) * (180/pi), 'Color', c_red, 'LineWidth', 2, 'DisplayName', 'Open-Loop (u = 0)');
    hold on;
    plot(sim_results.test4.t_cl, sim_results.test4.y_cl(:, 3) * (180/pi), 'Color', c_green, 'LineWidth', 2, 'DisplayName', 'Closed-Loop (u = -Kx)');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Angle (deg)');
    title('Pendulum Angle Divergence vs Stabilization');
    legend('Location', 'northwest');

    subplot(1, 2, 2);
    plot(sim_results.test4.t_ol, sim_results.test4.y_ol(:, 1), 'Color', c_red, 'LineWidth', 2, 'DisplayName', 'Open-Loop');
    hold on;
    plot(sim_results.test4.t_cl, sim_results.test4.y_cl(:, 1), 'Color', c_green, 'LineWidth', 2, 'DisplayName', 'Closed-Loop');
    grid on; box on;
    xlabel('Time (s)'); ylabel('Cart Position (m)');
    title('Cart Position Comparison');
    legend('Location', 'northwest');
end
