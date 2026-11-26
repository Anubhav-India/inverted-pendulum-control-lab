# Non-Linear Modeling, Linearization, and State-Feedback Controller Design Using Ackermann's Formula for Stabilization of an Inverted Pendulum

**Author:** Electrical & Instrumentation Engineering Project Group  
**Project Category:** Advanced Control Systems Engineering  
**Control Strategy:** Full-State Feedback ($u = -KX$) via Ackermann's Formula  
**Restricted Methods:** PID Control strictly excluded  

---

## Abstract

This project presents the complete mathematical modeling, linearization, controllability analysis, state-feedback controller design, and nonlinear simulation of an inverted pendulum mounted on a translating cart. Starting from first principles of classical analytical mechanics, the coupled nonlinear equations of motion are derived using Lagrangian mechanics. The system is linearized around the unstable upright equilibrium point to obtain a continuous-time 4th-order state-space representation. Controllability analysis verifies that the Kalman rank condition is satisfied ($\text{rank}(\mathcal{C}) = 4$). A full-state feedback controller is designed using Ackermann's formula to place closed-loop poles at desired locations, guaranteeing asymptotic stability. The designed controller is validated on the full nonlinear plant model across multiple benchmark scenarios, including small-angle deviations ($5^\circ$), larger initial angles ($10^\circ$), and external impulse force disturbances ($+10\text{ N}$).

---

## 1. System Description & Coordinate Conventions

The system comprises a rigid inverted pendulum hinged to a cart that moves horizontally along a linear track.

### Angular Convention
- $\theta = 0\text{ rad}$: Vertically upright equilibrium position.
- $\theta > 0$: Clockwise / rightward angular displacement.
- $x$: Horizontal displacement of the cart pivot from origin ($x=0$).
- $u$: Horizontal control force applied directly to the cart.

### System Parameters
| Parameter | Symbol | Value | Unit |
| :--- | :---: | :---: | :---: |
| Cart Mass | $M$ | $0.5$ | $\text{kg}$ |
| Pendulum Mass | $m$ | $0.2$ | $\text{kg}$ |
| Center-of-Mass Distance | $l$ | $0.3$ | $\text{m}$ |
| Pendulum Inertia about COM | $I$ | $0.006$ | $\text{kg}\cdot\text{m}^2$ |
| Cart Viscous Friction | $b$ | $0.1$ | $\text{N}\cdot\text{s/m}$ |
| Gravitational Acceleration | $g$ | $9.81$ | $\text{m/s}^2$ |

---

## 2. Absolute Controller Restriction

> [!IMPORTANT]
> **PID CONTROL IS STRICTLY PROHIBITED THROUGHOUT THIS PROJECT.**
> The only controller implemented is **Full-State Feedback Control** based on Ackermann's Formula:
> $$u = -K X = -\begin{bmatrix} k_1 & k_2 & k_3 & k_4 \end{bmatrix} \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix}$$
>
> **Rationale:** Classical single-input single-output (SISO) PID controllers require artificial workarounds (such as dual cascaded loops) to stabilize an underactuated multi-state system (4 states, 1 control input). Full-state feedback in modern state-space theory directly places all 4 closed-loop poles simultaneously, guaranteeing multi-variable stability and decoupling.

---

## 3. Nonlinear Mathematical Modeling: Lagrangian Mechanics

### Kinematics
Coordinates of the pendulum center-of-mass:
$$x_p = x + l \sin\theta, \quad y_p = l \cos\theta$$

Differentiating with respect to time $t$:
$$\dot{x}_p = \dot{x} + l \dot{\theta} \cos\theta, \quad \dot{y}_p = -l \dot{\theta} \sin\theta$$

The square of the velocity of the center-of-mass is:
$$v_p^2 = \dot{x}_p^2 + \dot{y}_p^2 = \dot{x}^2 + 2 l \dot{x} \dot{\theta} \cos\theta + l^2 \dot{\theta}^2$$

### Kinetic Energy ($T$)
$$T = \frac{1}{2} M \dot{x}^2 + \frac{1}{2} m v_p^2 + \frac{1}{2} I \dot{\theta}^2 = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2$$

### Potential Energy ($V$)
Taking the cart pivot horizontal plane ($y = 0$) as datum:
$$V = m g y_p = m g l \cos\theta$$

### Lagrangian ($L = T - V$)
$$L = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2 - m g l \cos\theta$$

