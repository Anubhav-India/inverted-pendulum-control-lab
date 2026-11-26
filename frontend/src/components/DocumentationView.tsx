import React, { useState } from 'react';
import { BookOpen, HelpCircle, FileText, ChevronDown, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { MathView } from './MathView';

export const DocumentationView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'viva' | 'derivation' | 'code'>('viva');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const vivaQuestions = [
    {
      q: "1. Why is PID control strictly prohibited for this system?",
      a: "The cart-inverted pendulum is an underactuated 4th-order multi-variable system (4 state variables: cart position, cart velocity, pendulum angle, and angular velocity) governed by a single scalar actuator force u. Classical single-input single-output (SISO) PID control cannot simultaneously regulate cart translation and pendulum tilt without unstable cross-coupling. Full-state feedback u = -Kx in modern state-space theory directly places all 4 closed-loop poles simultaneously, guaranteeing multi-variable stability and zero steady-state error."
    },
    {
      q: "2. Why was Lagrangian mechanics chosen over Newtonian mechanics?",
      a: "Newton-Euler formulations require determining internal reaction forces (Rx, Ry) at the hinge joint connecting the cart to the pendulum rod. In contrast, Lagrangian mechanics (L = T - V) uses scalar kinetic and potential energies, naturally eliminating internal constraint forces via generalized coordinates q = [x, θ]ᵀ and avoiding sign errors in coupled nonlinear terms."
    },
    {
      q: "3. What does rank(𝒞) = 4 prove physically?",
      a: "By the Kalman Controllability Criterion, rank(𝒞) = 4 proves that the control force u couples dynamically to all four state variables through the pivot inertia. There are no uncontrollable subspace modes; the actuator has sufficient control authority to steer all states from any initial condition back to origin."
    },
    {
      q: "4. How does Ackermann's formula guarantee pole placement?",
      a: "By the Cayley-Hamilton theorem, a square matrix satisfies its own characteristic equation: Φ(A_cl) = 0. Ackermann's formula K = [0 0 0 1] 𝒞⁻¹ Φ(A) directly constructs the unique gain vector such that det(sI - (A - BK)) matches our chosen characteristic polynomial Φ(s) exactly."
    },
    {
      q: "5. Why did we define θ = 0 as vertically upright rather than hanging downward?",
      a: "In pendulum robotics and aerospace rocketry (thrust vectoring), the upright configuration is the unstable target equilibrium. Defining θ = 0 at vertical upright makes the linearized state vector X = [x, ẋ, θ, θ̇]ᵀ directly measure deviation from the desired setpoint, allowing the linear regulator u = -Kx to drive X → 0."
    },
    {
      q: "6. Why does the open-loop system exhibit an eigenvalue at +5.57 rad/s?",
      a: "Because the pendulum center-of-mass is located above the pivot in the inverted configuration, the gravitational moment mgl·sin(θ) acts as a negative restoring torque (anti-stiffness). In the open-loop state matrix A, this generates the positive real eigenvalue λ = +√( (M+m)mgl / d0 ) ≈ +5.57 rad/s, causing exponential divergence without active feedback."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#3B82F6]" />
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]">Engineering Documentation & Academic Defense</h3>
            <p className="text-xs text-[#64748B]">Complete theoretical formulations and viva examination reference</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'viva', label: 'Viva Defense Q&A' },
            { id: 'derivation', label: 'Lagrangian Proof' },
            { id: 'code', label: 'MATLAB / Simulink' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === tab.id
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Viva Defense Q&A */}
      {activeSubTab === 'viva' && (
        <div className="space-y-3">
          {vivaQuestions.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors"
                >
                  <span className="font-semibold text-xs text-[#1E293B]">{item.q}</span>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                </button>
                {isOpen && (
                  <div className="p-4 text-xs text-[#475569] leading-relaxed border-t border-[#E2E8F0] bg-white">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Lagrangian Proof Walkthrough */}
      {activeSubTab === 'derivation' && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4 text-xs text-[#1E293B]">
          <h4 className="font-bold text-sm text-[#1E293B] border-b border-[#E2E8F0] pb-2">
            Analytical Derivation via Lagrangian Mechanics
          </h4>
          <p className="text-[#64748B]">
            Let generalized coordinates be <MathView math="q = [x, \theta]^T" />. Cart at <MathView math="(x, 0)" />. Pendulum center-of-mass at:
          </p>
          <MathView block math="x_p = x + l\sin\theta, \quad y_p = l\cos\theta" />
          <MathView block math="\dot{x}_p = \dot{x} + l\dot{\theta}\cos\theta, \quad \dot{y}_p = -l\dot{\theta}\sin\theta" />
          <MathView block math="T = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x}\dot{\theta}\cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2" />
          <MathView block math="V = m g l \cos\theta" />
          <MathView block math="L = T - V = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x}\dot{\theta}\cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2 - m g l \cos\theta" />

          <span className="font-semibold text-xs text-[#3B82F6] block mt-3">Euler-Lagrange Equation:</span>
          <MathView block math="\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}_i}\right) - \frac{\partial L}{\partial q_i} = Q_i" />
          <p className="text-[#64748B]">
            For coordinate x (<MathView math="Q_x = u - b\dot{x}" />):
          </p>
          <MathView block math="(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} = u - b\dot{x} + m l \dot{\theta}^2\sin\theta" />
          <p className="text-[#64748B]">
            For coordinate θ (<MathView math="Q_\theta = 0" />):
          </p>
          <MathView block math="m l \cos\theta \, \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \sin\theta" />
        </div>
      )}

      {/* Tab 3: MATLAB & Simulink */}
      {activeSubTab === 'code' && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4 text-xs text-[#1E293B]">
          <h4 className="font-bold text-sm text-[#1E293B] border-b border-[#E2E8F0] pb-2">
            MATLAB Codebase & Simulink Subsystem Structure
          </h4>
          <p className="text-[#64748B]">
            All scripts are available in <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#3B82F6]">matlab/</code> and <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-[#3B82F6]">simulink/</code>:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[#475569]">
            <li><span className="font-bold text-[#1E293B]">main.m:</span> Master workflow executing parameters, linearization, controllability, Ackermann synthesis, ode45 simulation, and plotting.</li>
            <li><span className="font-bold text-[#1E293B]">ackermann_controller.m:</span> Implements <MathView math="K = e_n^T \mathcal{C}^{-1} \Phi(A)" /> manually from matrix polynomials.</li>
            <li><span className="font-bold text-[#1E293B]">nonlinear_model.m:</span> Computes exact coupled nonlinear equations for ode45 integration.</li>
            <li><span className="font-bold text-[#1E293B]">simulink/setup_simulink.m:</span> Prepares base workspace variables and parameters for Simulink models.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
