# Inverted Pendulum Mathematical Formulation & Equation Reference

## 1. Generalized Coordinates and Kinematics

Let the generalized coordinates be:
$$q = \begin{bmatrix} x \\ \theta \end{bmatrix}$$

- $x$: Horizontal displacement of the cart along the track ($x = 0$ is origin).
- $\theta$: Angular displacement of the inverted pendulum from the vertically upright equilibrium ($\theta = 0$ is vertical upright).
- $M$: Mass of the cart ($0.5\text{ kg}$).
- $m$: Mass of the pendulum bob/rod ($0.2\text{ kg}$).
- $l$: Distance from pivot to pendulum center of mass ($0.3\text{ m}$).
- $I$: Mass moment of inertia of the pendulum about its own center of mass ($0.006\text{ kg}\cdot\text{m}^2$).
- $b$: Cart viscous friction coefficient ($0.1\text{ N}\cdot\text{s/m}$).
- $g$: Gravitational acceleration ($9.81\text{ m/s}^2$).
- $u$: Horizontal actuator force applied to the cart ($N$).

### Center-of-Mass Coordinates:
$$\begin{aligned}
x_p &= x + l \sin\theta \\
y_p &= l \cos\theta
\end{aligned}$$

### Velocity Coordinates:
$$\begin{aligned}
\dot{x}_p &= \dot{x} + l \dot{\theta} \cos\theta \\
\dot{y}_p &= -l \dot{\theta} \sin\theta
\end{aligned}$$

Square of velocity magnitude:
$$\begin{aligned}
v_p^2 &= \dot{x}_p^2 + \dot{y}_p^2 = (\dot{x} + l \dot{\theta} \cos\theta)^2 + (-l \dot{\theta} \sin\theta)^2 \\
&= \dot{x}^2 + 2 l \dot{x} \dot{\theta} \cos\theta + l^2 \dot{\theta}^2 (\cos^2\theta + \sin^2\theta) \\
&= \dot{x}^2 + 2 l \dot{x} \dot{\theta} \cos\theta + l^2 \dot{\theta}^2
\end{aligned}$$

---

## 2. Lagrangian Mechanics Derivation

### Total Kinetic Energy ($T$):
$$T = T_{\text{cart}} + T_{\text{pendulum}}$$
$$T_{\text{cart}} = \frac{1}{2} M \dot{x}^2$$
$$T_{\text{pendulum}} = \frac{1}{2} m v_p^2 + \frac{1}{2} I \dot{\theta}^2 = \frac{1}{2} m (\dot{x}^2 + 2 l \dot{x} \dot{\theta} \cos\theta + l^2 \dot{\theta}^2) + \frac{1}{2} I \dot{\theta}^2$$

Combining terms:
$$T = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2$$

### Potential Energy ($V$):
Choosing the horizontal cart pivot axis ($y = 0$) as reference datum:
$$V = m g y_p = m g l \cos\theta$$

### Lagrangian Function ($L = T - V$):
$$L = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2 - m g l \cos\theta$$

---

## 3. Euler-Lagrange Equations of Motion

$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}_i}\right) - \frac{\partial L}{\partial q_i} = Q_i$$

### Equation for Coordinate $x$ ($Q_x = u - b\dot{x}$):
$$\frac{\partial L}{\partial \dot{x}} = (M + m)\dot{x} + m l \dot{\theta} \cos\theta$$
$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{x}}\right) = (M + m)\ddot{x} + m l \ddot{\theta} \cos\theta - m l \dot{\theta}^2 \sin\theta$$
$$\frac{\partial L}{\partial x} = 0$$

Equating to generalized force:
$$(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} - m l \dot{\theta}^2 \sin\theta = u - b\dot{x}$$
$$\mathbf{(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} = u - b\dot{x} + m l \dot{\theta}^2 \sin\theta} \quad \text{--- (Eq. 1)}$$

### Equation for Coordinate $\theta$ ($Q_\theta = 0$):
$$\frac{\partial L}{\partial \dot{\theta}} = m l \dot{x} \cos\theta + (I + m l^2)\dot{\theta}$$
$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{\theta}}\right) = m l \ddot{x} \cos\theta - m l \dot{x}\dot{\theta}\sin\theta + (I + m l^2)\ddot{\theta}$$
$$\frac{\partial L}{\partial \theta} = -m l \dot{x}\dot{\theta}\sin\theta + m g l \sin\theta$$

Applying Euler-Lagrange:
$$\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{\theta}}\right) - \frac{\partial L}{\partial \theta} = m l \ddot{x} \cos\theta + (I + m l^2)\ddot{\theta} - m g l \sin\theta = 0$$
$$\mathbf{m l \cos\theta \, \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \sin\theta} \quad \text{--- (Eq. 2)}$$

---

## 4. Matrix Formulation and Decoupled Accelerations

In matrix form:
$$\begin{bmatrix} M + m & m l \cos\theta \\ m l \cos\theta & I + m l^2 \end{bmatrix} \begin{bmatrix} \ddot{x} \\ \ddot{\theta} \end{bmatrix} = \begin{bmatrix} u - b\dot{x} + m l \dot{\theta}^2 \sin\theta \\ m g l \sin\theta \end{bmatrix}$$

Determinant of the mass-inertia matrix:
$$D(\theta) = (M + m)(I + m l^2) - (m l \cos\theta)^2$$

