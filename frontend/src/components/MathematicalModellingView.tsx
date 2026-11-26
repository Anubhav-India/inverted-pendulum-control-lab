import React, { useState } from 'react';
import { Calculator, Sigma, ArrowRightLeft } from 'lucide-react';
import { PhysicalParameters, LagrangianData } from '../types';
import { MathView } from './MathView';
import { EducationalCard } from './EducationalCard';
import { apiClient } from '../services/api';

interface MathematicalModellingViewProps {
  params: PhysicalParameters;
  lagrangian: LagrangianData | null;
}

export const MathematicalModellingView: React.FC<MathematicalModellingViewProps> = ({
  params,
  lagrangian,
}) => {
  const [diagThetaDeg, setDiagThetaDeg] = useState<number>(15);
  const [evalState, setEvalState] = useState({
    x: 0.0,
    x_dot: 0.2,
    theta_deg: 10.0,
    theta_dot: 0.5,
    u: 2.0,
  });
  const [evalResult, setEvalResult] = useState<{
    outputs: { x_ddot: number; theta_ddot: number; theta_ddot_deg: number; determinant_D: number };
    breakdown: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      const res = await apiClient.solveNonlinearAccelerations({
        x: evalState.x,
        x_dot: evalState.x_dot,
        theta: (evalState.theta_deg * Math.PI) / 180,
        theta_dot: evalState.theta_dot,
        u: evalState.u,
        params,
      });
      setEvalResult(res);
    } finally {
      setLoading(false);
    }
  };

  const subs = lagrangian?.substitutions;
  const thetaRad = (diagThetaDeg * Math.PI) / 180;
  const rodLen = 105;
  const pivotX = 180;
  const pivotY = 155;
  const bobX = pivotX + rodLen * Math.sin(thetaRad);
  const bobY = pivotY - rodLen * Math.cos(thetaRad);

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Mathematical Modelling: Nonlinear Cart-Pendulum Physics"
        laymanExplanation="Imagine balancing a broomstick on your hand. Moving your hand sideways pushes the bottom of the broom, which makes the top tip tilt the opposite way. At the same time, gravity pulls the tilted broom downward, and the swinging broom pushes back against your hand. These two motions are tightly coupled and follow curved (trigonometric) geometry."
        engineeringExplanation="Using generalized coordinates q = [x, θ]ᵀ with θ = 0 at the vertically upright equilibrium, Euler-Lagrange equations eliminate internal pivot reaction forces and yield two coupled second-order nonlinear ODEs. The trigonometric terms sin(θ), cos(θ), and the centrifugal term mlθ̇²sin(θ) capture large-angle geometry and inertial coupling."
        symbols={[
          { symbol: 'M', meaning: `Cart mass (${params.M} kg)`, unit: 'kg' },
          { symbol: 'm', meaning: `Pendulum mass (${params.m} kg)`, unit: 'kg' },
          { symbol: 'l', meaning: `Pivot to COM distance (${params.l} m)`, unit: 'm' },
          { symbol: 'I', meaning: `Pendulum inertia about COM (${params.I})`, unit: 'kg·m²' },
          { symbol: 'b', meaning: `Cart viscous friction (${params.b})`, unit: 'N·s/m' },
          { symbol: 'g', meaning: `Gravitational acceleration (${params.g})`, unit: 'm/s²' },
          { symbol: 'x, θ', meaning: 'Cart position & upright tilt angle', unit: 'm, rad' },
          { symbol: 'u', meaning: 'Horizontal applied control force', unit: 'N' },
        ]}
        numericalExample={
          subs ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  M + m = <b>{subs.parameters.M_plus_m.toFixed(3)} kg</b>
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  m·l = <b>{subs.parameters.ml.toFixed(4)} kg·m</b>
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  I + ml² = <b>{subs.parameters.I_plus_ml2.toFixed(5)} kg·m²</b>
                </div>
                <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                  m·g·l = <b>{subs.parameters.mgl.toFixed(4)} N·m</b>
                </div>
              </div>
              <MathView block math={subs.eq1_substituted} />
              <MathView block math={subs.eq2_substituted} />
            </div>
          ) : (
            <span className="text-[#64748B]">Waiting for Python backend calculation...</span>
          )
        }
      />

      {/* Interactive Physical Free-Body Diagram + Motion Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1E293B]">Interactive Physical Coordinate Diagram</h3>
            <span className="text-xs font-mono font-bold text-[#F97316]">θ = {diagThetaDeg}°</span>
          </div>

          <svg viewBox="0 0 360 225" className="w-full h-auto bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            {/* Rail */}
            <line x1="30" y1="185" x2="330" y2="185" stroke="#94A3B8" strokeWidth="4" />
            {/* Cart */}
            <rect x="135" y="155" width="90" height="24" rx="4" fill="#E2E8F0" stroke="#64748B" strokeWidth="2" />
            <circle cx="152" cy="182" r="6" fill="#334155" />
            <circle cx="208" cy="182" r="6" fill="#334155" />
            <text x="180" y="171" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E293B">
              Cart M={params.M}kg
            </text>

            {/* Upright vertical reference */}
            <line x1={pivotX} y1={pivotY} x2={pivotX} y2={pivotY - 125} stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4,4" />
            <text x={pivotX} y={pivotY - 130} textAnchor="middle" fontSize="9" fill="#64748B">
              θ = 0 (Upright)
            </text>

            {/* Pendulum rod */}
            <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
            <circle cx={pivotX} cy={pivotY} r="4.5" fill="#0F172A" />
            <circle cx={bobX} cy={bobY} r="12" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
            <text x={bobX} y={bobY + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#FFFFFF">
              m
            </text>

            {/* Gravity vector on bob */}
            <line x1={bobX} y1={bobY + 12} x2={bobX} y2={bobY + 46} stroke="#DC2626" strokeWidth="2" />
            <polygon points={`${bobX},${bobY + 50} ${bobX - 4},${bobY + 42} ${bobX + 4},${bobY + 42}`} fill="#DC2626" />
            <text x={bobX + 8} y={bobY + 40} fontSize="10" fontWeight="700" fill="#DC2626">
              mg
            </text>

            {/* Applied force u */}
            <line x1="85" y1="167" x2="130" y2="167" stroke="#16A34A" strokeWidth="2.5" />
            <polygon points="135,167 126,162 126,172" fill="#16A34A" />
            <text x="82" y="162" textAnchor="end" fontSize="10" fontWeight="700" fill="#16A34A">
              u (Force)
            </text>

            {/* Friction vector */}
            <line x1="228" y1="175" x2="265" y2="175" stroke="#F97316" strokeWidth="2" strokeDasharray="3,2" />
            <text x="270" y="178" fontSize="9" fontWeight="600" fill="#EA580C">
              b·ẋ
            </text>

            {/* Length label */}
            <text
              x={(pivotX + bobX) / 2 - 14}
              y={(pivotY + bobY) / 2}
              fontSize="10"
              fontWeight="700"
              fill="#334155"
            >
              l={params.l}m
            </text>
          </svg>

          <div>
            <label className="text-xs font-semibold text-[#475569] block mb-1">
              Preview Tilt Angle θ ({diagThetaDeg}°) — observe gravity lever arm l·sin(θ):
            </label>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={diagThetaDeg}
              onChange={(e) => setDiagThetaDeg(parseFloat(e.target.value))}
              className="w-full accent-[#F97316] cursor-pointer"
            />
          </div>
        </div>

        {/* Equations & Highlighted Nonlinear Terms */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sigma className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Nonlinear Coupled Equations of Motion</h3>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-2">
            <span className="text-[11px] font-bold text-[#3B82F6] block">1. Cart Translational Equation:</span>
            <MathView
              block
              math="(M + m)\ddot{x} + b\dot{x} + \color{#EA580C}{m l \ddot{\theta} \cos\theta} - \color{#DC2626}{m l \dot{\theta}^2 \sin\theta} = u"
            />
            <span className="text-[11px] font-bold text-[#3B82F6] block pt-1">2. Pendulum Rotational Equation:</span>
            <MathView
              block
              math="(I + m l^2)\ddot{\theta} + \color{#EA580C}{m l \ddot{x} \cos\theta} - \color{#DC2626}{m g l \sin\theta} = 0"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]">
              <div className="font-bold text-[#C2410C] flex items-center gap-1 mb-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Inertial Coupling (Orange)
              </div>
              <p className="text-[#7C2D12]">
                <code className="font-mono">ml·cos(θ)·θ̈</code> and <code className="font-mono">ml·cos(θ)·ẍ</code> mean accelerating the cart induces torque at the pivot, and swinging the pendulum pushes the cart.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
              <div className="font-bold text-[#B91C1C] mb-1">Nonlinear &amp; Destabilizing Terms (Red)</div>
              <p className="text-[#7F1D1D]">
                <code className="font-mono">mlθ̇²sin(θ)</code> is centrifugal reaction; <code className="font-mono">-mgl·sin(θ)</code> is gravitational overturning torque—causing instability around <code className="font-mono">θ=0</code>.
              </p>
            </div>
          </div>

          {lagrangian?.derivation && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs">
              <span className="font-bold text-[#1E293B] block mb-1">SymPy Lagrangian Derivation (L = T - V):</span>
              <MathView block math={`L = ${lagrangian.derivation.L}`} />
            </div>
          )}
        </div>
      </div>

      {/* Interactive Python Nonlinear Acceleration & Term Breakdown Evaluator */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]">
              Interactive Nonlinear Dynamics Evaluator (Python / NumPy)
            </h3>
            <p className="text-xs text-[#64748B]">
              Plug in any state [x, ẋ, θ, θ̇] and force u to compute exact accelerations and each nonlinear term
            </p>
          </div>
          <button
            type="button"
            onClick={handleEvaluate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg shadow-xs disabled:opacity-50"
          >
            <Calculator className="w-3.5 h-3.5" />
            {loading ? 'Solving...' : 'Solve Nonlinear Equations'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: 'x', label: 'Cart Pos x (m)', step: 0.05 },
            { key: 'x_dot', label: 'Cart Vel ẋ (m/s)', step: 0.1 },
            { key: 'theta_deg', label: 'Angle θ (deg)', step: 1.0 },
            { key: 'theta_dot', label: 'Ang Vel θ̇ (rad/s)', step: 0.1 },
            { key: 'u', label: 'Applied Force u (N)', step: 0.5 },
          ].map((f) => (
            <div key={f.key} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <label className="text-[11px] font-semibold text-[#64748B] block mb-1">{f.label}</label>
              <input
                type="number"
                step={f.step}
                value={(evalState as any)[f.key]}
                onChange={(e) =>
                  setEvalState((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))
                }
                className="w-full text-xs font-mono font-bold bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
            </div>
          ))}
        </div>

        {evalResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3">
              <span className="text-[10px] font-bold text-[#1D4ED8] uppercase block">Cart Accel ẍ</span>
              <span className="text-sm font-mono font-bold text-[#1E293B]">
                {evalResult.outputs.x_ddot.toFixed(4)} m/s²
              </span>
            </div>
            <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-lg p-3">
              <span className="text-[10px] font-bold text-[#C2410C] uppercase block">Angular Accel θ̈</span>
              <span className="text-sm font-mono font-bold text-[#1E293B]">
                {evalResult.outputs.theta_ddot.toFixed(4)} rad/s²
              </span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">Gravity Torque mgl·sinθ</span>
              <span className="text-sm font-mono font-bold text-[#DC2626]">
                {evalResult.breakdown.gravity_torque_Nm.toFixed(4)} N·m
              </span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">Centrifugal mlθ̇²sinθ</span>
              <span className="text-sm font-mono font-bold text-[#F97316]">
                {evalResult.breakdown.centrifugal_force_N.toFixed(4)} N
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
