# Simulink Implementation Guide: Inverted Pendulum State-Feedback Stabilization

## 1. System Overview and Non-Negotiable Constraint

This Simulink architecture implements the stabilization of an inverted pendulum mounted on a movable cart using **Full-State Feedback Control designed via Ackermann's Formula**.

> [!CAUTION]
> **PID CONTROL IS STRICTLY PROHIBITED.**
> Do not use PID Controller blocks, PID Autotuners, or any proportional-integral-derivative combinations. The only control law implemented is:
> $$u = -K X$$
> where $X = [x, \dot{x}, \theta, \dot{\theta}]^T$ and $K = [k_1, k_2, k_3, k_4]$.

---

## 2. Top-Level Simulink Model Architecture

```
                       +-----------------------+
                       |   Disturbance Pulse   |
                       | (10 N at t = 2.0-2.2s)|
                       +-----------+-----------+
                                   |
                                   v  d(t)
+-----------------------+      +---+---+      +--------------------------------+
| State-Feedback Gain   | u(t) |       | u_tot|   Nonlinear Plant Subsystem    |
|       -K Matrix       +----->+  SUM  +----->+                                |
|  [Gain: -K (1x4)]     |      |       |      |  Inputs: u_tot                 |
+-----------^-----------+      +-------+      |  Outputs: X = [x, x_dot, th, th_dot]
            |                                 +---------------+----------------+
            |                                                 |
            +-------------------------------------------------+
                            Full State Vector X
```

---

## 3. Subsystem Breakdown and Block Configurations

### Subsystem A: Nonlinear Plant (`Nonlinear_Plant`)

The plant computes the coupled nonlinear differential equations derived from Lagrangian mechanics:

$$\begin{bmatrix} M+m & ml\cos\theta \\ ml\cos\theta & I+ml^2 \end{bmatrix} \begin{bmatrix} \ddot{x} \\ \ddot{\theta} \end{bmatrix} = \begin{bmatrix} u_{\text{tot}} - b\dot{x} + ml\dot{\theta}^2\sin\theta \\ mgl\sin\theta \end{bmatrix}$$

#### Block Structure:
1. **Input Port 1**: `u_tot` (Total horizontal actuator force).
2. **MATLAB Function Block** or **Vector Subsystem**: `Nonlinear_Accelerations`
   - Inputs: `u_tot`, `x`, `x_dot`, `theta`, `theta_dot`
   - Parameters from Workspace: `M`, `m`, `l`, `I`, `b`, `g`
   - Code inside block:
     ```matlab
     function [x_ddot, theta_ddot] = Nonlinear_Accelerations(u, x, x_dot, theta, theta_dot, M, m, l, I, b, g)
         sin_th = sin(theta);
         cos_th = cos(theta);
         D = (M + m)*(I + m*l^2) - (m*l*cos_th)^2;
         term1 = u - b*x_dot + m*l*(theta_dot^2)*sin_th;
         term2 = m*g*l*sin_th;
         x_ddot = ((I + m*l^2)*term1 - m*l*cos_th*term2) / D;
         theta_ddot = ((M + m)*term2 - m*l*cos_th*term1) / D;
     end
     ```
3. **Cart Velocity Integrator**:
   - Block: `Integrator`
   - Initial condition: `x_dot_init` (default: 0.0 m/s)
   - Output: `x_dot`
4. **Cart Position Integrator**:
   - Block: `Integrator`
   - Initial condition: `x_init` (default: 0.0 m)
   - Output: `x`
5. **Pendulum Angular Velocity Integrator**:
   - Block: `Integrator`
   - Initial condition: `theta_dot_init` (default: 0.0 rad/s)
   - Output: `theta_dot`
6. **Pendulum Angle Integrator**:
   - Block: `Integrator`
   - Initial condition: `theta_init` (default: 5° = 0.087266 rad)
   - Output: `theta`
7. **Bus Creator / Vector Concatenation**:
   - Inputs: `x`, `x_dot`, `theta`, `theta_dot`
   - Output Port 1: `X` (State vector $4 \times 1$)

---

### Subsystem B: State-Feedback Controller (`State_Feedback_Controller`)

1. **Input Port**: `X` (Dimension: 4)
2. **Gain Block**:
   - Name: `State_Feedback_Gain`
   - Gain value: `-K` (where `K` is the $1 \times 4$ row vector computed via Ackermann's formula in `setup_simulink.m`)
   - Multiplication: `Matrix(K*u)`
3. **Output Port**: `u` (Dimension: 1)
   - Produces the scalar actuator force $u = -K X = -(k_1 x + k_2 \dot{x} + k_3 \theta + k_4 \dot{\theta})$.

---

### Subsystem C: Disturbance Generator (`Disturbance_Input`)

1. **Pulse Generator** block:
   - Amplitude: `dist_magnitude` ($10.0\text{ N}$)
   - Period: $100\text{ s}$ (single pulse within simulation)
   - Pulse width: $(0.2 / 100) \times 100 = 0.2\%$
   - Phase delay: $2.0\text{ s}$
2. **Output**: `d(t)` fed to the `Sum` block with controller output `u(t)`.

---

### Subsystem D: Scope and Instrumentation (`Scopes_and_Logging`)

1. **Cart Position Scope**: Displays $x(t)$ in meters.
2. **Pendulum Angle Scope**: Displays $\theta(t)$ converted to degrees ($\times \frac{180}{\pi}$).
3. **Control Effort Scope**: Displays $u(t)$ in Newtons.
4. **To Workspace Blocks**:
   - `sim_out_x`: Array logging of cart displacement.
   - `sim_out_theta`: Array logging of angular response.
   - `sim_out_u`: Array logging of control force.

---

## 4. Solver Settings

- **Solver type**: Variable-step or Fixed-step (`ode45` / Dormand-Prince).
- **Max step size**: `0.005 s`.
- **Stop time**: `8.0 s`.
- **Relative tolerance**: `1e-7`.
- **Absolute tolerance**: `1e-9`.

---

## 5. Execution Workflow

1. Open MATLAB and navigate to `simulink/`.
2. Run `setup_simulink.m` in MATLAB command window to load `params`, `K`, `A`, `B`, and initial states into `base` workspace.
3. Open or build the Simulink model as described above.
4. Click **Run**.
5. Observe the rapid stabilization of the pendulum from its initial $5^\circ$ displacement back to the vertical upright position ($\theta = 0$) within $\approx 3.5$ seconds, with zero steady-state error.