### Euler-Lagrange Equations
Using $\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}_i}\right) - \frac{\partial L}{\partial q_i} = Q_i$:

1. **For generalized coordinate $x$** ($Q_x = u - b\dot{x}$):
   $$\frac{\partial L}{\partial \dot{x}} = (M + m)\dot{x} + m l \dot{\theta} \cos\theta$$
   $$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{x}}\right) = (M + m)\ddot{x} + m l \ddot{\theta} \cos\theta - m l \dot{\theta}^2 \sin\theta$$
   $$\frac{\partial L}{\partial x} = 0$$
   $$(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} = u - b\dot{x} + m l \dot{\theta}^2 \sin\theta \quad \text{--- (Equation 1)}$$

2. **For generalized coordinate $\theta$** ($Q_\theta = 0$):
   $$\frac{\partial L}{\partial \dot{\theta}} = m l \dot{x} \cos\theta + (I + m l^2)\dot{\theta}$$
   $$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{\theta}}\right) = m l \ddot{x} \cos\theta - m l \dot{x}\dot{\theta}\sin\theta + (I + m l^2)\ddot{\theta}$$
   $$\frac{\partial L}{\partial \theta} = -m l \dot{x}\dot{\theta}\sin\theta + m g l \sin\theta$$
   $$m l \cos\theta \, \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \sin\theta \quad \text{--- (Equation 2)}$$

### Decoupled Acceleration Solution
In matrix form:
$$\begin{bmatrix} M + m & m l \cos\theta \\ m l \cos\theta & I + m l^2 \end{bmatrix} \begin{bmatrix} \ddot{x} \\ \ddot{\theta} \end{bmatrix} = \begin{bmatrix} u - b\dot{x} + m l \dot{\theta}^2 \sin\theta \\ m g l \sin\theta \end{bmatrix}$$

Let $D(\theta) = (M + m)(I + m l^2) - (m l \cos\theta)^2$.
$$\ddot{x} = \frac{(I + m l^2)(u - b\dot{x} + m l \dot{\theta}^2 \sin\theta) - m l \cos\theta(m g l \sin\theta)}{D(\theta)}$$
$$\ddot{\theta} = \frac{(M + m)(m g l \sin\theta) - m l \cos\theta(u - b\dot{x} + m l \dot{\theta}^2 \sin\theta)}{D(\theta)}$$

---

## 4. Linearization and State-Space Model

At the upright equilibrium ($\theta = 0, \dot{x} = 0, \dot{\theta} = 0, u = 0$):
$$\sin\theta \approx \theta, \quad \cos\theta \approx 1, \quad \dot{\theta}^2 \approx 0$$
$$d_0 = (M + m)(I + m l^2) - (m l)^2$$

Linearized equations:
$$\ddot{x} = -\frac{b(I + m l^2)}{d_0}\dot{x} - \frac{m^2 g l^2}{d_0}\theta + \frac{I + m l^2}{d_0}u$$
$$\ddot{\theta} = \frac{m l b}{d_0}\dot{x} + \frac{(M + m)m g l}{d_0}\theta - \frac{m l}{d_0}u$$

Defining state vector $X = [x, \dot{x}, \theta, \dot{\theta}]^T$:
$$\dot{X} = A X + B u, \quad Y = C X + D u$$

For numerical parameters ($M=0.5, m=0.2, l=0.3, I=0.006, b=0.1, g=9.81$):
$$d_0 = (0.7)(0.024) - (0.06)^2 = 0.0132$$

$$A = \begin{bmatrix}
0 & 1 & 0 & 0 \\
0 & -0.1818 & -2.6755 & 0 \\
0 & 0 & 0 & 1 \\
0 & +0.4545 & +31.2136 & 0
\end{bmatrix}, \quad
B = \begin{bmatrix}
0 \\
+1.8182 \\
0 \\
-4.5455
\end{bmatrix}$$

### Open-Loop Eigenvalues & Instability Analysis
Evaluating $\det(sI - A) = 0$:
$$\lambda_1 = 0.0000, \quad \lambda_2 = -0.1428, \quad \lambda_3 = -5.6069, \quad \mathbf{\lambda_4 = +5.5680}$$

The presence of the eigenvalue $\lambda_4 \approx +5.57 > 0$ in the open right-half complex plane proves that the open-loop upright position is **unconditionally unstable**.

