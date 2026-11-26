import React, { useState } from 'react';
import { Copy, Check, Grid } from 'lucide-react';
import { LinearizedModelData, PhysicalParameters } from '../types';
import { MathView } from './MathView';
import { EducationalCard } from './EducationalCard';

interface StateSpaceViewProps {
  params: PhysicalParameters;
  linearModel: LinearizedModelData | null;
  measuredStates: string[];
  onMeasuredStatesChange: (states: string[]) => void;
}

const ALL_STATES = [
  { id: 'x', label: 'x (Cart Pos)' },
  { id: 'x_dot', label: 'ẋ (Cart Vel)' },
  { id: 'theta', label: 'θ (Angle)' },
  { id: 'theta_dot', label: 'θ̇ (Ang Vel)' },
];

export const StateSpaceView: React.FC<StateSpaceViewProps> = ({
  params,
  linearModel,
  measuredStates,
  onMeasuredStatesChange,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleMeasured = (id: string) => {
    const exists = measuredStates.includes(id);
    if (exists && measuredStates.length === 1) return; // keep at least 1 output
    const next = exists
      ? measuredStates.filter((s) => s !== id)
      : ALL_STATES.map((s) => s.id).filter((s) => s === id || measuredStates.includes(s));
    onMeasuredStatesChange(next);
  };

  const copyMatrix = (key: string, mat: number[][], latex: string) => {
    const text = `Matrix ${key} (Numeric):\n${JSON.stringify(mat)}\n\nLaTeX:\n${latex}`;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  if (!linearModel) {
    return <div className="p-6 text-xs text-[#64748B]">Loading state-space model from Python backend...</div>;
  }

  const pVal = linearModel.p ?? linearModel.d0;

  return (
    <div className="space-y-6">
      <EducationalCard
        title="State-Space Representation: Ẋ = AX + BU, Y = CX + DU"
        laymanExplanation="Instead of juggling two messy second-order differential equations, state-space packages all four numbers that describe what the cart and pendulum are doing right now—position, speed, angle, and angular speed—into a single 4-element list X. Matrix A tells us how the system drifts on its own, and vector B tells us how strongly our motor push u changes each variable."
        engineeringExplanation="Rewriting the linearized 4th-order system in first-order state-space form Ẋ = AX + Bu, Y = CX + Du with state vector X = [x, ẋ, θ, θ̇]ᵀ allows direct algebraic analysis of eigenvalues, controllability, and state-feedback pole placement. Because θ = 0 upright with θ > 0 clockwise gives +ml·ẍ in the pendulum equation, b4 = -ml/p and a23 = -m²gl²/p remain strictly sign-consistent with the nonlinear Lagrangian dynamics."
        symbols={[
          { symbol: 'X', meaning: 'State vector [x, ẋ, θ, θ̇]ᵀ (4×1)' },
          { symbol: 'Ẋ', meaning: 'State time-derivative [ẋ, ẍ, θ̇, θ̈]ᵀ (4×1)' },
          { symbol: 'A', meaning: 'System dynamics matrix (4×4)' },
          { symbol: 'B', meaning: 'Input / actuator matrix (4×1)' },
          { symbol: 'C', meaning: 'Output measurement matrix (q×4)' },
          { symbol: 'D', meaning: 'Direct feedthrough matrix (q×1)' },
          { symbol: 'p', meaning: `Denominator I(M+m)+Mml² = ${pVal.toFixed(6)}` },
        ]}
        numericalExample={
          <div className="space-y-2 text-xs">
            <MathView
              block
              math={`p = I(M+m) + M m l^2 = (${params.I})(${(params.M + params.m).toFixed(2)}) + (${params.M})(${params.m})(${params.l})^2 = ${pVal.toFixed(6)}`}
            />
            {linearModel.coefficients && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  a₂₂ = {linearModel.coefficients.a22.toFixed(5)}
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  a₂₃ = {linearModel.coefficients.a23.toFixed(5)}
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  a₄₂ = {linearModel.coefficients.a42.toFixed(5)}
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  a₄₃ = {linearModel.coefficients.a43.toFixed(5)}
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  b₂ = {linearModel.coefficients.b2.toFixed(5)}
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  b₄ = {linearModel.coefficients.b4.toFixed(5)}
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Symbolic Structure */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-[#3B82F6]" />
          <h3 className="font-bold text-sm text-[#1E293B]">Symbolic State-Space Formulation</h3>
        </div>
        <MathView block math="\dot{X} = \begin{bmatrix} \dot{x} \\ \ddot{x} \\ \dot{\theta} \\ \ddot{\theta} \end{bmatrix} = \begin{bmatrix} 0 & 1 & 0 & 0 \\ 0 & -\frac{(I+ml^2)b}{p} & -\frac{m^2 g l^2}{p} & 0 \\ 0 & 0 & 0 & 1 \\ 0 & \frac{mlb}{p} & \frac{mgl(M+m)}{p} & 0 \end{bmatrix} \begin{bmatrix} x \\ \dot{x} \\ \theta \\ \dot{\theta} \end{bmatrix} + \begin{bmatrix} 0 \\ \frac{I+ml^2}{p} \\ 0 \\ -\frac{ml}{p} \end{bmatrix} u" />
      </div>

      {/* Configurable Output Matrix C Selector */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-bold text-xs text-[#1E293B] block">Configurable Output Measurement Matrix C</span>
          <span className="text-[11px] text-[#64748B]">
            Select which states are measured in Y = CX + Du:
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_STATES.map((st) => {
            const active = measuredStates.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggleMeasured(st.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  active
                    ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Matrices A, B, C, D with Copy Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'A', title: 'System Matrix A (4×4)', mat: linearModel.A, latex: linearModel.A_latex, desc: 'Internal open-loop dynamics' },
          { key: 'B', title: 'Input Matrix B (4×1)', mat: linearModel.B, latex: linearModel.B_latex, desc: 'Actuator input mapping' },
          { key: 'C', title: `Output Matrix C (${linearModel.C.length}×4)`, mat: linearModel.C, latex: linearModel.C_latex, desc: `Measured: [${measuredStates.join(', ')}]` },
          { key: 'D', title: `Feedthrough Matrix D (${linearModel.D.length}×1)`, mat: linearModel.D, latex: linearModel.D_latex, desc: 'Zero direct feedthrough' },
        ].map((item) => (
          <div key={item.key} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#1E293B]">{item.title}</span>
                <span className="block text-[10px] text-[#64748B]">{item.desc}</span>
              </div>
              <button
                type="button"
                onClick={() => copyMatrix(item.key, item.mat, item.latex)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#475569] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-md"
              >
                {copiedKey === item.key ? (
                  <>
                    <Check className="w-3 h-3 text-[#16A34A]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2">
              <MathView block math={`${item.key} = ${item.latex}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
