import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Calculator,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { PhysicalParameters, ComplexNumber } from '../types';
import { MathView } from './MathView';
import {
  computeNonlinearAccelerations,
  computeLinearModel,
  computeControllability,
  computeAckermann
} from '../services/mathEngine';

interface DerivationSolverProps {
  params: PhysicalParameters;
  desiredPoles: ComplexNumber[];
  onUpdatePoles: (poles: ComplexNumber[]) => void;
  onApplyGainToSim: (K: number[]) => void;
}

export const DerivationSolver: React.FC<DerivationSolverProps> = ({
  params,
  desiredPoles,
  onUpdatePoles,
  onApplyGainToSim
}) => {
  const [activeStage, setActiveStage] = useState<number>(1);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    lagrangian: true,
    intermediateSub: true,
    solvedAcc: true,
    linearizationSteps: true,
    matrices: true,
    controllabilityCols: true,
    matrixPowers: false,
    ackermannSteps: true,
  });

  // Stage 1 Interactive Test Inputs
  const [testState, setTestState] = useState({
    x: 0.0,
    x_dot: 0.0,
    theta_deg: 5.0,
    theta_dot: 0.0,
    u: 0.0
  });

  const [testOutput, setTestOutput] = useState<{ x_ddot: number; theta_ddot: number; D_val: number } | null>(null);

  // Stage 3 Editable Desired Poles
  const [localPoles, setLocalPoles] = useState<ComplexNumber[]>([ ...desiredPoles ]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Compute dynamic models
  const linearModel = computeLinearModel(params);
  const controllability = computeControllability(linearModel.A, linearModel.B);
  const ackermann = computeAckermann(linearModel.A, linearModel.B, desiredPoles);

  // Compute substituted constants for Stage 1
  const M_tot = params.M + params.m;
  const ml = params.m * params.l;
  const I_pivot = params.I + params.m * params.l * params.l;
  const mgl = params.m * params.g * params.l;
  const det_const = M_tot * I_pivot;
  const ml_sq = ml * ml;

  const handleCalculateNonlinear = () => {
    const th_rad = testState.theta_deg * (Math.PI / 180);
    const res = computeNonlinearAccelerations(
      params,
      testState.x,
      testState.x_dot,
      th_rad,
      testState.theta_dot,
      testState.u
    );
    setTestOutput(res);
  };

  const handleUpdatePolesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePoles(localPoles);
  };

  return (
    <div className="space-y-6">
      {/* Header and Stage Switcher */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#DBEAFE] text-[#3B82F6]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E293B]">
                Interactive Mathematical Derivation & Equation Solver
              </h2>
              <p className="text-xs text-[#64748B]">
                Authoritative multi-stage symbolic derivation, live numerical substitution, and state-feedback controller synthesis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30">
              Live Synchronized
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
              Zero PID
            </span>
          </div>
        </div>

        {/* Stage Progress Bar / Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { stage: 1, title: 'Stage 1: Nonlinear Modeling', subtitle: 'Lagrangian & Couplings' },
            { stage: 2, title: 'Stage 2: Linearization', subtitle: 'State Space [A, B, C, D]' },
            { stage: 3, title: 'Stage 3: Ackermann Design', subtitle: 'Kalman Rank & u = -Kx' },
            { stage: 4, title: 'Stage 4: Live Synchronization', subtitle: 'Full Engine Pipeline' }
          ].map((item) => (
            <button
              key={item.stage}
              onClick={() => setActiveStage(item.stage)}
              className={`p-3 rounded-lg border text-left transition-all ${
                activeStage === item.stage
                  ? 'bg-[#DBEAFE]/40 border-[#3B82F6] shadow-sm'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activeStage === item.stage ? 'text-[#3B82F6]' : 'text-[#1E293B]'}`}>
                  {item.title}
                </span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeStage === item.stage ? 'bg-[#3B82F6] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                }`}>
                  {item.stage}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{item.subtitle}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: NONLINEAR EQUATION DERIVATION AND NUMERICAL ACCELERATION SOLVER  */}
      {/* ========================================================================= */}
      {activeStage === 1 && (
        <div className="space-y-5">
          {/* Section A: Symbolic Lagrangian Mechanics */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('lagrangian')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['lagrangian'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">1A. Symbolic Lagrangian Mechanics Derivation</span>
              </div>
              <span className="text-xs text-[#64748B]">Coordinates, Energies, and Euler-Lagrange</span>
            </button>

            {expandedSections['lagrangian'] && (
              <div className="p-5 space-y-4 text-xs text-[#1E293B]">
                <p className="text-[#64748B]">
                  Choosing generalized coordinates <MathView math="q = [x, \theta]^T" /> where <MathView math="\theta = 0" /> corresponds to the vertically upright equilibrium position:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                    <span className="font-semibold text-[#3B82F6] block mb-1">Pendulum Center-of-Mass Coordinates:</span>
                    <MathView block math="x_p = x + l \sin\theta, \quad y_p = l \cos\theta" />
                    <MathView block math="\dot{x}_p = \dot{x} + l \dot{\theta} \cos\theta, \quad \dot{y}_p = -l \dot{\theta} \sin\theta" />
                    <MathView block math="v_p^2 = \dot{x}_p^2 + \dot{y}_p^2 = \dot{x}^2 + 2 l \dot{x} \dot{\theta} \cos\theta + l^2 \dot{\theta}^2" />
                  </div>

                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                    <span className="font-semibold text-[#3B82F6] block mb-1">System Kinetic & Potential Energies:</span>
                    <MathView block math="T = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2" />
                    <MathView block math="V = m g y_p = m g l \cos\theta \quad (\text{Datum: cart axis } y=0)" />
                    <span className="font-semibold text-[#16A34A] block mt-2">Lagrangian Function L = T - V:</span>
                    <MathView block math="L = \frac{1}{2}(M + m)\dot{x}^2 + m l \dot{x} \dot{\theta} \cos\theta + \frac{1}{2}(I + m l^2)\dot{\theta}^2 - m g l \cos\theta" />
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="font-semibold text-[#1E293B] block mb-1">Euler-Lagrange Equations: <MathView math="\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{q}_i}\right) - \frac{\partial L}{\partial q_i} = Q_i" /></span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <div>
                      <span className="text-[11px] font-semibold text-[#64748B]">Cart Coordinate (x) with Actuator Force u and Friction b:</span>
                      <MathView block math="(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} - m l \dot{\theta}^2 \sin\theta = u - b\dot{x}" />
                      <MathView block math="\mathbf{(M + m)\ddot{x} + m l \cos\theta \, \ddot{\theta} = u - b\dot{x} + m l \dot{\theta}^2 \sin\theta}" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-[#64748B]">Pendulum Coordinate (θ):</span>
                      <MathView block math="m l \ddot{x} \cos\theta + (I + m l^2)\ddot{\theta} - m g l \sin\theta = 0" />
                      <MathView block math="\mathbf{m l \cos\theta \, \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \sin\theta}" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Numerical Parameter Substitution */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('intermediateSub')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['intermediateSub'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">1B. Parameter Substitution Process</span>
              </div>
              <span className="text-xs text-[#64748B]">Intermediate Constants from Selected Parameters</span>
            </button>

            {expandedSections['intermediateSub'] && (
              <div className="p-5 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] font-mono text-[11px]">
                  <div>M + m = <span className="font-bold text-[#3B82F6]">{M_tot.toFixed(2)} kg</span></div>
                  <div>ml = <span className="font-bold text-[#3B82F6]">{ml.toFixed(3)} kg·m</span></div>
                  <div>I + ml² = <span className="font-bold text-[#3B82F6]">{I_pivot.toFixed(4)} kg·m²</span></div>
                  <div>mgl = <span className="font-bold text-[#3B82F6]">{mgl.toFixed(4)} N·m</span></div>
                </div>

                <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="font-semibold text-[#1E293B] block mb-1">Substituted Coupled Equations of Motion:</span>
                  <MathView block math={`${M_tot.toFixed(2)}\\ddot{x} + ${ml.toFixed(2)}\\cos\\theta \\, \\ddot{\\theta} = u - ${params.b.toFixed(2)}\\dot{x} + ${ml.toFixed(2)}\\dot{\\theta}^2\\sin\\theta`} />
                  <MathView block math={`${ml.toFixed(2)}\\cos\\theta \\, \\ddot{x} + ${I_pivot.toFixed(4)}\\ddot{\\theta} = ${mgl.toFixed(4)}\\sin\\theta`} />
                  <span className="font-semibold text-[#64748B] block mt-2">Coupled Determinant Denominator:</span>
                  <MathView block math={`D(\\theta) = (${M_tot.toFixed(2)})(${I_pivot.toFixed(4)}) - (${ml.toFixed(2)}\\cos\\theta)^2 = ${det_const.toFixed(6)} - ${ml_sq.toFixed(6)}\\cos^2\\theta`} />
                </div>
              </div>
            )}
          </div>

          {/* Section C: Decoupled Accelerations & Interactive Calculator */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('solvedAcc')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['solvedAcc'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">1C. Solved Acceleration Equations & Interactive Evaluator</span>
              </div>
              <span className="text-xs text-[#64748B]">Solve for ẍ and θ̈ with Custom State Inputs</span>
            </button>

            {expandedSections['solvedAcc'] && (
              <div className="p-5 space-y-4 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="font-semibold text-[#3B82F6] block mb-1">Decoupled Analytic Acceleration Formulas:</span>
                  <MathView block math={`\\ddot{x} = \\frac{${I_pivot.toFixed(4)}\\left(u - ${params.b.toFixed(2)}\\dot{x} + ${ml.toFixed(2)}\\dot{\\theta}^2\\sin\\theta\\right) - ${ml.toFixed(2)}\\cos\\theta (${mgl.toFixed(4)}\\sin\\theta)}{${det_const.toFixed(6)} - ${ml_sq.toFixed(6)}\\cos^2\\theta}`} />
                  <MathView block math={`\\ddot{\\theta} = \\frac{${M_tot.toFixed(2)}(${mgl.toFixed(4)}\\sin\\theta) - ${ml.toFixed(2)}\\cos\\theta \\left(u - ${params.b.toFixed(2)}\\dot{x} + ${ml.toFixed(2)}\\dot{\\theta}^2\\sin\\theta\\right)}{${det_const.toFixed(6)} - ${ml_sq.toFixed(6)}\\cos^2\\theta}`} />
                </div>

                {/* Interactive Test Inputs */}
                <div className="border border-[#CBD5E1] rounded-lg p-4 bg-[#FFFFFF]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-xs text-[#1E293B]">Live Nonlinear State Evaluator</span>
                    <span className="text-[11px] text-[#64748B]">Enter test state values to calculate accelerations</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Cart Pos x (m)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={testState.x}
                        onChange={(e) => setTestState({ ...testState, x: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Cart Vel ẋ (m/s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={testState.x_dot}
                        onChange={(e) => setTestState({ ...testState, x_dot: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Angle θ (deg)</label>
                      <input
                        type="number"
                        step="1.0"
                        value={testState.theta_deg}
                        onChange={(e) => setTestState({ ...testState, theta_deg: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Ang Vel θ̇ (rad/s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={testState.theta_dot}
                        onChange={(e) => setTestState({ ...testState, theta_dot: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] mb-1">Force u (N)</label>
                      <input
                        type="number"
                        step="1.0"
                        value={testState.u}
                        onChange={(e) => setTestState({ ...testState, u: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleCalculateNonlinear}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Calculate Nonlinear Equations
                    </button>

                    {testOutput && (
                      <div className="flex items-center gap-4 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg font-mono text-xs">
                        <div>
                          <span className="text-[#64748B]">ẍ = </span>
                          <span className="font-bold text-[#3B82F6]">{testOutput.x_ddot.toFixed(4)} m/s²</span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">θ̈ = </span>
                          <span className="font-bold text-[#F97316]">{testOutput.theta_ddot.toFixed(4)} rad/s² ({(testOutput.theta_ddot * 180 / Math.PI).toFixed(2)}°/s²)</span>
                        </div>
                        <div>
                          <span className="text-[#64748B]">D(θ) = </span>
                          <span className="text-[#1E293B]">{testOutput.D_val.toFixed(6)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: LINEARIZATION & CONTINUOUS-TIME STATE-SPACE EQUATIONS            */}
      {/* ========================================================================= */}
      {activeStage === 2 && (
        <div className="space-y-5">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('linearizationSteps')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['linearizationSteps'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">2A. Small-Angle Approximations & Equilibrium Expansion</span>
              </div>
              <span className="text-xs text-[#64748B]">θ = 0 Operating Point</span>
            </button>

            {expandedSections['linearizationSteps'] && (
              <div className="p-5 space-y-3 text-xs text-[#1E293B]">
                <p className="text-[#64748B]">
                  Linearizing around the vertical upright equilibrium position <MathView math="X_e = [0, 0, 0, 0]^T" /> where <MathView math="\theta = 0, \dot{x} = 0, \dot{\theta} = 0, u = 0" />:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <div className="text-center">
                    <span className="font-semibold text-[#3B82F6] block mb-1">Sine Approximation</span>
                    <MathView block math="\sin\theta \approx \theta" />
                  </div>
                  <div className="text-center">
                    <span className="font-semibold text-[#3B82F6] block mb-1">Cosine Approximation</span>
                    <MathView block math="\cos\theta \approx 1, \quad \cos^2\theta \approx 1" />
                  </div>
                  <div className="text-center">
                    <span className="font-semibold text-[#3B82F6] block mb-1">Higher-Order Terms</span>
                    <MathView block math="\dot{\theta}^2 \approx 0, \quad \dot{\theta}^2\sin\theta \approx 0" />
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="font-semibold text-[#1E293B] block mb-1">Resulting Linearized Differential Equations:</span>
                  <MathView block math="(M + m)\ddot{x} + m l \ddot{\theta} = u - b\dot{x}" />
                  <MathView block math="m l \ddot{x} + (I + m l^2)\ddot{\theta} = m g l \theta" />
                  <span className="text-[#64748B] block mt-2 text-[11px]">
                    Solving simultaneously with determinant <MathView math="d_0 = (M+m)(I+ml^2) - (ml)^2" />:
                  </span>
                  <MathView block math="\ddot{x} = -\frac{b(I+ml^2)}{d_0}\dot{x} - \frac{m^2 g l^2}{d_0}\theta + \frac{I+ml^2}{d_0}u" />
                  <MathView block math="\ddot{\theta} = \frac{mlb}{d_0}\dot{x} + \frac{(M+m)mgl}{d_0}\theta - \frac{ml}{d_0}u" />
                </div>
              </div>
            )}
          </div>

          {/* Section B: State-Space Representation and Matrices */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('matrices')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['matrices'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">2B. Dynamically Computed State-Space Matrices [A, B, C, D]</span>
              </div>
              <span className="text-xs text-[#64748B]">Ẋ = AX + Bu, Y = CX + Du</span>
            </button>

            {expandedSections['matrices'] && (
              <div className="p-5 space-y-4 text-xs">
                <p className="text-[#64748B]">
                  State vector: <MathView math="X = [x_1, x_2, x_3, x_4]^T = [x, \dot{x}, \theta, \dot{\theta}]^T" />, Control input: <MathView math="u" /> (horizontal force).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matrix A */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#3B82F6]">System Matrix A (4×4)</span>
                      <span className="text-[10px] text-[#64748B]">System Internal Dynamics</span>
                    </div>
                    <MathView block math={`A = ${linearModel.A_latex}`} />
                  </div>

                  {/* Matrix B */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#3B82F6]">Input Matrix B (4×1)</span>
                      <span className="text-[10px] text-[#64748B]">Actuator Control Authority</span>
                    </div>
                    <MathView block math={`B = ${linearModel.B_latex}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Matrix C */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#1E293B]">Output Matrix C (2×4)</span>
                      <span className="text-[10px] text-[#64748B]">Measured Outputs [x, θ]</span>
                    </div>
                    <MathView block math={`C = ${linearModel.C_latex}`} />
                  </div>

                  {/* Matrix D */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#1E293B]">Feedthrough Matrix D (2×1)</span>
                      <span className="text-[10px] text-[#64748B]">Direct Transmission</span>
                    </div>
                    <MathView block math={`D = ${linearModel.D_latex}`} />
                  </div>
                </div>

                {/* Open-Loop Eigenvalues & Physical Instability Analysis */}
                <div className="bg-[#FEF2F2] border border-[#F87171]/40 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-[#DC2626]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-bold text-xs">Open-Loop Eigenvalues & Physical Instability Proof</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {linearModel.open_loop_eigenvalues.map((ev, i) => (
                      <span
                        key={i}
                        className={`font-mono text-xs px-2.5 py-1 rounded border ${
                          ev.real > 0.001
                            ? 'bg-[#DC2626] text-white border-[#DC2626] font-bold'
                            : 'bg-white text-[#1E293B] border-[#CBD5E1]'
                        }`}
                      >
                        λ_{i + 1} = {ev.formatted}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#991B1B] leading-relaxed">
                    {linearModel.unstable_explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: CONTROLLABILITY & ACKERMANN'S FORMULA CONTROLLER DESIGN          */}
      {/* ========================================================================= */}
      {activeStage === 3 && (
        <div className="space-y-5">
          {/* Section A: Kalman Controllability Analysis */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('controllabilityCols')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['controllabilityCols'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">3A. Kalman Controllability Matrix & Rank Proof</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] rounded border border-[#16A34A]/30">
                  Rank {controllability.rank}/4: FULLY CONTROLLABLE
                </span>
              </div>
            </button>

            {expandedSections['controllabilityCols'] && (
              <div className="p-5 space-y-4 text-xs">
                <p className="text-[#64748B]">
                  Kalman Controllability Matrix: <MathView math="\mathcal{C} = [B \quad AB \quad A^2B \quad A^3B]" />. Computing each column vector:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-[#3B82F6] block text-center mb-1">Column 1: B</span>
                    <MathView block math={controllability.col_B_latex} />
                  </div>
                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-[#3B82F6] block text-center mb-1">Column 2: AB</span>
                    <MathView block math={controllability.col_AB_latex} />
                  </div>
                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-[#3B82F6] block text-center mb-1">Column 3: A²B</span>
                    <MathView block math={controllability.col_A2B_latex} />
                  </div>
                  <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-[#3B82F6] block text-center mb-1">Column 4: A³B</span>
                    <MathView block math={controllability.col_A3B_latex} />
                  </div>
                </div>

                <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <span className="font-bold text-xs text-[#1E293B] block mb-2">Assembled Controllability Matrix 𝒞:</span>
                  <MathView block math={`\\mathcal{C} = ${controllability.C_matrix_latex}`} />
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <span className="text-[#64748B]">Determinant: </span>
                      <span className="font-mono font-bold text-[#1E293B]">{controllability.determinant.toExponential(4)}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Matrix Rank: </span>
                      <span className="font-mono font-bold text-[#16A34A]">{controllability.rank} (Full Rank)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#DCFCE7] border border-[#16A34A]/30 rounded-lg p-3 text-[#14532D]">
                  <span className="font-semibold block mb-0.5">Physical Interpretation of Controllability:</span>
                  <p className="text-[11px] leading-relaxed">{controllability.physical_interpretation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Section B: Desired Pole Selection & Characteristic Polynomial */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <span className="font-semibold text-sm text-[#1E293B]">3B. Desired Closed-Loop Pole Selection</span>
              <span className="text-xs text-[#64748B]">Editable Stable Pole Coordinates (Re &lt; 0)</span>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <form onSubmit={handleUpdatePolesSubmit} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {localPoles.map((p, idx) => (
                    <div key={idx} className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                      <span className="font-bold text-xs text-[#3B82F6] block mb-2">Pole p_{idx + 1}</span>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#64748B] w-8">Real:</span>
                          <input
                            type="number"
                            step="0.1"
                            max="-0.01"
                            value={p.real}
                            onChange={(e) => {
                              const newPoles = [...localPoles];
                              newPoles[idx].real = parseFloat(e.target.value) || -1.0;
                              setLocalPoles(newPoles);
                            }}
                            className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1 bg-white"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#64748B] w-8">Imag:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={p.imag}
                            onChange={(e) => {
                              const newPoles = [...localPoles];
                              newPoles[idx].imag = parseFloat(e.target.value) || 0;
                              setLocalPoles(newPoles);
                            }}
                            className="w-full text-xs font-mono border border-[#CBD5E1] rounded p-1 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-[#64748B]">
                    <span>Current selection: </span>
                    <span className="font-mono font-bold text-[#1E293B]">
                      {ackermann.desired_poles_display.join(', ')}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Update Poles & Recalculate Ackermann Gain
                  </button>
                </div>
              </form>

              <div className="bg-[#FFFFFF] p-3 rounded-lg border border-[#E2E8F0]">
                <span className="font-semibold text-[#1E293B] block mb-1">
                  Desired Characteristic Polynomial: <MathView math="\Phi(s) = (s-p_1)(s-p_2)(s-p_3)(s-p_4)" />
                </span>
                <MathView block math={ackermann.polynomial_latex} />
              </div>
            </div>
          </div>

          {/* Section C: Matrix Polynomial Phi(A) & Ackermann Gain K */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleSection('ackermannSteps')}
              className="w-full flex items-center justify-between p-4 bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left border-b border-[#E2E8F0]"
            >
              <div className="flex items-center gap-2">
                {expandedSections['ackermannSteps'] ? <ChevronDown className="w-4 h-4 text-[#3B82F6]" /> : <ChevronRight className="w-4 h-4 text-[#64748B]" />}
                <span className="font-semibold text-sm text-[#1E293B]">3C. Ackermann's Gain Vector Synthesis & Closed-Loop Matrix</span>
              </div>
              <span className="text-xs text-[#64748B]">K = [0 0 0 1] 𝒞⁻¹ Φ(A)</span>
            </button>

            {expandedSections['ackermannSteps'] && (
              <div className="p-5 space-y-4 text-xs">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="font-semibold text-[#3B82F6] block mb-1">Matrix Polynomial Evaluated at A: Φ(A)</span>
                  <MathView block math={`\\Phi(A) = A^4 + ${ackermann.polynomial_coefficients.alpha3.toFixed(4)}A^3 + ${ackermann.polynomial_coefficients.alpha2.toFixed(4)}A^2 + ${ackermann.polynomial_coefficients.alpha1.toFixed(4)}A + ${ackermann.polynomial_coefficients.alpha0.toFixed(4)}I_4`} />
                  <MathView block math={`\\Phi(A) = ${ackermann.Phi_A_latex}`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-xs text-[#1E293B] block mb-1">Controllability Inverse: 𝒞⁻¹</span>
                    <MathView block math={`\\mathcal{C}^{-1} = ${ackermann.C_inv_latex}`} />
                  </div>

                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                    <span className="font-bold text-xs text-[#16A34A] block mb-1">Calculated State-Feedback Gain K:</span>
                    <MathView block math="K = [0 \quad 0 \quad 0 \quad 1] \, \mathcal{C}^{-1} \, \Phi(A)" />
                    <MathView block math={ackermann.K_latex} />
                    <div className="mt-2 text-[11px] text-[#64748B] space-y-1">
                      <div>• Cart position gain <MathView math="k_1" /> = <span className="font-mono font-bold text-[#1E293B]">{ackermann.K[0].toFixed(4)}</span></div>
                      <div>• Cart velocity gain <MathView math="k_2" /> = <span className="font-mono font-bold text-[#1E293B]">{ackermann.K[1].toFixed(4)}</span></div>
                      <div>• Pendulum angle gain <MathView math="k_3" /> = <span className="font-mono font-bold text-[#1E293B]">{ackermann.K[2].toFixed(4)}</span></div>
                      <div>• Angular velocity gain <MathView math="k_4" /> = <span className="font-mono font-bold text-[#1E293B]">{ackermann.K[3].toFixed(4)}</span></div>
                    </div>
                  </div>
                </div>

                {/* Closed Loop Dynamics */}
                <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-[#1E293B]">Closed-Loop System Matrix: <MathView math="A_{\text{cl}} = A - BK" /></span>
                    <button
                      onClick={() => onApplyGainToSim(ackermann.K)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Apply This Gain to Live Simulation
                    </button>
                  </div>
                  <MathView block math={`A_{\\text{cl}} = ${ackermann.A_cl_latex}`} />
                  
                  <div className="mt-3 p-3 bg-[#DCFCE7] border border-[#16A34A]/30 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                      <span className="text-xs font-semibold text-[#14532D]">
                        Closed-Loop Eigenvalues: {ackermann.closed_loop_eigenvalues.join(', ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#16A34A]">
                      Error &lt; {ackermann.max_pole_placement_error.toExponential(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: CONNECT MATHEMATICS TO LIVE SIMULATION                           */}
      {/* ========================================================================= */}
      {activeStage === 4 && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="p-2.5 rounded-lg bg-[#DCFCE7] text-[#16A34A]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]">Stage 4: Mathematical Pipeline to Live Simulation</h3>
              <p className="text-xs text-[#64748B]">Complete bidirectional synchronization between equations, gains, and physics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
              <span className="font-bold text-[#3B82F6] block mb-2">1. Parameter Updates</span>
              <p className="text-[#64748B] leading-relaxed">
                When you edit cart mass <MathView math="M" />, pendulum mass <MathView math="m" />, length <MathView math="l" />, or friction <MathView math="b" />, the mass matrix <MathView math="M(q)" />, linearized <MathView math="A, B" />, and controllability are immediately recalculated.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
              <span className="font-bold text-[#F97316] block mb-2">2. Dynamic Ackermann Synthesis</span>
              <p className="text-[#64748B] leading-relaxed">
                Changing desired poles <MathView math="p_i" /> re-evaluates the characteristic polynomial <MathView math="\Phi(s)" /> and recomputes the exact full-state feedback gain <MathView math="K = [0\ 0\ 0\ 1]\mathcal{C}^{-1}\Phi(A)" />.
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
              <span className="font-bold text-[#16A34A] block mb-2">3. Nonlinear 60fps Integration</span>
              <p className="text-[#64748B] leading-relaxed">
                The Runge-Kutta 4th-order ODE integrator uses the fresh gain matrix <MathView math="K" /> in the control law <MathView math="u = -KX" />, solving the full coupled nonlinear dynamics in real-time.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => onApplyGainToSim(ackermann.K)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-sm"
            >
              <span>Synchronize and Jump to Interactive Simulation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