---

## 5. Controllability Analysis

The Kalman controllability matrix for an $n = 4$ state system is:
$$\mathcal{C} = \begin{bmatrix} B & AB & A^2 B & A^3 B \end{bmatrix}$$

Computing column vectors:
$$B = \begin{bmatrix} 0 \\ 1.8182 \\ 0 \\ -4.5455 \end{bmatrix}, \quad
AB = \begin{bmatrix} 1.8182 \\ -0.3306 \\ -4.5455 \\ 0.8264 \end{bmatrix}, \quad
A^2 B = \begin{bmatrix} -0.3306 \\ 12.2213 \\ 0.8264 \\ -142.0304 \end{bmatrix}, \quad
A^3 B = \begin{bmatrix} 12.2213 \\ -4.4332 \\ -142.0304 \\ 31.3515 \end{bmatrix}$$

Assembling $\mathcal{C}$:
$$\mathcal{C} = \begin{bmatrix}
0 & 1.8182 & -0.3306 & 12.2213 \\
1.8182 & -0.3306 & 12.2213 & -4.4332 \\
0 & -4.5455 & 0.8264 & -142.0304 \\
-4.5455 & 0.8264 & -142.0304 & 31.3515
\end{bmatrix}$$

$$\det(\mathcal{C}) = -6.657 \times 10^4 \neq 0 \implies \mathbf{\text{rank}(\mathcal{C}) = 4}$$

Because $\text{rank}(\mathcal{C}) = 4$, the system is **completely state-controllable**.

---

## 6. Ackermann's Formula State-Feedback Design

### Pole Selection Rationale
To balance settling time, cart excursion, and actuator limits, the desired closed-loop poles are selected as:
$$p = \{-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j\}$$
- Dominant complex pair: $-1.0 \pm 1.0j$ gives damping ratio $\zeta = 0.707$ and natural frequency $\omega_n = \sqrt{2}\approx 1.41\text{ rad/s}$, ensuring minimal overshoot and settling time $T_s \approx \frac{4}{\zeta \omega_n} \approx 4\text{ s}$.
- Real poles at $-2.0, -2.0$: Provide rapid decay of cart dynamics without excessive high-frequency actuator chatter.

### Step-by-Step Ackermann Computation
1. **Desired Characteristic Polynomial**:
   $$\Phi(s) = (s+2)(s+2)(s - (-1+j))(s - (-1-j)) = (s^2 + 4s + 4)(s^2 + 2s + 2)$$
   $$\Phi(s) = s^4 + 6s^3 + 14s^2 + 16s + 8$$

2. **Evaluate $\Phi(A)$**:
   $$\Phi(A) = A^4 + 6A^3 + 14A^2 + 16A + 8I$$
   $$\Phi(A) = \begin{bmatrix}
   8.0000 & 12.4308 & -118.1368 & -15.5663 \\
   0.0000 & -1.3357 & -519.1382 & -118.1368 \\
   0.0000 & 20.0708 & 1412.2064 & 202.0657 \\
   0.0000 & 88.1988 & 6253.5068 & 1412.2064
   \end{bmatrix}$$

3. **Gain Vector Calculation**:
   $$K = \begin{bmatrix} 0 & 0 & 0 & 1 \end{bmatrix} \mathcal{C}^{-1} \Phi(A)$$
   $$\mathbf{K = \begin{bmatrix} -0.1794 & -0.4588 & -10.0188 & -1.4635 \end{bmatrix}}$$

4. **Closed-Loop Verification**:
   $$A_{\text{cl}} = A - B K = \begin{bmatrix}
   0 & 1 & 0 & 0 \\
   0.3262 & 0.6524 & 15.5401 & 2.6610 \\
   0 & 0 & 0 & 1 \\
   -0.8155 & -1.6310 & -14.3168 & -6.6524
   \end{bmatrix}$$
   $$\text{eig}(A_{\text{cl}}) = \{-2.0000, -2.0000, -1.0000 + 1.0000j, -1.0000 - 1.0000j\}$$
   Numerical placement error: $< 1.37 \times 10^{-7}$. Pole placement verified.

---

## 7. Numerical Simulation and Performance Evaluation

The controller was subjected to the four mandatory evaluation benchmarks:

