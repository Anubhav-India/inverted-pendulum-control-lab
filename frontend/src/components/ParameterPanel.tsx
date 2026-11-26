import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, ChevronDown, ChevronRight, AlertCircle, Eraser } from 'lucide-react';
import { PhysicalParameters, InitialConditions } from '../types';
import { DEFAULT_PARAMETERS } from '../services/mathEngine';

interface ParameterPanelProps {
  params: PhysicalParameters;
  initialConditions: InitialConditions;
  dt: number;
  duration: number;
  continuous: boolean;
  onUpdateParams: (newParams: PhysicalParameters) => void;
  onUpdateInitialConditions: (ic: InitialConditions) => void;
  onClearInitialConditions: () => void;
  onUpdateTiming: (dt: number, duration: number, continuous: boolean) => void;
  onResetAllDefaults: () => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({
  params,
  initialConditions,
  dt,
  duration,
  continuous,
  onUpdateParams,
  onUpdateInitialConditions,
  onClearInitialConditions,
  onUpdateTiming,
  onResetAllDefaults,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localParams, setLocalParams] = useState<PhysicalParameters>({ ...params });

  useEffect(() => {
    setLocalParams({ ...params });
  }, [params]);

  const validateAndApplyParam = (key: keyof PhysicalParameters, rawVal: number) => {
    if (isNaN(rawVal)) return;
    const next = { ...localParams, [key]: rawVal };
    setLocalParams(next);

    if (next.M <= 0 || next.m <= 0 || next.l <= 0 || next.I <= 0 || next.g <= 0) {
      setErrorMsg('Physical constants M, m, l, I, g must all be strictly positive (> 0).');
      return;
    }
    if (next.b < 0) {
      setErrorMsg('Friction coefficient b cannot be negative (b >= 0).');
      return;
    }
    setErrorMsg(null);
    onUpdateParams(next);
  };

  const physicalFields: {
    key: keyof PhysicalParameters;
    label: string;
    unit: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: 'M', label: 'Cart Mass (M)', unit: 'kg', min: 0.1, max: 5.0, step: 0.05 },
    { key: 'm', label: 'Pendulum Mass (m)', unit: 'kg', min: 0.05, max: 2.0, step: 0.02 },
    { key: 'l', label: 'Pendulum Length (l)', unit: 'm', min: 0.05, max: 1.5, step: 0.02 },
    { key: 'I', label: 'Inertia (I)', unit: 'kg·m²', min: 0.0005, max: 0.2, step: 0.0005 },
    { key: 'b', label: 'Cart Friction (b)', unit: 'N·s/m', min: 0.0, max: 5.0, step: 0.02 },
    { key: 'g', label: 'Gravity (g)', unit: 'm/s²', min: 1.0, max: 25.0, step: 0.1 },
  ];