Using Cramer's Rule, the explicit decoupled accelerations are:
$$\ddot{x} = \frac{(I + m l^2)\left(u - b\dot{x} + m l \dot{\theta}^2 \sin\theta\right) - m l \cos\theta (m g l \sin\theta)}{D(\theta)}$$
$$\ddot{\theta} = \frac{(M + m)(m g l \sin\theta) - m l \cos\theta \left(u - b\dot{x} + m l \dot{\theta}^2 \sin\theta\right)}{D(\theta)}$$

---

## 5. Linearization Around Upright Equilibrium

Operating point: $x_e = 0$, $\dot{x}_e = 0$, $\theta_e = 0$, $\dot{\theta}_e = 0$, $u_e = 0$.

Small angle approximations:
$$\sin\theta \approx \theta, \quad \cos\theta \approx 1, \quad \dot{\theta}^2 \approx 0$$
$$d_0 = D(0) = (M + m)(I + m l^2) - (m l)^2$$

Linearized equations:
$$(M + m)\ddot{x} + m l \ddot{\theta} = u - b\dot{x}$$
$$m l \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \theta$$

Solving for accelerations:
$$\ddot{x} = -\frac{b(I + m l^2)}{d_0}\dot{x} - \frac{m^2 g l^2}{d_0}\theta + \frac{I + m l^2}{d_0}u$$
$$\ddot{\theta} = \frac{m l b}{d_0}\dot{x} + \frac{(M + m)m g l}{d_0}\theta - \frac{m l}{d_0}u$$

---

## 6. Continuous-Time State-Space Representation

State vector:
$$X = \begin{bmatrix} x_1 \\ x_2 \\ x_3 \\ x_4 \end{bmatrix} = \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix}, \quad u = \text{actuator force}$$

$$\dot{X} = A X + B u, \quad Y = C X + D u$$

$$A = \begin{bmatrix}
0 & 1 & 0 & 0 \\
0 & -\frac{b(I + m l^2)}{d_0} & -\frac{m^2 g l^2}{d_0} & 0 \\
0 & 0 & 0 & 1 \\
0 & \frac{m l b}{d_0} & \frac{(M + m)m g l}{d_0} & 0
\end{bmatrix}, \quad
B = \begin{bmatrix}
0 \\
\frac{I + m l^2}{d_0} \\
0 \\
-\frac{m l}{d_0}
\end{bmatrix}$$

$$C = \begin{bmatrix}
1 & 0 & 0 & 0 \\
0 & 0 & 1 & 0
\end{bmatrix}, \quad
D = \begin{bmatrix} 0 \\ 0 \end{bmatrix}$$

---

## 7. Numerical State-Space Values (Default Parameters)

For $M = 0.5\text{ kg}, m = 0.2\text{ kg}, l = 0.3\text{ m}, I = 0.006\text{ kg}\cdot\text{m}^2, b = 0.1\text{ N}\cdot\text{s/m}, g = 9.81\text{ m/s}^2$:
$$I + m l^2 = 0.006 + 0.2(0.3^2) = 0.024\text{ kg}\cdot\text{m}^2$$
$$M + m = 0.7\text{ kg}, \quad m l = 0.06\text{ kg}\cdot\text{m}$$
$$d_0 = (0.7)(0.024) - (0.06)^2 = 0.0168 - 0.0036 = 0.0132$$

$$A = \begin{bmatrix}
0 & 1 & 0 & 0 \\
0 & -0.1818 & -2.6755 & 0 \\
0 & 0 & 0 & 1 \\
0 & +0.4545 & +31.2136 & 0
\end{bmatrix}, \quad
B = \begin{bmatrix}
0 \\
1.8182 \\
0 \\
-4.5455
\end{bmatrix}$$

Open-loop eigenvalues:
$$\lambda_1 = 0, \quad \lambda_2 = -0.1428, \quad \lambda_3 = -5.6069, \quad \mathbf{\lambda_4 = +5.5680}$$

> The positive eigenvalue ($\lambda_4 \approx +5.57$) proves the open-loop upright equilibrium is **unstable**.

---

## 8. Controllability Matrix

$$\mathcal{C} = \begin{bmatrix} B & AB & A^2 B & A^3 B \end{bmatrix}$$
$$\text{rank}(\mathcal{C}) = 4, \quad \det(\mathcal{C}) \neq 0$$

Satisfies Kalman rank condition $\implies$ The system is **completely state-controllable**.

---

## 9. Controller Design via Ackermann's Formula

Control law:
$$u = -K X = -\begin{bmatrix} k_1 & k_2 & k_3 & k_4 \end{bmatrix} \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix}$$

Selected closed-loop poles:
$$p = \{-2.0, -2.0, -1.0 + 1.0j, -1.0 - 1.0j\}$$

Desired characteristic polynomial:
$$\Phi(s) = (s+2)^2(s^2 + 2s + 2) = s^4 + 6s^3 + 14s^2 + 16s + 8$$

Evaluate $\Phi(A)$:
$$\Phi(A) = A^4 + 6A^3 + 14A^2 + 16A + 8I$$

Ackermann's gain formula:
$$K = \begin{bmatrix} 0 & 0 & 0 & 1 \end{bmatrix} \mathcal{C}^{-1} \Phi(A)$$

Calculated gain vector:
$$K = \begin{bmatrix} -0.1794 & -0.4588 & -10.0188 & -1.4635 \end{bmatrix}$$

Closed-loop matrix:
$$A_{\text{cl}} = A - B K$$

Eigenvalues of $A_{\text{cl}}$:
$$\lambda(A_{\text{cl}}) = \{-2.0, -2.0, -1.0 \pm 1.0j\}$$
Matches desired poles exactly within numerical precision ($< 10^{-7}$).