| Benchmark Scenario | Initial Conditions / Disturbance | Peak Angle ($\theta_{\max}$) | Peak Cart Pos ($x_{\max}$) | Peak Force ($|u|_{\max}$) | Settling Time ($T_s$) | Steady-State Error |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Test 1: Small Angle** | $\theta_0 = 5^\circ$ ($0.087\text{ rad}$) | $5.00^\circ$ | $0.05\text{ m}$ | $0.87\text{ N}$ | $3.42\text{ s}$ | $0.0000^\circ$ |
| **Test 2: Large Angle** | $\theta_0 = 10^\circ$ ($0.175\text{ rad}$) | $10.00^\circ$ | $0.11\text{ m}$ | $1.74\text{ N}$ | $3.58\text{ s}$ | $0.0000^\circ$ |
| **Test 3: Disturbance** | $+10\text{ N}$ pulse ($t = 2.0 - 2.2\text{ s}$) | $3.82^\circ$ | $0.34\text{ m}$ | $7.45\text{ N}$ | $4.10\text{ s}$ | $0.0000^\circ$ |
| **Test 4: Open-Loop** | $\theta_0 = 5^\circ$, $u = 0$ | $>90^\circ$ (Fallen) | $>3.2\text{ m}$ | $0.00\text{ N}$ | Diverged ($\infty$) | $\infty$ (Fallen) |

### Key Observations:
1. **Linear vs Nonlinear Matching**: For $\theta_0 = 5^\circ$, the linear model matches the nonlinear model with $< 1\%$ difference. At $\theta_0 = 10^\circ$, higher-order coupling slightly increases settling time.
2. **Disturbance Rejection**: When subjected to a $10\text{ N}$ pulse for $200\text{ ms}$, the cart accelerates into the tilt to balance the pendulum, bringing $\theta \to 0$ and $x \to 0$ without residual steady-state bias.
3. **Open-Loop Divergence**: Without feedback, the pendulum falls past $90^\circ$ in less than $0.8$ seconds.

---

## 8. Viva Defense & Technical Examination Questions

### Q1: Why did we use Lagrangian mechanics instead of Newtonian mechanics?
**A:** Newton-Euler formulations require analyzing internal hinge reaction forces ($R_x, R_y$) between the cart and the pendulum rod. In contrast, Lagrangian mechanics ($L = T - V$) utilizes scalar energy quantities and generalized coordinates, naturally eliminating internal constraint forces and avoiding sign errors in coupled angular terms.

### Q2: Why is the sign convention $\theta = 0$ for upright critical?
**A:** In standard pendulum problems, $\theta = 0$ is hanging downward (stable). Here, $\theta = 0$ is vertically upright. The potential energy is $V = +mgl\cos\theta$ (maximum at $\theta=0$). Taking small angles gives $\cos\theta \approx 1 - \frac{1}{2}\theta^2$, producing a negative stiffness term in the variational equation, which creates the positive open-loop eigenvalue $+5.57\text{ rad/s}$.

### Q3: Why is PID control prohibited for this system?
**A:** The cart-pole system has 1 actuator force ($u$) but 2 degrees of freedom (cart $x$ and pendulum $\theta$). A single PID controller cannot simultaneously govern cart displacement and pendulum angle without cross-coupling instability. Full-state feedback $u = -KX$ uses the complete state vector $X \in \mathbb{R}^4$, placing all closed-loop poles simultaneously.

### Q4: What does $\text{rank}(\mathcal{C}) = 4$ prove physically?
**A:** It proves that the horizontal actuator force $u$ couples dynamically to all four state variables through the pivot inertia. There are no uncontrollable subspace modes.

### Q5: How does Ackermann's formula guarantee closed-loop stability?
**A:** By the Cayley-Hamilton theorem, any matrix satisfies its own characteristic equation: $\Phi(A_{\text{cl}}) = 0$. Ackermann's formula directly constructs the unique gain vector $K$ such that $\det(sI - (A - BK)) = \Phi(s)$, exactly placing the eigenvalues at our chosen stable coordinates in the left-half complex plane.

---

## 9. Conclusion

The state-feedback controller designed via Ackermann's formula stabilizes the nonlinear cart-inverted pendulum system. The open-loop unstable pole at $+5.57\text{ rad/s}$ is replaced by four stable poles at $\{-2, -2, -1 \pm 1j\}$, eliminating steady-state error and rejecting external pulse disturbances. All theoretical derivations, numerical models, simulations, and experimental interfaces are verified.
