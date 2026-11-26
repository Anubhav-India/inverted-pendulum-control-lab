import React, { useState, useEffect } from 'react';
import { GitCompare, Play, AlertTriangle } from 'lucide-react';
import { PhysicalParameters, SimulationTrajectory } from '../types';
import { MathView } from './MathView';
import { EducationalCard } from './EducationalCard';
import { apiClient } from '../services/api';

interface LinearizationViewProps {
  params: PhysicalParameters;
  K: number[];
}

export const LinearizationView: React.FC<LinearizationViewProps> = ({ params, K }) => {
  const [testAngleDeg, setTestAngleDeg] = useState<number>(12);
  const [ctrlEnabled, setCtrlEnabled] = useState<boolean>(false);
  const [tEnd, setTEnd] = useState<number>(2.5);
  const [smallAngleStats, setSmallAngleStats] = useState<any>(null);
  const [comparison, setComparison] = useState<{
    nonlinear: SimulationTrajectory;
    linear: SimulationTrajectory;
    theta_error_deg: number[];
    max_theta_error_deg: number;
    max_x_error_m: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runComparison = async (angleDeg = testAngleDeg, useCtrl = ctrlEnabled, duration = tEnd) => {
    setLoading(true);
    try {
      const [saRes, cmpRes] = await Promise.all([
        apiClient.getSmallAngleAnalysis(angleDeg),
        apiClient.compareLinearVsNonlinear({
          initial_state: [0.0, 0.0, (angleDeg * Math.PI) / 180, 0.0],
          t_end: duration,
          dt: 0.01,
          manual_force: 0.0,
          control_enabled: useCtrl,
          K: useCtrl ? K : null,
          saturation_enabled: false,
          u_min: -10,
          u_max: 10,
          params,
        }),
      ]);
      setSmallAngleStats(saRes);
      setComparison(cmpRes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison(testAngleDeg, ctrlEnabled, tEnd);
  }, [params]);

  const renderDualChart = (
    title: string,
    times: number[],
    nlData: number[],
    linData: number[],
    unit: string
  ) => {
    const width = 520;
    const height = 210;
    const pad = { top: 18, right: 20, bottom: 26, left: 48 };
    const iw = width - pad.left - pad.right;
    const ih = height - pad.top - pad.bottom;

    const tMin = times[0] ?? 0;
    const tMax = Math.max(tMin + 0.1, times[times.length - 1] ?? 1);
    const all = [...nlData, ...linData].filter((v) => Number.isFinite(v));
    let yMin = Math.min(0, ...all);
    let yMax = Math.max(0, ...all);
    if (Math.abs(yMax - yMin) < 1e-4) {
      yMin -= 1;
      yMax += 1;
    } else {
      const m = (yMax - yMin) * 0.12;
      yMin -= m;
      yMax += m;
    }

    const gx = (t: number) => pad.left + ((t - tMin) / (tMax - tMin)) * iw;
    const gy = (v: number) => pad.top + ih - ((v - yMin) / (yMax - yMin)) * ih;

    const nlPts = times.map((t, i) => `${gx(t).toFixed(1)},${gy(nlData[i]).toFixed(1)}`).join(' ');
    const linPts = times.map((t, i) => `${gx(t).toFixed(1)},${gy(linData[i]).toFixed(1)}`).join(' ');

    return (
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-xs text-[#1E293B]">{title}</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-[#2563EB]">
              <span className="w-3 h-0.5 bg-[#2563EB] inline-block" /> Nonlinear ({unit})
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#F97316]">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[#F97316] inline-block" /> Linear ({unit})
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block">
          <rect x={pad.left} y={pad.top} width={iw} height={ih} fill="#F8FAFC" stroke="#E2E8F0" />
          <line x1={pad.left} y1={gy(0)} x2={width - pad.right} y2={gy(0)} stroke="#94A3B8" strokeDasharray="3,3" />
          <text x={pad.left - 6} y={pad.top + 6} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="monospace">
            {yMax.toFixed(1)}
          </text>
          <text x={pad.left - 6} y={pad.top + ih} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="monospace">
            {yMin.toFixed(1)}
          </text>
          <text x={pad.left} y={height - 6} fontSize="9" fill="#64748B" fontFamily="monospace">
            {tMin.toFixed(1)}s
          </text>
          <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="monospace">
            {tMax.toFixed(1)}s
          </text>
          <polyline fill="none" stroke="#2563EB" strokeWidth="2.2" points={nlPts} />
          <polyline fill="none" stroke="#F97316" strokeWidth="2.0" strokeDasharray="5,3" points={linPts} />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Linearization Around the Upright Equilibrium (θ = 0)"
        laymanExplanation="Classical state-feedback pole placement only works on straight-line (linear) equations. Near the straight-up position (within roughly ±10°), sin(θ) behaves almost identically to θ in radians, and cos(θ) is nearly 1. Replacing the curves with straight-line approximations lets us design a controller—as long as the pendulum stays fairly close to upright."
        engineeringExplanation="Because classical pole placement and Ackermann's formula apply to LTI systems Ẋ = AX + Bu, we compute the Jacobian / Taylor expansion around X_e = [0, 0, 0, 0]ᵀ, u_e = 0. Linearization is strictly local: as |θ| grows beyond ~10°–15°, neglected nonlinearities (sin(θ) vs θ, cos(θ) vs 1, θ̇²sin(θ)) cause the linear prediction to diverge from the true nonlinear physics."
        symbols={[
          { symbol: 'sin(θ) ≈ θ', meaning: '1st-order Taylor expansion of sine (θ in radians)' },
          { symbol: 'cos(θ) ≈ 1', meaning: '0th-order cosine approximation near θ = 0' },
          { symbol: 'θ̇²sin(θ) ≈ 0', meaning: '2nd-order product of small perturbations neglected' },
        ]}
        numericalExample={
          smallAngleStats?.point && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[11px]">
              <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                θ = {smallAngleStats.point.theta_deg.toFixed(1)}° ({smallAngleStats.point.theta_rad.toFixed(4)} rad)
              </div>
              <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                sin(θ) = {smallAngleStats.point.sin_exact.toFixed(4)} vs θ = {smallAngleStats.point.sin_approx.toFixed(4)}
              </div>
              <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                sin error: <b className="text-[#F97316]">{smallAngleStats.point.sin_rel_err_pct.toFixed(2)}%</b>
              </div>
              <div className="bg-white p-2 rounded border border-[#E2E8F0]">
                cos error: <b className="text-[#3B82F6]">{smallAngleStats.point.cos_rel_err_pct.toFixed(2)}%</b>
              </div>
            </div>
          )
        }
      />

      {/* Side-by-side Nonlinear vs Linear Equations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block mb-2">
            Original Nonlinear Equations
          </span>
          <MathView block math="(M + m)\ddot{x} + b\dot{x} + m l \ddot{\theta}\cos\theta - m l \dot{\theta}^2\sin\theta = u" />
          <MathView block math="(I + m l^2)\ddot{\theta} + m l \ddot{x}\cos\theta - m g l \sin\theta = 0" />
        </div>
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
            Linearized Equations (Valid Near θ ≈ 0)
          </span>
          <MathView block math="(M + m)\ddot{x} + b\dot{x} + m l \ddot{\theta} = u" />
          <MathView block math="(I + m l^2)\ddot{\theta} + m l \ddot{x} = m g l \theta" />
        </div>
      </div>

      {/* Interactive Nonlinear vs Linear Divergence Experiment */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-[#3B82F6]" />
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]">
                Live Nonlinear vs. Linear Response Comparison (Python RK45)
              </h3>
              <p className="text-xs text-[#64748B]">
                Increase initial angle θ₀ to observe where the linear approximation diverges from true nonlinear dynamics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => runComparison(testAngleDeg, ctrlEnabled, tEnd)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Running...' : 'Compare Models'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Initial Angle θ₀</span>
              <span className="font-mono text-[#F97316]">{testAngleDeg}°</span>
            </div>
            <input
              type="range"
              min={1}
              max={45}
              step={1}
              value={testAngleDeg}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setTestAngleDeg(v);
                runComparison(v, ctrlEnabled, tEnd);
              }}
              className="w-full accent-[#F97316] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Comparison Horizon</span>
              <span className="font-mono text-[#3B82F6]">{tEnd.toFixed(1)} s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.5}
              value={tEnd}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setTEnd(v);
                runComparison(testAngleDeg, ctrlEnabled, v);
              }}
              className="w-full accent-[#3B82F6] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1E293B]">Controller u = -KX:</span>
            <button
              type="button"
              onClick={() => {
                const next = !ctrlEnabled;
                setCtrlEnabled(next);
                runComparison(testAngleDeg, next, tEnd);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                ctrlEnabled ? 'bg-[#16A34A] text-white' : 'bg-[#E2E8F0] text-[#475569]'
              }`}
            >
              {ctrlEnabled ? 'Enabled (Closed-Loop)' : 'Disabled (Open-Loop)'}
            </button>
          </div>
        </div>

        {Math.abs(testAngleDeg) > 15 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/40 text-xs text-[#92400E]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              At θ₀ = {testAngleDeg}°, small-angle linearization assumptions are violated (sin θ error{' '}
              {smallAngleStats?.point?.sin_rel_err_pct?.toFixed(2)}%). Expect significant divergence between linear and nonlinear models!
            </span>
          </div>
        )}

        {comparison && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderDualChart(
                'Pendulum Angle θ(t): Nonlinear vs. Linear',
                comparison.nonlinear.time,
                comparison.nonlinear.theta_deg,
                comparison.linear.theta_deg,
                'deg'
              )}
              {renderDualChart(
                'Cart Position x(t): Nonlinear vs. Linear',
                comparison.nonlinear.time,
                comparison.nonlinear.x,
                comparison.linear.x,
                'm'
              )}
            </div>

            <div className="flex flex-wrap gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs font-mono">
              <div>
                Max Angular Divergence |θ_nl - θ_lin|:{' '}
                <b className="text-[#DC2626]">{comparison.max_theta_error_deg.toFixed(3)}°</b>
              </div>
              <div>
                Max Position Divergence |x_nl - x_lin|:{' '}
                <b className="text-[#3B82F6]">{comparison.max_x_error_m.toFixed(4)} m</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
