function [C_mat, r, is_ctrl, cols] = controllability(A, B)
% CONTROLLABILITY Evaluates Kalman controllability matrix and rank condition.
%
% Controllability Matrix:
%   C = [B, A*B, A^2*B, A^3*B]
%
% Kalman Rank Criterion:
%   The 4th-order system is completely state-controllable if and only if
%   rank(C) = 4.

    % Compute columns individually
    cols.B    = B;
    cols.AB   = A * B;
    cols.A2B  = A * cols.AB;
    cols.A3B  = A * cols.A2B;

    % Assemble controllability matrix
    C_mat = [cols.B, cols.AB, cols.A2B, cols.A3B];

    % Compute rank and determinant
    r = rank(C_mat);
    d = det(C_mat);
    is_ctrl = (r == 4);

    fprintf('--- CONTROLLABILITY ANALYSIS ---\n');
    fprintf('Matrix Dimension n = 4\n');
    fprintf('Controllability Matrix Determinant = %e\n', d);
    fprintf('Rank(C) = %d\n', r);
    if is_ctrl
        fprintf('CONCLUSION: System is FULLY CONTROLLABLE (Rank == 4).\n\n');
    else
        fprintf('CONCLUSION: System is NOT fully controllable!\n\n');
    end
end