  const handleIcChange = (key: keyof InitialConditions, val: number) => {
    if (isNaN(val)) return;
    onUpdateInitialConditions({ ...initialConditions, [key]: val });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#3B82F6]" />
          )}
          <div className="p-1 rounded-md bg-[#DBEAFE] text-[#3B82F6]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-xs sm:text-sm text-[#1E293B]">
              Physical Parameters, Initial Conditions &amp; Solver Timing
            </span>
            <span className="hidden md:inline text-[11px] text-[#64748B] ml-2">
              (M={params.M}kg, m={params.m}kg, l={params.l}m, I={params.I}, b={params.b}, g={params.g})
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearInitialConditions}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#475569] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded-md transition-colors"
            title="Set initial x0, x_dot0, theta0, theta_dot0 to 0"
          >
            <Eraser className="w-3 h-3" />
            Clear ICs
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setLocalParams({ ...DEFAULT_PARAMETERS });
              onResetAllDefaults();
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#3B82F6] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-md transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FEE2E2] border border-[#F87171] text-xs text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Physical Parameters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {physicalFields.map((f) => (
              <div key={f.key} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#1E293B]">{f.label}</label>
                  <span className="text-[10px] font-mono text-[#64748B]">{f.unit}</span>
                </div>
                <input
                  type="number"
                  step={f.step}
                  min={f.min}
                  max={f.max * 5}
                  value={localParams[f.key]}
                  onChange={(e) => validateAndApplyParam(f.key, parseFloat(e.target.value))}
                  className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1 text-[#1E293B] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                />
                <input
                  type="range"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={Math.min(f.max, Math.max(f.min, localParams[f.key]))}
                  onChange={(e) => validateAndApplyParam(f.key, parseFloat(e.target.value))}
                  className="w-full accent-[#3B82F6] cursor-pointer h-1.5"
                />
              </div>
            ))}
          </div>

          {/* Initial Conditions & Time Step / Duration */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-[#F1F5F9]">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Init Pos x₀</label>
                <span className="text-[10px] font-mono text-[#64748B]">m</span>
              </div>
              <input
                type="number"
                step={0.05}
                min={-1.5}
                max={1.5}
                value={initialConditions.x0}
                onChange={(e) => handleIcChange('x0', parseFloat(e.target.value))}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
              <input
                type="range"
                min={-0.8}
                max={0.8}
                step={0.05}
                value={Math.min(0.8, Math.max(-0.8, initialConditions.x0))}
                onChange={(e) => handleIcChange('x0', parseFloat(e.target.value))}
                className="w-full accent-[#3B82F6] cursor-pointer h-1.5"
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Init Vel ẋ₀</label>
                <span className="text-[10px] font-mono text-[#64748B]">m/s</span>
              </div>
              <input
                type="number"
                step={0.1}
                min={-5}
                max={5}
                value={initialConditions.x_dot0}
                onChange={(e) => handleIcChange('x_dot0', parseFloat(e.target.value))}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
              <input
                type="range"
                min={-2}
                max={2}
                step={0.05}
                value={Math.min(2, Math.max(-2, initialConditions.x_dot0))}
                onChange={(e) => handleIcChange('x_dot0', parseFloat(e.target.value))}
                className="w-full accent-[#3B82F6] cursor-pointer h-1.5"
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Init Angle θ₀</label>
                <span className="text-[10px] font-mono text-[#64748B]">deg</span>
              </div>
              <input
                type="number"
                step={0.5}
                min={-180}
                max={180}
                value={initialConditions.theta0_deg}
                onChange={(e) => handleIcChange('theta0_deg', parseFloat(e.target.value))}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
              <input
                type="range"
                min={-30}
                max={30}
                step={0.5}
                value={Math.min(30, Math.max(-30, initialConditions.theta0_deg))}
                onChange={(e) => handleIcChange('theta0_deg', parseFloat(e.target.value))}
                className="w-full accent-[#F97316] cursor-pointer h-1.5"
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Init Ang Vel θ̇₀</label>
                <span className="text-[10px] font-mono text-[#64748B]">rad/s</span>
              </div>
              <input
                type="number"
                step={0.1}
                min={-10}
                max={10}
                value={initialConditions.theta_dot0}
                onChange={(e) => handleIcChange('theta_dot0', parseFloat(e.target.value))}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
              <input
                type="range"
                min={-3}
                max={3}
                step={0.1}
                value={Math.min(3, Math.max(-3, initialConditions.theta_dot0))}
                onChange={(e) => handleIcChange('theta_dot0', parseFloat(e.target.value))}
                className="w-full accent-[#F97316] cursor-pointer h-1.5"
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Time Step Δt</label>
                <span className="text-[10px] font-mono text-[#64748B]">s</span>
              </div>
              <input
                type="number"
                step={0.002}
                min={0.002}
                max={0.05}
                value={dt}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0.001 && val <= 0.05) {
                    onUpdateTiming(val, duration, continuous);
                  }
                }}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
              />
              <input
                type="range"
                min={0.002}
                max={0.04}
                step={0.002}
                value={dt}
                onChange={(e) => onUpdateTiming(parseFloat(e.target.value), duration, continuous)}
                className="w-full accent-[#3B82F6] cursor-pointer h-1.5"
              />
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#1E293B]">Duration (T)</label>
                <label className="flex items-center gap-1 text-[10px] font-semibold text-[#3B82F6] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={continuous}
                    onChange={(e) => onUpdateTiming(dt, duration, e.target.checked)}
                    className="rounded accent-[#3B82F6]"
                  />
                  Continuous
                </label>
              </div>
              <input
                type="number"
                step={1}
                min={1}
                max={60}
                disabled={continuous}
                value={duration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0.5 && val <= 120) {
                    onUpdateTiming(dt, val, continuous);
                  }
                }}
                className="w-full text-xs font-bold font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1 disabled:opacity-50"
              />
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                disabled={continuous}
                value={Math.min(30, duration)}
                onChange={(e) => onUpdateTiming(dt, parseFloat(e.target.value), continuous)}
                className="w-full accent-[#3B82F6] cursor-pointer h-1.5 disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
