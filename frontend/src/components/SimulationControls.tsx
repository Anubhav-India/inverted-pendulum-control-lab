import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Gauge,
  Target,
  Eraser,
} from 'lucide-react';
import { SimulationStatus, ModelType, ControlMode } from '../types';

interface SimulationControlsProps {
  status: SimulationStatus;
  modelType: ModelType;
  controlMode: ControlMode;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStep: () => void;
  onClearICs: () => void;
  onSpeedChange: (speed: number) => void;
  onSelectSimMode: (modelType: ModelType, controlEnabled: boolean) => void;
  onSelectPreset: (testId: 1 | 2 | 3 | 4) => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  status,
  modelType,
  controlMode,
  speed,
  onStart,
  onPause,
  onResume,
  onReset,
  onStep,
  onClearICs,
  onSpeedChange,
  onSelectSimMode,
  onSelectPreset,
}) => {
  const isRunning = status === 'running' || status === 'settled';
  const isPaused = status === 'paused';
  const isCtrl = controlMode !== 'manual';

  const simModes: { label: string; model: ModelType; ctrl: boolean; badgeColor: string }[] = [
    { label: 'Nonlinear Controlled', model: 'nonlinear', ctrl: true, badgeColor: 'bg-[#3B82F6] text-white' },
    { label: 'Nonlinear Uncontrolled', model: 'nonlinear', ctrl: false, badgeColor: 'bg-[#DC2626] text-white' },
    { label: 'Linear Controlled', model: 'linear', ctrl: true, badgeColor: 'bg-[#0EA5E9] text-white' },
    { label: 'Linear Uncontrolled', model: 'linear', ctrl: false, badgeColor: 'bg-[#F97316] text-white' },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-4">
      {/* Transport Controls */}
      <div>
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
          Simulation Transport
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning && !isPaused && (
            <button
              type="button"
              onClick={onStart}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white bg-[#16A34A] hover:bg-[#15803D] shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white bg-[#D97706] hover:bg-[#B45309] shadow-xs transition-colors"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg text-white bg-[#16A34A] hover:bg-[#15803D] shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume
            </button>
          )}

          <button
            type="button"
            onClick={onStep}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-[#1E293B] bg-[#F8FAFC] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg disabled:opacity-45 transition-colors"
            title="Advance simulation by exactly one time step Δt"
          >
            <SkipForward className="w-3.5 h-3.5 text-[#3B82F6]" />
            Step
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-[#1E293B] bg-[#F8FAFC] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            Reset
          </button>

          <button
            type="button"
            onClick={onClearICs}
            className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B] bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg transition-colors"
            title="Reset all initial states to zero"
          >
            <Eraser className="w-3.5 h-3.5" />
            Clear ICs
          </button>
        </div>
      </div>

      {/* 4 Simulation Modes */}
      <div>
        <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
          Simulation Model &amp; Loop Mode
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {simModes.map((m) => {
            const active = modelType === m.model && isCtrl === m.ctrl;
            return (
              <button
                key={m.label}
                type="button"
                onClick={() => onSelectSimMode(m.model, m.ctrl)}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors text-left ${
                  active
                    ? `${m.badgeColor} border-transparent shadow-xs`
                    : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulation Speed */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#1E293B]">
            <Gauge className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Simulation Speed</span>
          </div>
          <span className="font-mono font-bold text-[#3B82F6]">{speed.toFixed(2)}x</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={2.5}
          step={0.05}
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-[#3B82F6] cursor-pointer h-1.5"
        />
        <div className="flex items-center justify-between gap-1">
          {[0.25, 0.5, 1.0, 1.5, 2.0].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              className={`flex-1 py-0.5 rounded border text-[10px] font-semibold transition-colors ${
                Math.abs(speed - s) < 0.01
                  ? 'bg-[#DBEAFE] text-[#3B82F6] border-[#3B82F6]'
                  : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Quick Scenarios */}
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
          <Target className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Quick Experiments</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSelectPreset(1)}
            className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#3B82F6] text-left transition-colors"
          >
            <span className="text-[11px] font-bold text-[#3B82F6] block">5° Closed-Loop</span>
            <span className="text-[10px] text-[#64748B]">Nonlinear stabilization</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(2)}
            className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:border-[#3B82F6] text-left transition-colors"
          >
            <span className="text-[11px] font-bold text-[#3B82F6] block">10° Closed-Loop</span>
            <span className="text-[10px] text-[#64748B]">Larger nonlinear angle</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(3)}
            className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#FFF7ED] hover:border-[#F97316] text-left transition-colors"
          >
            <span className="text-[11px] font-bold text-[#F97316] block">Impulse Rejection</span>
            <span className="text-[10px] text-[#64748B]">+10 N (50 ms) pulse</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPreset(4)}
            className="p-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#FEF2F2] hover:border-[#DC2626] text-left transition-colors"
          >
            <span className="text-[11px] font-bold text-[#DC2626] block">Open-Loop Fall</span>
            <span className="text-[10px] text-[#64748B]">Uncontrolled (u = 0)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
