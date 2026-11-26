import React, { useState, useEffect } from 'react';
import { Play, Wind, BarChart2, ShieldAlert } from 'lucide-react';
import {
  PhysicalParameters,
  InitialConditions,
  SimulationTrajectory,
  PerformanceMetrics,
  ComparisonTableRow,
  ModelType,
} from '../types';
import { apiClient } from '../services/api';
import { LiveCharts } from './LiveCharts';
import { PerformanceDashboard } from './PerformanceDashboard';
import { EducationalCard } from './EducationalCard';

interface ResultsAnalysisViewProps {
  params: PhysicalParameters;
  K: number[];
  initialConditions: InitialConditions;
  closedLoopPoles: string[];
  saturationEnabled: boolean;
  uMin: number;
  uMax: number;
}

export const ResultsAnalysisView: React.FC<ResultsAnalysisViewProps> = ({
  params,
  K,
  initialConditions,
  closedLoopPoles,
  saturationEnabled,
  uMin,
  uMax,
}) => {
  // Batch simulation runner state
  const [simMode, setSimMode] = useState<'nl_cl' | 'nl_ol' | 'lin_cl' | 'lin_ol'>('nl_cl');
  const [tEnd, setTEnd] = useState<number>(8.0);
  const [batchTraj, setBatchTraj] = useState<SimulationTrajectory | null>(null);
  const [batchMetrics, setBatchMetrics] = useState<PerformanceMetrics | null>(null);
  const [comparisonTable, setComparisonTable] = useState<ComparisonTableRow[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);

  // Disturbance testing state
  const [distMag, setDistMag] = useState<number>(4.0);
  const [distStart, setDistStart] = useState<number>(1.5);
  const [distDur, setDistDur] = useState<number>(0.2);
  const [distCtrlEnabled, setDistCtrlEnabled] = useState<boolean>(true);
  const [distModel, setDistModel] = useState<ModelType>('nonlinear');
  const [distResult, setDistResult] = useState<{
    disturbed: SimulationTrajectory;
    undisturbed: SimulationTrajectory;
    disturbed_metrics: PerformanceMetrics;
  } | null>(null);
  const [loadingDist, setLoadingDist] = useState(false);

  const runBatchAnalysis = async (mode = simMode) => {
    setLoadingSim(true);
    try {
      const modelType: ModelType = mode.startsWith('nl') ? 'nonlinear' : 'linear';
      const controlEnabled = mode.endsWith('cl');
      const initState = [
        initialConditions.x0,
        initialConditions.x_dot0,
        (initialConditions.theta0_deg * Math.PI) / 180,
        initialConditions.theta_dot0,
      ];

      const [simRes, openRes] = await Promise.all([
        apiClient.runSimulation({
          initial_state: initState,
          t_end: tEnd,
          dt: 0.01,
          disturbance_mag: 0,
          disturbance_start: 2.0,
          disturbance_duration: 0.2,
          manual_force: 0,
          model_type: modelType,
          control_enabled: controlEnabled,
          K: controlEnabled ? K : null,
          saturation_enabled: saturationEnabled,
          u_min: uMin,
          u_max: uMax,
          params,
        }),
        apiClient.runSimulation({
          initial_state: initState,
          t_end: Math.min(2.5, tEnd),
          dt: 0.01,
          disturbance_mag: 0,
          disturbance_start: 2.0,
          disturbance_duration: 0.2,
          manual_force: 0,
          model_type: 'nonlinear',
          control_enabled: false,
          K: null,
          saturation_enabled: false,
          u_min: -10,
          u_max: 10,
          params,
        }),
      ]);

      setBatchTraj(simRes.simulation);
      setBatchMetrics(simRes.metrics);

      const mOpen = openRes.metrics;
      const mSel = simRes.metrics;
      setComparisonTable([
        {
          metric: 'Asymptotic Stability',
          open_loop: mOpen.is_stable ? 'STABLE' : 'UNSTABLE (Diverges)',
          closed_loop: mSel.is_stable ? 'STABLE (Restored to 0°)' : 'UNSTABLE / Diverged',
          unit: 'State',
        },
        {
          metric: 'Settling Time (2% band)',
          open_loop: mOpen.settling_time_s !== null ? `${mOpen.settling_time_s.toFixed(2)} s` : 'Diverged (∞)',
          closed_loop: mSel.settling_time_s !== null ? `${mSel.settling_time_s.toFixed(2)} s` : 'Unsettled / Diverged',
          unit: 's',
        },
        {
          metric: 'Steady-State Angle Error',
          open_loop: `${mOpen.steady_state_angle_deg.toFixed(2)}°`,
          closed_loop: `${mSel.steady_state_angle_deg.toFixed(4)}°`,
          unit: 'deg',
        },
        {
          metric: 'Steady-State Cart Position',
          open_loop: `${mOpen.steady_state_cart_x_m.toFixed(2)} m`,
          closed_loop: `${mSel.steady_state_cart_x_m.toFixed(4)} m`,
          unit: 'm',
        },
        {
          metric: 'Peak Angular Displacement',
          open_loop: `${mOpen.peak_angle_deg.toFixed(2)}°`,
          closed_loop: `${mSel.peak_angle_deg.toFixed(2)}°`,
          unit: 'deg',
        },
        {
          metric: 'Peak Cart Excursion',
          open_loop: `${mOpen.peak_cart_displacement_m.toFixed(2)} m`,
          closed_loop: `${mSel.peak_cart_displacement_m.toFixed(3)} m`,
          unit: 'm',
        },
        {
          metric: 'Maximum Applied Force |u|',
          open_loop: '0.00 N',
          closed_loop: `${mSel.peak_control_force_N.toFixed(2)} N`,
          unit: 'N',
        },
        {
          metric: 'Control Effort ∫ u² dt',
          open_loop: '0.00 N²·s',
          closed_loop: `${mSel.control_effort_integral_N2s.toFixed(2)} N²·s`,
          unit: 'N²·s',
        },
      ]);
    } finally {
      setLoadingSim(false);
    }
  };

  const runDisturbanceExperiment = async () => {
    setLoadingDist(true);
    try {
      const res = await apiClient.runDisturbanceTest({
        initial_state: [0, 0, 0, 0],
        t_end: 8.0,
        dt: 0.01,
        disturbance_mag: distMag,
        disturbance_start: distStart,
        disturbance_duration: distDur,
        control_enabled: distCtrlEnabled,
        K: distCtrlEnabled ? K : null,
        saturation_enabled: saturationEnabled,
        u_min: uMin,
        u_max: uMax,
        model_type: distModel,
        params,
      });
      setDistResult(res);
    } finally {
      setLoadingDist(false);
    }
  };

  useEffect(() => {
    runBatchAnalysis(simMode);
    runDisturbanceExperiment();
  }, [params, K, saturationEnabled, uMin, uMax]);

  return (
    <div className="space-y-6">
      <EducationalCard
        title="Closed-Loop Simulation, Disturbance Rejection & Performance Analysis"
        laymanExplanation="Here we test our finished controller like a crash-test engineer. We measure how quickly the pendulum settles upright, how far the cart has to travel along the track, how hard the motor pushes, and whether the system survives sudden sideways bumps (disturbances) or motor force limits (saturation)."
        engineeringExplanation="SciPy RK45 integrates either the full nonlinear Lagrangian ODEs or the linear state-space Ẋ = (A - BK)X + Bd(t), including optional actuator saturation u = clip(-KX, u_min, u_max). Disturbance rejection demonstrates how closed-loop LHP eigenvalues absorb impulse energy and return X → 0, provided the perturbation stays within the nonlinear region of attraction."
      />

      {/* Batch Closed-Loop / Open-Loop Trajectory & Metrics */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#3B82F6]" />
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]">
                High-Precision Trajectory Evaluation (SciPy RK45)
              </h3>
              <p className="text-xs text-[#64748B]">
                Initial State: [x₀={initialConditions.x0}m, ẋ₀={initialConditions.x_dot0}m/s, θ₀={initialConditions.theta0_deg}°, θ̇₀={initialConditions.theta_dot0}rad/s]
                {saturationEnabled ? ` | Saturation [${uMin}, ${uMax}] N` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={simMode}
              onChange={(e) => {
                const m = e.target.value as any;
                setSimMode(m);
                runBatchAnalysis(m);
              }}
              className="text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1.5"
            >
              <option value="nl_cl">Nonlinear Controlled (u = -KX)</option>
              <option value="nl_ol">Nonlinear Uncontrolled (u = 0)</option>
              <option value="lin_cl">Linear Controlled (A - BK)</option>
              <option value="lin_ol">Linear Uncontrolled (A)</option>
            </select>

            <input
              type="number"
              step={1}
              min={1}
              max={20}
              value={tEnd}
              onChange={(e) => setTEnd(Math.max(1, parseFloat(e.target.value) || 8))}
              className="w-16 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2 py-1.5"
              title="Simulation duration (s)"
            />

            <button
              type="button"
              onClick={() => runBatchAnalysis(simMode)}
              disabled={loadingSim}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loadingSim ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {batchMetrics && batchMetrics.saturation_pct !== undefined && batchMetrics.saturation_pct > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FEF3C7] border border-[#F59E0B]/40 text-xs text-[#92400E]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Actuator saturated during <b>{batchMetrics.saturation_pct.toFixed(1)}%</b> of the trajectory (peak requested{' '}
              <b>{batchMetrics.peak_requested_force_N?.toFixed(2)} N</b> clipped to{' '}
              <b>{batchMetrics.peak_control_force_N.toFixed(2)} N</b>).
            </span>
          </div>
        )}

        {batchTraj && (
          <LiveCharts
            timeHistory={batchTraj.time}
            xHistory={batchTraj.x}
            xDotHistory={batchTraj.x_dot}
            thetaDegHistory={batchTraj.theta_deg}
            thetaDotHistory={batchTraj.theta_dot}
            uHistory={batchTraj.u_applied ?? batchTraj.u}
            uRequestedHistory={batchTraj.u_requested}
            disturbanceHistory={batchTraj.disturbance}
          />
        )}
      </div>

      {/* Interactive Disturbance Testing Section (Section 16) */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#F97316]" />
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]">Disturbance Rejection Testing</h3>
              <p className="text-xs text-[#64748B]">
                Inject a timed horizontal pulse starting from upright equilibrium and observe controller recovery
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runDisturbanceExperiment}
            disabled={loadingDist}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg"
          >
            <Wind className="w-3.5 h-3.5" />
            {loadingDist ? 'Running...' : 'Run Disturbance Test'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-xs">
          <div>
            <label className="font-semibold text-[#64748B] block mb-1">Force (N)</label>
            <input
              type="number"
              step={0.5}
              value={distMag}
              onChange={(e) => setDistMag(parseFloat(e.target.value) || 0)}
              className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="font-semibold text-[#64748B] block mb-1">Start Time (s)</label>
            <input
              type="number"
              step={0.1}
              min={0}
              max={6}
              value={distStart}
              onChange={(e) => setDistStart(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="font-semibold text-[#64748B] block mb-1">Duration (s)</label>
            <input
              type="number"
              step={0.05}
              min={0.02}
              max={2}
              value={distDur}
              onChange={(e) => setDistDur(Math.max(0.02, parseFloat(e.target.value) || 0.2))}
              className="w-full font-mono bg-white border border-[#CBD5E1] rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="font-semibold text-[#64748B] block mb-1">Controller</label>
            <button
              type="button"
              onClick={() => setDistCtrlEnabled(!distCtrlEnabled)}
              className={`w-full py-1 px-2 rounded font-bold text-white ${
                distCtrlEnabled ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
              }`}
            >
              {distCtrlEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div>
            <label className="font-semibold text-[#64748B] block mb-1">Model</label>
            <select
              value={distModel}
              onChange={(e) => setDistModel(e.target.value as ModelType)}
              className="w-full bg-white border border-[#CBD5E1] rounded px-2 py-1 font-semibold"
            >
              <option value="nonlinear">Nonlinear</option>
              <option value="linear">Linear</option>
            </select>
          </div>
        </div>

        {distResult && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs font-mono bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span>
                Status:{' '}
                <b className={distResult.disturbed_metrics.is_stable ? 'text-[#16A34A]' : 'text-[#DC2626]'}>
                  {distResult.disturbed_metrics.is_stable ? 'RECOVERED (STABLE)' : 'TOPPLED (EXCEEDED BASIN)'}
                </b>
              </span>
              <span>
                Peak Deflection: <b>{distResult.disturbed_metrics.peak_angle_deg.toFixed(2)}°</b>
              </span>
              <span>
                Peak Control Effort: <b>{distResult.disturbed_metrics.peak_control_force_N.toFixed(2)} N</b>
              </span>
              <span>
                Final Angle: <b>{distResult.disturbed_metrics.steady_state_angle_deg.toFixed(4)}°</b>
              </span>
            </div>

            <LiveCharts
              timeHistory={distResult.disturbed.time}
              xHistory={distResult.disturbed.x}
              xDotHistory={distResult.disturbed.x_dot}
              thetaDegHistory={distResult.disturbed.theta_deg}
              thetaDotHistory={distResult.disturbed.theta_dot}
              uHistory={distResult.disturbed.u_applied ?? distResult.disturbed.u}
              uRequestedHistory={distResult.disturbed.u_requested}
              disturbanceHistory={distResult.disturbed.disturbance}
            />
          </div>
        )}
      </div>

      {/* Metrics Summary & Open-Loop vs Closed-Loop Table */}
      {batchMetrics && (
        <PerformanceDashboard
          metrics={batchMetrics}
          comparisonTable={comparisonTable}
          closedLoopPoles={closedLoopPoles}
        />
      )}
    </div>
  );
};
