import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ControllabilityData } from '../types';
import { MathView } from './MathView';
import { EducationalCard } from './EducationalCard';

interface ControllabilityViewProps {
  controllability: ControllabilityData | null;
}

export const ControllabilityView: React.FC<ControllabilityViewProps> = ({ controllability }) => {
  if (!controllability) {
    return <div className="p-6 text-xs text-[#64748B]">Loading controllability analysis...</div>;
  }

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Controllability Analysis (Kalman Rank Criterion)"
        laymanExplanation="We only have ONE motor pushing the cart sideways, yet we want to control FOUR things at once: where the cart is, how fast it moves, the pendulum's angle, and how fast it tilts. Controllability checks whether pushing the cart creates enough mechanical chain-reaction to steer all four variables anywhere we want."
        engineeringExplanation="An LTI pair (A, B) of order n = 4 is completely state-controllable if and only if the controllability matrix 𝒞 = [B, AB, A²B, A³B] has full column rank: rank(𝒞) = 4 (equivalently det(𝒞) ≠ 0). Full controllability is the necessary and sufficient condition for arbitrary closed-loop pole placement using Ackermann's formula."
        symbols={[
          { symbol: '𝒞', meaning: '4×4 Controllability matrix [B, AB, A²B, A³B]' },
          { symbol: 'rank(𝒞)', meaning: 'Number of linearly independent columns (must equal 4)' },
          { symbol: 'det(𝒞)', meaning: 'Determinant of 𝒞 (non-zero iff full rank)' },
          { symbol: 'κ(𝒞)', meaning: 'Condition number (measures numerical sensitivity)' },
        ]}
        numericalExample={
          <div className="text-xs font-mono space-y-1">
            <div>
              rank(𝒞) = <b className="text-[#16A34A]">{controllability.rank} / 4</b> | det(𝒞) ={' '}
              <b>{controllability.determinant.toExponential(4)}</b>
              {controllability.condition_number && (
                <>
                  {' '}
                  | cond(𝒞) = <b>{controllability.condition_number.toFixed(2)}</b>
                </>
              )}
            </div>
          </div>
        }
      />

      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]">
              Step-by-Step Controllability Matrix 𝒞 = [B, AB, A²B, A³B]
            </h3>
            <p className="text-xs text-[#64748B]">Computed dynamically by Python/NumPy from current A and B</p>
          </div>
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              controllability.is_controllable
                ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/30'
                : 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30'
            }`}
          >
            {controllability.is_controllable ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Controllable (Rank 4/4)
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" /> Not Controllable (Rank {controllability.rank}/4)
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'B', latex: controllability.col_B_latex },
            { label: 'AB', latex: controllability.col_AB_latex },
            { label: 'A²B', latex: controllability.col_A2B_latex },
            { label: 'A³B', latex: controllability.col_A3B_latex },
          ].map((c) => (
            <div key={c.label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span className="font-bold text-xs text-[#3B82F6] block text-center mb-1">{c.label}</span>
              <MathView block math={c.latex} />
            </div>
          ))}
        </div>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
          <span className="font-bold text-xs text-[#1E293B] block mb-1">Full Controllability Matrix 𝒞:</span>
          <MathView block math={`\\mathcal{C} = ${controllability.C_matrix_latex}`} />
        </div>

        <div
          className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
            controllability.is_controllable
              ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#14532D]'
              : 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <p className="font-semibold mb-1">{controllability.mathematical_conclusion}</p>
          <p>{controllability.physical_interpretation}</p>
        </div>
      </div>
    </div>
  );
};
