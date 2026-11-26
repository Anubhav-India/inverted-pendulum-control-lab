import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import {
  AckermannControllerData,
  ComplexNumber,
  ControllabilityData,
  LinearizedModelData,
  PolePreset,
} from '../types';
import { MathView } from './MathView';
import { PolePlot } from './PolePlot';
import { EducationalCard } from './EducationalCard';

interface AckermannViewProps {
  linearModel: LinearizedModelData | null;
  controllability: ControllabilityData | null;
  ackermann: AckermannControllerData | null;
  desiredPoles: ComplexNumber[];
  polePresets: Record<string, PolePreset>;
  onUpdatePoles: (poles: ComplexNumber[]) => void;
  onApplyToSimulation: () => void;
}

export const AckermannView: React.FC<AckermannViewProps> = ({
  linearModel,
  controllability,
  ackermann,
  desiredPoles,
  polePresets,
  onUpdatePoles,
  onApplyToSimulation,
}) => {
  const [localPoles, setLocalPoles] = useState<ComplexNumber[]>(desiredPoles);

  useEffect(() => {
    setLocalPoles(desiredPoles);
  }, [desiredPoles]);

  const handlePoleChange = (idx: number, field: 'real' | 'imag', val: number) => {
    const safeVal = isNaN(val) ? 0 : val;
    const next = localPoles.map((p, i) => (i === idx ? { ...p, [field]: safeVal } : { ...p }));
    setLocalPoles(next);
  };

  const handleApplyPoles = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePoles(localPoles);
  };

  const openLoopPoles: ComplexNumber[] =
    linearModel?.open_loop_eigenvalues.map((ev) => ({ real: ev.real, imag: ev.imag })) ?? [];
  const actualClPoles: ComplexNumber[] = ackermann?.closed_loop_poles_complex ?? [];

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Controller Design Using Ackermann's Formula"
        laymanExplanation="Ackermann's formula is like a recipe that works backward: you pick the four target speeds and damping behaviors (desired poles) you want the balanced pendulum to have, and the formula computes the exact four feedback numbers K = [k₁, k₂, k₃, k₄] needed to force the real system to behave that way."
        engineeringExplanation="By the Cayley-Hamilton theorem, every matrix satisfies its own characteristic equation Φ(A_cl) = 0. Ackermann's formula K = [0 0 0 1] 𝒞⁻¹ Φ(A) transforms the controllable single-input pair (A, B) into controller canonical form implicitly and computes the unique state-feedback gain vector K such that det(sI - (A - BK)) = Φ(s). We also cross-check K with SciPy's numerically robust place_poles algorithm."
        symbols={[
          { symbol: 'p₁..p₄', meaning: 'Desired closed-loop pole locations in s-plane' },
          { symbol: 'Φ(s)', meaning: 'Desired characteristic polynomial s⁴ + a₃s³ + a₂s² + a₁s + a₀' },
          { symbol: 'Φ(A)', meaning: 'Matrix polynomial A⁴ + a₃A³ + a₂A² + a₁A + a₀I' },
          { symbol: 'K', meaning: 'Feedback gain [0 0 0 1] 𝒞⁻¹ Φ(A)' },
        ]}
        numericalExample={
          ackermann?.feasible ? (
            <div className="text-xs space-y-1">
              <MathView block math={ackermann.K_latex} />
              {ackermann.scipy_ackermann_max_diff !== undefined && (
                <p className="text-[11px] font-mono text-[#64748B]">
                  Cross-check vs. scipy.signal.place_poles: max |K_ackermann - K_scipy| ={' '}
                  <b>{ackermann.scipy_ackermann_max_diff.toExponential(2)}</b>
                </p>
              )}
            </div>
          ) : null
        }
      />

      {/* Desired Pole Selection Interface + Interactive Complex Plane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="font-bold text-sm text-[#1E293B]">Desired Pole Selection Interface</h3>
            </div>
            <span className="text-[10px] font-semibold text-[#64748B]">
              Complex poles require conjugate pairs (a ± bj)
            </span>
          </div>

          {/* Preset Pole Configurations */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(polePresets).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setLocalPoles(preset.poles);
                  onUpdatePoles(preset.poles);
                }}
                className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#3B82F6] text-left transition-colors"
              >
                <span className="text-[11px] font-bold text-[#1E293B] block">{preset.label}</span>
                <span className="text-[10px] text-[#64748B]">{preset.description}</span>
              </button>
            ))}
          </div>

          {/* Manual 4-Pole Editor */}
          <form onSubmit={handleApplyPoles} className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {localPoles.map((p, idx) => (
                <div key={idx} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
                  <span className="text-[11px] font-bold text-[#3B82F6] block mb-1.5">
                    Desired Pole p_{idx + 1}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-[#64748B] block">Real</label>
                      <input
                        type="number"
                        step={0.1}
                        value={p.real}
                        onChange={(e) => handlePoleChange(idx, 'real', parseFloat(e.target.value))}
                        className="w-full text-xs font-mono bg-white border border-[#CBD5E1] rounded px-1.5 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#64748B] block">Imag (j)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={p.imag}
                        onChange={(e) => handlePoleChange(idx, 'imag', parseFloat(e.target.value))}
                        className="w-full text-xs font-mono bg-white border border-[#CBD5E1] rounded px-1.5 py-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Compute Ackermann Gains
              </button>

              {ackermann?.feasible && (
                <button
                  type="button"
                  onClick={onApplyToSimulation}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Run in Live Simulation
                </button>
              )}
            </div>
          </form>

          {/* Trade-off Note */}
          <p className="text-[11px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 leading-relaxed">
            <b>Engineering Trade-Off:</b> Moving poles further left speeds up settling, but produces larger gains{' '}
            <code className="font-mono">K</code>, demanding higher peak actuator forces and increasing sensitivity to
            actuator saturation and modeling mismatch.
          </p>

          {/* Errors / Warnings */}
          {ackermann?.errors && ackermann.errors.length > 0 && (
            <div className="p-3 rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#991B1B] space-y-1">
              {ackermann.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {ackermann?.warnings && ackermann.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
              {ackermann.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Complex Plane Pole Plot */}
        <PolePlot
          title="Pole Placement Verification: Open-Loop vs. Desired vs. Actual Closed-Loop"
          series={[
            { label: 'Open-Loop eig(A)', poles: openLoopPoles, color: '#DC2626', marker: 'x' },
            { label: 'Desired Poles', poles: desiredPoles, color: '#3B82F6', marker: 'o' },
            { label: 'Actual eig(A - BK)', poles: actualClPoles, color: '#16A34A', marker: 'diamond' },
          ]}
          height={350}
        />
      </div>

      {/* 9-Step Ackermann Formula Breakdown */}
      {ackermann?.feasible && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <h3 className="font-bold text-sm text-[#1E293B]">
              Step-by-Step Ackermann Calculation (Python / NumPy / SciPy)
            </h3>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                ackermann.is_verified
                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : 'bg-[#FEF3C7] text-[#B45309]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Max Pole Error: {ackermann.max_pole_placement_error.toExponential(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1">
              <span className="font-bold text-[#3B82F6]">1 &amp; 2. Controllability Matrix &amp; Rank</span>
              <p className="text-[#64748B]">
                rank(𝒞) = <b>{controllability?.rank}/4</b>, cond(𝒞) ={' '}
                <b>{ackermann.condition_number_C?.toFixed(2)}</b>. Invertible!
              </p>
              <MathView block math={`\\mathcal{C}^{-1} = ${ackermann.C_inv_latex}`} />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1">
              <span className="font-bold text-[#3B82F6]">3 &amp; 4. Desired Characteristic Polynomial Φ(s)</span>
              <p className="text-[#64748B]">
                Expanding (s - p₁)(s - p₂)(s - p₃)(s - p₄) for poles [{ackermann.desired_poles_display.join(', ')}]:
              </p>
              <MathView block math={ackermann.polynomial_latex} />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1">
              <span className="font-bold text-[#3B82F6]">5. Matrix Polynomial Φ(A)</span>
              <p className="text-[#64748B]">Substituting A into Φ(s): Φ(A) = A⁴ + a₃A³ + a₂A² + a₁A + a₀I</p>
              <MathView block math={`\\Phi(A) = ${ackermann.Phi_A_latex}`} />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1">
              <span className="font-bold text-[#16A34A]">6. Gain Vector K = [0 0 0 1] 𝒞⁻¹ Φ(A)</span>
              <MathView block math={ackermann.K_latex} />
              {ackermann.scipy_K && (
                <div className="text-[11px] font-mono text-[#475569] pt-1">
                  SciPy place_poles K = [{ackermann.scipy_K.map((v) => v.toFixed(4)).join(', ')}]
                </div>
              )}
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1">
              <span className="font-bold text-[#3B82F6]">7. Closed-Loop Matrix A_cl = A - BK</span>
              <MathView block math={`A_{\\text{cl}} = ${ackermann.A_cl_latex}`} />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-2">
              <span className="font-bold text-[#16A34A]">8 &amp; 9. Closed-Loop Eigenvalue Verification</span>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-[#64748B] border-b border-[#E2E8F0]">
                      <th className="py-1 text-left">Pole</th>
                      <th className="py-1 text-left">Desired</th>
                      <th className="py-1 text-left">Actual eig(A - BK)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ackermann.desired_poles_display.map((dp, idx) => (
                      <tr key={idx} className="border-b border-[#F1F5F9]">
                        <td className="py-1">p_{idx + 1}</td>
                        <td className="py-1 text-[#3B82F6]">{dp}</td>
                        <td className="py-1 text-[#16A34A] font-bold">
                          {ackermann.closed_loop_eigenvalues[idx]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#166534]">{ackermann.verification_message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
