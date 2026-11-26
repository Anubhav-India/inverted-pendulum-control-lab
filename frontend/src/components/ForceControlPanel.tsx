import React, { useState } from 'react';
import { Zap, ArrowLeft, ArrowRight, Hand, Wind, ShieldAlert, StopCircle } from 'lucide-react';
import { ControlMode } from '../types';

interface ForceControlPanelProps {
  controlMode: ControlMode;
  onControlModeChange: (mode: ControlMode) => void;
  onApplyManualForce: (force: number, duration: number | null) => void;
  onReleaseManualForce: () => void;
  onApplyImpulse: (force: number, duration: number) => void;
  uRequested: number;
  uApplied: number;
  uExternal: number;
  isSaturated: boolean;
  saturationEnabled: boolean;
  uMin: number;
  uMax: number;
  onSaturationChange: (enabled: boolean, uMin: number, uMax: number) => void;
}

export const ForceControlPanel: React.FC<ForceControlPanelProps> = ({
  controlMode,
  onControlModeChange,
  onApplyManualForce,
  onReleaseManualForce,
  onApplyImpulse,
  uRequested,
  uApplied,
  uExternal,
  isSaturated,
  saturationEnabled,
  uMin,
  uMax,
  onSaturationChange,
}) => {
  const [forceMag, setForceMag] = useState<number>(4.0);
  const [holdDuration, setHoldDuration] = useState<number>(0.5);
  const [impulseDuration, setImpulseDuration] = useState<number>(0.1);

  const modes: { id: ControlMode; label: string; desc: string }[] = [
    { id: 'manual', label: 'Manual Force Only', desc: 'Controller OFF; push cart yourself' },
    { id: 'auto', label: 'Auto Controller (u=-KX)', desc: 'Full-state feedback active' },
    { id: 'auto_with_disturbance', label: 'Auto + Manual Disturbance', desc: 'Inject forces while controller balances' },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#FFEDD5] text-[#EA580C]">
            <Hand className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-[#1E293B]">
              Manual Force, Disturbance &amp; Actuator Saturation
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Apply real horizontal forces (N) or configure actuator limits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#1E293B]">
            u_ext: <b>{uExternal.toFixed(2)} N</b>
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              isSaturated
                ? 'bg-[#FEF3C7] border-[#F59E0B] text-[#B45309] font-bold'
                : 'bg-[#DCFCE7] border-[#16A34A]/30 text-[#15803D]'
            }`}
          >
            u_ctrl: <b>{uApplied.toFixed(2)} N</b>
            {isSaturated ? ` (req ${uRequested.toFixed(2)})` : ''}
          </span>
        </div>
      </div>

      {/* Control Mode Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onControlModeChange(m.id)}
            className={`p-2 rounded-lg border text-left transition-colors ${
              controlMode === m.id
                ? 'bg-[#EFF6FF] border-[#3B82F6] ring-1 ring-[#3B82F6]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F1F5F9]'
            }`}
          >
            <div className={`text-[11px] font-bold ${controlMode === m.id ? 'text-[#2563EB]' : 'text-[#1E293B]'}`}>
              {m.label}
            </div>
            <div className="text-[10px] text-[#64748B]">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Force Input + Hold / Impulse / Release */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1E293B]">Manual / Disturbance Force (N)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={0.5}
                min={-50}
                max={50}
                value={forceMag}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setForceMag(Math.max(-50, Math.min(50, v)));
                }}
                className="w-20 text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1 text-right"
              />
              <span className="text-xs font-mono text-[#64748B]">N</span>
            </div>
          </div>

          <input
            type="range"
            min={-25}
            max={25}
            step={0.5}
            value={Math.max(-25, Math.min(25, forceMag))}
            onChange={(e) => setForceMag(parseFloat(e.target.value))}
            className="w-full accent-[#F97316] cursor-pointer h-1.5"
          />

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <label className="text-[#64748B] font-semibold block mb-1">Hold Duration (s)</label>
              <input
                type="number"
                step={0.1}
                min={0.1}
                max={10}
                value={holdDuration}
                onChange={(e) => setHoldDuration(Math.max(0.05, parseFloat(e.target.value) || 0.5))}
                className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="text-[#64748B] font-semibold block mb-1">Impulse Duration (s)</label>
              <input
                type="number"
                step={0.02}
                min={0.02}
                max={1.0}
                value={impulseDuration}
                onChange={(e) => setImpulseDuration(Math.max(0.02, parseFloat(e.target.value) || 0.1))}
                className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => onApplyManualForce(-Math.abs(forceMag), null)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-md"
              title="Hold negative force continuously until Release"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Hold -{Math.abs(forceMag).toFixed(1)} N
            </button>
            <button
              type="button"
              onClick={() => onApplyManualForce(Math.abs(forceMag), null)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md"
              title="Hold positive force continuously until Release"
            >
              Hold +{Math.abs(forceMag).toFixed(1)} N
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onApplyManualForce(forceMag, holdDuration)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#1E293B] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-md"
            >
              <Zap className="w-3 h-3 text-[#F97316]" />
              Hold {holdDuration.toFixed(1)}s
            </button>
            <button
              type="button"
              onClick={() => onApplyImpulse(forceMag, impulseDuration)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-md"
            >
              <Wind className="w-3 h-3" />
              Impulse ({(impulseDuration * 1000).toFixed(0)}ms)
            </button>
            <button
              type="button"
              onClick={onReleaseManualForce}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#475569] bg-[#E2E8F0] hover:bg-[#CBD5E1] rounded-md"
            >
              <StopCircle className="w-3 h-3" />
              Release
            </button>
          </div>
        </div>

        {/* Actuator Saturation Configuration */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className={`w-4 h-4 ${saturationEnabled ? 'text-[#D97706]' : 'text-[#64748B]'}`} />
              <span className="text-xs font-bold text-[#1E293B]">Actuator Saturation Limits</span>
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={saturationEnabled}
                onChange={(e) => onSaturationChange(e.target.checked, uMin, uMax)}
                className="rounded accent-[#D97706]"
              />
              <span className={saturationEnabled ? 'text-[#B45309]' : 'text-[#64748B]'}>
                {saturationEnabled ? 'Enabled' : 'Disabled (Ideal)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <label className="text-[#64748B] font-semibold block mb-1">Min Force u_min (N)</label>
              <input
                type="number"
                step={0.5}
                max={-0.5}
                value={uMin}
                disabled={!saturationEnabled}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val < uMax) onSaturationChange(saturationEnabled, val, uMax);
                }}
                className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1 disabled:opacity-50"
              />
              <input
                type="range"
                min={-30}
                max={-1}
                step={0.5}
                disabled={!saturationEnabled}
                value={Math.max(-30, Math.min(-1, uMin))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val < uMax) onSaturationChange(saturationEnabled, val, uMax);
                }}
                className="w-full accent-[#D97706] mt-1 h-1.5 disabled:opacity-40"
              />
            </div>

            <div>
              <label className="text-[#64748B] font-semibold block mb-1">Max Force u_max (N)</label>
              <input
                type="number"
                step={0.5}
                min={0.5}
                value={uMax}
                disabled={!saturationEnabled}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > uMin) onSaturationChange(saturationEnabled, uMin, val);
                }}
                className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1 disabled:opacity-50"
              />
              <input
                type="range"
                min={1}
                max={30}
                step={0.5}
                disabled={!saturationEnabled}
                value={Math.min(30, Math.max(1, uMax))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (val > uMin) onSaturationChange(saturationEnabled, uMin, val);
                }}
                className="w-full accent-[#D97706] mt-1 h-1.5 disabled:opacity-40"
              />
            </div>
          </div>

          <div className="p-2 rounded bg-white border border-[#E2E8F0] text-[11px] space-y-1">
            <div className="flex justify-between font-mono">
              <span className="text-[#64748B]">Requested u_req:</span>
              <span className="font-bold text-[#1E293B]">{uRequested.toFixed(3)} N</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-[#64748B]">Actual u_applied:</span>
              <span className={`font-bold ${isSaturated ? 'text-[#D97706]' : 'text-[#16A34A]'}`}>
                {uApplied.toFixed(3)} N {isSaturated ? '[CLIPPED]' : ''}
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] pt-1 leading-snug">
              When <code className="font-mono">|u_req|</code> exceeds actuator bounds, physical force saturates. Too tight a limit can shrink the basin of attraction and cause the pendulum to fall.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
