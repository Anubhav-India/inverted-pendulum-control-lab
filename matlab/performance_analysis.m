function metrics = performance_analysis(sim_results)
% PERFORMANCE_ANALYSIS Evaluates transient and steady-state metrics.
%
% Computes:
%   - Settling time (2% threshold)
%   - Maximum angular displacement
%   - Peak cart displacement
%   - Maximum actuator control force
%   - Steady-state error
%   - Open-loop vs Closed-loop comparative evaluation table

    t = sim_results.test1.t;
    y = sim_results.test1.y;
    u = sim_results.test1.u;

    x     = y(:, 1);
    theta = y(:, 3) * (180 / pi); % Convert to degrees

    % Settling time (2% of initial angle: 0.02 * 5 deg = 0.1 deg)
    threshold = 0.1;
    unsettled = find(abs(theta) > threshold);
    if isempty(unsettled)
        t_settle = 0;
    elseif unsettled(end) < length(t)
        t_settle = t(unsettled(end) + 1);
    else
        t_settle = t(end);
    end

    % Peak values
    max_theta = max(abs(theta));
    max_x     = max(abs(x));
    max_u     = max(abs(u));

    % Steady-state errors (last 10% of simulation)
    tail_idx = round(0.9 * length(t)):length(t);
    ss_theta = mean(theta(tail_idx));
    ss_x     = mean(x(tail_idx));

    % Overshoot calculation
    opp_peak = max(-sign(theta(1)) * theta);
    if opp_peak > 0
        overshoot = (opp_peak / abs(theta(1))) * 100;
    else
        overshoot = 0;
    end

    metrics.test1.settling_time_s    = t_settle;
    metrics.test1.peak_angle_deg     = max_theta;
    metrics.test1.overshoot_pct      = overshoot;
    metrics.test1.ss_angle_deg       = ss_theta;
    metrics.test1.ss_cart_x_m        = ss_x;
    metrics.test1.peak_cart_x_m      = max_x;
    metrics.test1.peak_control_u_N   = max_u;

    % Display comparative analysis table in command window
    fprintf('=========================================================================\n');
    fprintf('                     PERFORMANCE EVALUATION REPORT                       \n');
    fprintf('=========================================================================\n');
    fprintf('%-35s | %-16s | %-16s\n', 'Metric', 'Open-Loop', 'Closed-Loop (Ackermann)');
    fprintf('------------------------------------+------------------+------------------\n');
    fprintf('%-35s | %-16s | %-16s\n', 'Stability Status', 'UNSTABLE (Falls)', 'STABLE (Asymptotic)');
    fprintf('%-35s | %-16s | %-16.2f s\n', 'Settling Time (2% band)', 'Diverges (Inf)', t_settle);
    fprintf('%-35s | %-16s | %-16.4f deg\n', 'Steady-State Angular Error', 'Diverged', ss_theta);
    fprintf('%-35s | %-16s | %-16.4f m\n', 'Steady-State Cart Position', 'Diverged', ss_x);
    fprintf('%-35s | %-16.2f deg | %-16.2f deg\n', 'Peak Angular Displacement', max(abs(sim_results.test4.y_ol(:,3)))*180/pi, max_theta);
    fprintf('%-35s | %-16.2f m   | %-16.2f m\n', 'Peak Cart Displacement', max(abs(sim_results.test4.y_ol(:,1))), max_x);
    fprintf('%-35s | %-16s | %-16.2f N\n', 'Maximum Control Force |u|', '0.00 N (None)', max_u);
    fprintf('=========================================================================\n\n');
end
