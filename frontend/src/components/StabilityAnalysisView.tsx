import React from 'react';
import { AlertCircle, Compass, CheckCircle2 } from 'lucide-react';
import { StabilityAnalysisData, PhysicalParameters } from '../types';
import { PolePlot } from './PolePlot';
import { EducationalCard } from './EducationalCard';

interface StabilityAnalysisViewProps {
  params: PhysicalParameters;
  stability: StabilityAnalysisData | null;
}

export const StabilityAnalysisView: React.FC<StabilityAnalysisViewProps> = ({
  params,
  stability,
}) => {
  if (!stability) {
    return <div className="p-6 text-xs text-[#64748B]">Loading stability analysis...</div>;
  }

  const polesComplex = stability.eigenvalues.map((ev) => ({ real: ev.real, imag: ev.imag }));
  const rhpPole = stability.eigenvalues.find((ev) => ev.real > 1e-5);

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Open-Loop Stability Analysis (Eigenvalues of A)"
        laymanExplanation="Think of poles like the natural tendencies of the system if you let go of it. A negative pole means any wobble naturally dies down like a marble in a bowl. A positive pole means the opposite—like a marble balanced on top of a basketball: the tiniest nudge makes it roll faster and faster away from the top."
        engineeringExplanation="For an LTI system Ẋ = AX, stability is determined by the eigenvalues λ_i of matrix A (roots of det(sI - A) = 0). Every mode evolves as e^(λ_i t). Because the inverted pendulum has gravitational anti-stiffness (+mgl·sinθ), A always possesses a strictly positive real eigenvalue λ > 0 in the Right-Half s-Plane (RHP), proving exponential open-loop instability."
        symbols={[
          { symbol: 'Re(s) < 0', meaning: 'Left-Half Plane (LHP): exponentially decaying stable modes' },
          { symbol: 'Re(s) > 0', meaning: 'Right-Half Plane (RHP): exponentially growing unstable modes' },
          { symbol: 'Re(s) = 0', meaning: 'Imaginary jω-axis: marginally stable / integrator mode' },
        ]}
        numericalExample={
          <div className="text-xs space-y-1.5">
            <p className="text-[#1E293B]">
              With M={params.M} kg, m={params.m} kg, l={params.l} m, g={params.g} m/s²:
              {rhpPole && (
                <>
                  {' '}
                  the unstable RHP pole is{' '}
                  <span className="font-mono font-bold text-[#DC2626]">{rhpPole.formatted} rad/s</span>, meaning a small tilt doubles roughly every{' '}
                  <span className="font-mono font-bold">{(Math.LN2 / rhpPole.real).toFixed(3)} s</span>!
                </>
              )}
            </p>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PolePlot
          title="Open-Loop Eigenvalues on the Complex s-Plane"
          series={[
            {
              label: 'Open-Loop Poles eig(A)',
              poles: polesComplex,
              color: '#DC2626',
              marker: 'x',
            },
          ]}
          height={320}
        />

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#DC2626]" />
              <h3 className="font-bold text-sm text-[#1E293B]">Open-Loop Pole Classification</h3>
            </div>
            <span
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                stability.is_stable
                  ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/30'
                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30'
              }`}
            >
              {stability.classification}
            </span>
          </div>

          <div className="space-y-2">
            {stability.eigenvalues.map((ev, idx) => {
              const isRhp = ev.region === 'unstable_rhp';
              const isLhp = ev.region === 'stable_lhp';
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                    isRhp
                      ? 'bg-[#FEF2F2] border-[#FECACA]'
                      : isLhp
                      ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                      : 'bg-[#FFFBEB] border-[#FDE68A]'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-[#1E293B]">
                      λ_{idx + 1} = {ev.formatted}
                    </span>
                    <span className="block text-[10px] text-[#64748B]">
                      {isRhp
                        ? 'Unstable RHP Pole (Inverted pendulum divergence)'
                        : isLhp
                        ? `Stable LHP Pole (τ = ${ev.time_constant_s?.toFixed(3)} s)`
                        : 'Marginal Pole at s = 0 (Pure cart integrator)'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isRhp
                        ? 'bg-[#DC2626] text-white'
                        : isLhp
                        ? 'bg-[#16A34A] text-white'
                        : 'bg-[#D97706] text-white'
                    }`}
                  >
                    {isRhp ? 'UNSTABLE' : isLhp ? 'STABLE' : 'MARGINAL'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2 text-xs text-[#991B1B]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{stability.summary}</p>
          </div>

          {stability.counts.rhp_unstable === 0 && (
            <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center gap-2 text-xs text-[#166534]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No RHP poles detected.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
