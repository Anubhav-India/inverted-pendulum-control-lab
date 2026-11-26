import React, { useState } from 'react';
import { Sliders, ShieldAlert, Zap } from 'lucide-react';
import { AckermannControllerData, ControlMode, PolePreset } from '../types';
import { MathView } from './MathView';
import { EducationalCard } from './EducationalCard';

interface StateFeedbackViewProps {
  ackermann: AckermannControllerData | null;
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  saturationEnabled: boolean;
  uMin: number;
  uMax: number;
  onSaturationChange: (enabled: boolean, uMin: number, uMax: number) => void;
  polePresets: Record<string, PolePreset>;
  onSelectPresetPoles: (presetKey: string) => void;
  onGoToAckermann: () => void;
}

export const StateFeedbackView: React.FC<StateFeedbackViewProps> = ({
  ackermann,
  controlMode,
  onControlModeChange,
  saturationEnabled,
  uMin,
  uMax,
  onSaturationChange,
  polePresets,
  onSelectPresetPoles,
  onGoToAckermann,
}) => {
  const [sampleState, setSampleState] = useState({
    x: 0.1,
    x_dot: 0.2,
    theta_deg: 5.0,
    theta_dot: 0.3,
  });

  const K = ackermann?.K ?? [0, 0, 0, 0];
  const thetaRad = (sampleState.theta_deg * Math.PI) / 180;
  const terms = [
    -K[0] * sampleState.x,
    -K[1] * sampleState.x_dot,
    -K[2] * thetaRad,
    -K[3] * sampleState.theta_dot,
  ];
  const uReq = terms.reduce((a, b) => a + b, 0);
  const uApp = saturationEnabled ? Math.max(uMin, Math.min(uMax, uReq)) : uReq;
  const isSat = saturationEnabled && Math.abs(uApp - uReq) > 1e-6;
  const isEnabled = controlMode !== 'manual';

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Full-State Feedback Control Law: u = -KX"
        laymanExplanation="Imagine balancing a broomstick while watching FOUR things at once: where your hand is (x), how fast your hand moves (ẋ), how far the broom leans (θ), and how fast it's tipping (θ̇). Full-state feedback multiplies each of those 4 measurements by a tuned number (k₁, k₂, k₃, k₄) and adds them up into one motor command u."
        engineeringExplanation="Full-state feedback uses the control law u = -KX = -(k₁x + k₂ẋ + k₃θ + k₄θ̇), transforming the open-loop dynamics Ẋ = AX + Bu into closed-loop dynamics Ẋ = (A - BK)X. Unlike single-loop controllers that only watch θ, full-state feedback simultaneously stabilizes the upright pendulum and regulates the cart back to x = 0."
        symbols={[
          { symbol: 'K', meaning: '1×4 State feedback gain vector [k₁, k₂, k₃, k₄]' },
          { symbol: 'k₁, k₂', meaning: 'Cart position & velocity feedback gains' },
          { symbol: 'k₃, k₄', meaning: 'Pendulum angle & angular velocity feedback gains' },
          { symbol: 'u', meaning: 'Scalar actuator force command (N)' },
        ]}
        numericalExample={
          <div className="space-y-2 text-xs">
            <MathView
              block
              math={`u = -\\left((${K[0].toFixed(4)})x + (${K[1].toFixed(4)})\\dot{x} + (${K[2].toFixed(4)})\\theta + (${K[3].toFixed(4)})\\dot{\\theta}\\right)`}
            />
          </div>
        }
      />

      {/* Block Diagram */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-[#1E293B]">Closed-Loop State-Feedback Architecture</h3>
        <svg viewBox="0 0 760 170" className="w-full h-auto bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          {/* Reference */}
          <text x="20" y="62" fontSize="11" fontWeight="700" fill="#475569">
            X_ref = 0
          </text>
          <line x1="78" y1="58" x2="112" y2="58" stroke="#475569" strokeWidth="2" />
          <circle cx="122" cy="58" r="10" fill="#FFFFFF" stroke="#475569" strokeWidth="2" />
          <text x="122" y="62" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1E293B">
            Σ
          </text>
          <text x="110" y="84" fontSize="10" fontWeight="700" fill="#DC2626">
            -
          </text>

          {/* Arrow to Controller Gain K */}
          <line x1="132" y1="58" x2="178" y2="58" stroke="#3B82F6" strokeWidth="2" />
          <polygon points="184,58 176,53 176,63" fill="#3B82F6" />

          {/* Gain K box */}
          <rect x="184" y="34" width="120" height="48" rx="6" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="2" />
          <text x="244" y="54" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1D4ED8">
            Gain Matrix K
          </text>
          <text x="244" y="70" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#1E293B">
            u_req = -K·X
          </text>

          {/* Arrow to Saturation */}
          <line x1="304" y1="58" x2="348" y2="58" stroke="#D97706" strokeWidth="2" />
          <polygon points="354,58 346,53 346,63" fill="#D97706" />

          {/* Saturation Box */}
          <rect
            x="354"
            y="34"
            width="126"
            height="48"
            rx="6"
            fill={saturationEnabled ? '#FEF3C7' : '#F1F5F9'}
            stroke={saturationEnabled ? '#D97706' : '#94A3B8'}
            strokeWidth="2"
          />
          <text x="417" y="54" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1E293B">
            Actuator Limit
          </text>
          <text x="417" y="70" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#64748B">
            {saturationEnabled ? `[${uMin}, ${uMax}] N` : 'Unlimited'}
          </text>

          {/* Arrow to Plant */}
          <line x1="480" y1="58" x2="528" y2="58" stroke="#16A34A" strokeWidth="2" />
          <polygon points="534,58 526,53 526,63" fill="#16A34A" />
          <text x="506" y="49" textAnchor="middle" fontSize="9" fontWeight="700" fill="#16A34A">
            u_app
          </text>

          {/* Plant Box */}
          <rect x="534" y="28" width="160" height="60" rx="6" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2" />
          <text x="614" y="52" textAnchor="middle" fontSize="11" fontWeight="700" fill="#166534">
            Cart-Pendulum Plant
          </text>
          <text x="614" y="69" textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#14532D">
            Ẋ = f(X, u)
          </text>

          {/* Output State X & Feedback Path */}
          <line x1="694" y1="58" x2="736" y2="58" stroke="#1E293B" strokeWidth="2" />
          <text x="720" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill="#1E293B">
            X
          </text>
          <polyline
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            points="716,58 716,132 122,132 122,72"
          />
          <polygon points="122,68 117,76 127,76" fill="#475569" />
          <text x="420" y="148" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">
            Full State Vector Feedback: X = [x, ẋ, θ, θ̇]ᵀ
          </text>
        </svg>
      </div>

      {/* Physical Role of Each Gain + Controller Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#1E293B]">How Each Gain Corrects the System</h3>
            <button
              type="button"
              onClick={onGoToAckermann}
              className="text-xs font-semibold text-[#3B82F6] hover:underline"
            >
              Tune Poles in Ackermann Tab →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {[
              {
                name: 'k₁ (Cart Position x)',
                val: K[0],
                desc: 'Steers the cart back to the track origin x = 0 once upright stability is secured.',
              },
              {
                name: 'k₂ (Cart Velocity ẋ)',
                val: K[1],
                desc: 'Damps horizontal cart speed so the cart does not drift away or oscillate along the rail.',
              },
              {
                name: 'k₃ (Pendulum Angle θ)',
                val: K[2],
                desc: 'Primary balancing stiffness: pushes the cart underneath the falling bob (if θ > 0 right, pushes right).',
              },
              {
                name: 'k₄ (Angular Velocity θ̇)',
                val: K[3],
                desc: 'Angular damping: anticipates fast tipping rates and prevents overshoot past vertical.',
              },
            ].map((item) => (
              <div key={item.name} className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-center justify-between font-bold text-[#1E293B] mb-0.5">
                  <span>{item.name}</span>
                  <span className="font-mono text-[#3B82F6]">{item.val.toFixed(4)}</span>
                </div>
                <p className="text-[11px] text-[#64748B]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controller Controls + Saturation */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
            <Sliders className="w-4 h-4 text-[#3B82F6]" />
            <h3 className="font-bold text-sm text-[#1E293B]">Controller Configuration</h3>
          </div>

          <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
            <div>
              <span className="text-xs font-bold text-[#1E293B] block">Feedback Controller State</span>
              <span className="text-[11px] text-[#64748B]">Enable or disable u = -KX in live simulation</span>
            </div>
            <button
              type="button"
              onClick={() => onControlModeChange(isEnabled ? 'manual' : 'auto')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg ${
                isEnabled ? 'bg-[#16A34A] text-white' : 'bg-[#DC2626] text-white'
              }`}
            >
              {isEnabled ? 'Enabled (Auto)' : 'Disabled (Manual)'}
            </button>
          </div>

          <div>
            <span className="text-xs font-bold text-[#1E293B] block mb-2">Quick Pole Design Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(polePresets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectPresetPoles(key)}
                  className="p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#3B82F6] text-left transition-colors"
                >
                  <span className="text-xs font-bold text-[#1E293B] block">{preset.label}</span>
                  <span className="text-[10px] text-[#64748B] block">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#92400E]">
                <ShieldAlert className="w-4 h-4" />
                <span>Actuator Saturation</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={saturationEnabled}
                  onChange={(e) => onSaturationChange(e.target.checked, uMin, uMax)}
                  className="rounded accent-[#D97706]"
                />
                <span>{saturationEnabled ? 'Active' : 'Off'}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#78350F] block">u_min (N)</label>
                <input
                  type="number"
                  step={0.5}
                  value={uMin}
                  disabled={!saturationEnabled}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v < uMax) onSaturationChange(saturationEnabled, v, uMax);
                  }}
                  className="w-full font-mono bg-white border border-[#FCD34D] rounded px-2 py-1 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#78350F] block">u_max (N)</label>
                <input
                  type="number"
                  step={0.5}
                  value={uMax}
                  disabled={!saturationEnabled}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > uMin) onSaturationChange(saturationEnabled, uMin, v);
                  }}
                  className="w-full font-mono bg-white border border-[#FCD34D] rounded px-2 py-1 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Term-by-Term Feedback Force Calculator */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#16A34A]" />
          <h3 className="font-bold text-sm text-[#1E293B]">Interactive u = -KX Term-by-Term Force Breakdown</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'x', label: 'x (m)', min: -1, max: 1, step: 0.05 },
            { key: 'x_dot', label: 'ẋ (m/s)', min: -2, max: 2, step: 0.1 },
            { key: 'theta_deg', label: 'θ (deg)', min: -25, max: 25, step: 0.5 },
            { key: 'theta_dot', label: 'θ̇ (rad/s)', min: -3, max: 3, step: 0.1 },
          ].map((f) => (
            <div key={f.key} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>{f.label}</span>
                <span className="font-mono text-[#3B82F6]">{(sampleState as any)[f.key]}</span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={(sampleState as any)[f.key]}
                onChange={(e) =>
                  setSampleState((prev) => ({ ...prev, [f.key]: parseFloat(e.target.value) }))
                }
                className="w-full accent-[#3B82F6] cursor-pointer"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-xs">
          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block">-k₁x</span>
            <b>{terms[0].toFixed(3)} N</b>
          </div>
          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block">-k₂ẋ</span>
            <b>{terms[1].toFixed(3)} N</b>
          </div>
          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block">-k₃θ</span>
            <b>{terms[2].toFixed(3)} N</b>
          </div>
          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B] block">-k₄θ̇</span>
            <b>{terms[3].toFixed(3)} N</b>
          </div>
          <div className="p-2.5 rounded bg-[#EFF6FF] border border-[#BFDBFE]">
            <span className="text-[10px] text-[#1D4ED8] block">u_requested</span>
            <b>{uReq.toFixed(3)} N</b>
          </div>
          <div className={`p-2.5 rounded border ${isSat ? 'bg-[#FEF3C7] border-[#F59E0B]' : 'bg-[#DCFCE7] border-[#16A34A]/30'}`}>
            <span className="text-[10px] text-[#166534] block">u_applied {isSat ? '(SAT)' : ''}</span>
            <b>{uApp.toFixed(3)} N</b>
          </div>
        </div>
      </div>
    </div>
  );
};
