function params = parameters()
% PARAMETERS Centralized physical parameters for the Inverted Pendulum.
%
% System Description:
%   A rigid inverted pendulum mounted on a translating cart.
%   The cart moves horizontally along a single axis.
%   The pendulum rotates freely in the vertical plane.
%
% Sign Convention:
%   theta = 0 represents the vertically upright (unstable) equilibrium.
%   Positive theta corresponds to clockwise / rightward tilt.
%   x = 0 is the origin of the cart track. Positive x is to the right.
%   u is the horizontal actuator force applied directly to the cart.
%
% Output:
%   params: Struct containing all physical constants in standard SI units.

    params.M = 0.5;      % Cart mass [kg]
    params.m = 0.2;      % Pendulum mass [kg]
    params.l = 0.3;      % Pivot to pendulum center-of-mass distance [m]
    params.I = 0.006;    % Moment of inertia of pendulum about its COM [kg*m^2]
    params.b = 0.1;      % Linear viscous friction of cart [N*s/m]
    params.g = 9.81;     % Acceleration due to gravity [m/s^2]
    
    % Derived structural constants
    params.I_total = params.I + params.m * (params.l^2);  % Moment of inertia about pivot [kg*m^2]
    params.M_total = params.M + params.m;                 % Total combined mass [kg]
    params.ml = params.m * params.l;                      % First mass moment [kg*m]
end
