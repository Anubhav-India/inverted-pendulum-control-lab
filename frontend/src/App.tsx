import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ParameterPanel } from './components/ParameterPanel';
import { SimulationCanvas } from './components/SimulationCanvas';
import { SimulationControls } from './components/SimulationControls';
import { ForceControlPanel } from './components/ForceControlPanel';
import { LiveCharts } from './components/LiveCharts';
import { MathematicalModellingView } from './components/MathematicalModellingView';
import { LinearizationView } from './components/LinearizationView';
import { StateSpaceView } from './components/StateSpaceView';
import { StabilityAnalysisView } from './components/StabilityAnalysisView';
import { ControllabilityView } from './components/ControllabilityView';
import { StateFeedbackView } from './components/StateFeedbackView';
import { AckermannView } from './components/AckermannView';
import { ResultsAnalysisView } from './components/ResultsAnalysisView';
import { DEFAULT_PARAMETERS } from './services/mathEngine';
import { apiClient, SimulationWebSocketClient } from './services/api';
import {
  PhysicalParameters,
  InitialConditions,
  ComplexNumber,
  ConsolidatedAnalysisResponse,
  RealtimeSimSnapshot,
  ModelType,
  ControlMode,
} from './types';

const DEFAULT_POLES: ComplexNumber[] = [
  { real: -2.0, imag: 0.0 },
  { real: -2.0, imag: 0.0 },
  { real: -1.0, imag: 1.0 },
  { real: -1.0, imag: -1.0 },
];

const DEFAULT_IC: InitialConditions = {
  x0: 0.0,
  x_dot0: 0.0,
  theta0_deg: 5.0,
  theta_dot0: 0.0,
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('simulation');

  // Authoritative Parameter & Controller Design State
  const [params, setParams] = useState<PhysicalParameters>({ ...DEFAULT_PARAMETERS });
  const [initialConditions, setInitialConditions] = useState<InitialConditions>({ ...DEFAULT_IC });
  const [measuredStates, setMeasuredStates] = useState<string[]>(['x', 'theta']);
  const [desiredPoles, setDesiredPoles] = useState<ComplexNumber[]>(DEFAULT_POLES);

  // Solver & Actuator Settings
  const [dt, setDt] = useState<number>(0.01);
  const [duration, setDuration] = useState<number>(30.0);
  const [continuous, setContinuous] = useState<boolean>(true);
  const [modelType, setModelType] = useState<ModelType>('nonlinear');
  const [controlMode, setControlMode] = useState<ControlMode>('auto');
  const [speed, setSpeed] = useState<number>(1.0);
  const [saturationEnabled, setSaturationEnabled] = useState<boolean>(false);
  const [uMin, setUMin] = useState<number>(-10.0);
  const [uMax, setUMax] = useState<number>(10.0);

  // Backend Analysis State
  const [analysis, setAnalysis] = useState<ConsolidatedAnalysisResponse | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Live WebSocket Simulation Snapshot
  const [simSnap, setSimSnap] = useState<RealtimeSimSnapshot>({
    type: 'sim_state',
    t: 0,
    status: 'reset',
    model_type: 'nonlinear',
    control_mode: 'auto',
    control_enabled: true,
    speed: 1.0,
    dt: 0.01,
    duration: 30.0,
    continuous: true,
    saturation_enabled: false,
    u_min: -10.0,
    u_max: 10.0,
    state: {
      x: 0,
      x_dot: 0,
      theta: (5.0 * Math.PI) / 180,
      theta_deg: 5.0,
      theta_dot: 0,
    },
    telemetry: {
      x_ddot: 0,
      theta_ddot: 0,
      u_requested: 0,
      u_applied: 0,
      u_external: 0,
      u_total: 0,
      is_saturated: false,
    },
  });

  // Live Chart Histories
  const [timeHistory, setTimeHistory] = useState<number[]>([0]);
  const [xHistory, setXHistory] = useState<number[]>([0]);
  const [xDotHistory, setXDotHistory] = useState<number[]>([0]);
  const [thetaDegHistory, setThetaDegHistory] = useState<number[]>([5.0]);
  const [thetaDotHistory, setThetaDotHistory] = useState<number[]>([0]);
  const [uHistory, setUHistory] = useState<number[]>([0]);
  const [uReqHistory, setUReqHistory] = useState<number[]>([0]);
  const [distHistory, setDistHistory] = useState<number[]>([0]);

  const lastRecordedTimeRef = useRef<number>(0);
  const wsClientRef = useRef<SimulationWebSocketClient | null>(null);

  const resetChartHistoriesFromSnap = useCallback((snap: RealtimeSimSnapshot) => {
    lastRecordedTimeRef.current = snap.t;
    setTimeHistory([snap.t]);
    setXHistory([snap.state.x]);
    setXDotHistory([snap.state.x_dot]);
    setThetaDegHistory([snap.state.theta_deg]);
    setThetaDotHistory([snap.state.theta_dot]);
    setUHistory([snap.telemetry.u_applied]);
    setUReqHistory([snap.telemetry.u_requested]);
    setDistHistory([snap.telemetry.u_external]);
  }, []);

  // Connect WebSocket Simulation Stream
  useEffect(() => {
    const client = new SimulationWebSocketClient(
      (snap) => {
        setSimSnap(snap);
        if (snap.status === 'reset' && snap.t === 0) {
          resetChartHistoriesFromSnap(snap);
        } else if (snap.t > lastRecordedTimeRef.current + 1e-6) {
          lastRecordedTimeRef.current = snap.t;
          setTimeHistory((prev) => [...prev.slice(-450), snap.t]);
          setXHistory((prev) => [...prev.slice(-450), snap.state.x]);
          setXDotHistory((prev) => [...prev.slice(-450), snap.state.x_dot]);
          setThetaDegHistory((prev) => [...prev.slice(-450), snap.state.theta_deg]);
          setThetaDotHistory((prev) => [...prev.slice(-450), snap.state.theta_dot]);
          setUHistory((prev) => [...prev.slice(-450), snap.telemetry.u_applied]);
          setUReqHistory((prev) => [...prev.slice(-450), snap.telemetry.u_requested]);
          setDistHistory((prev) => [...prev.slice(-450), snap.telemetry.u_external]);
        }
      },
      (connected) => {
        setWsConnected(connected);
      }
    );

    wsClientRef.current = client;
    client.connect();

    return () => {
      client.dispose();
      wsClientRef.current = null;
    };
  }, [resetChartHistoriesFromSnap]);

  // Synchronize Python Analysis whenever params, measuredStates, or desiredPoles change
  useEffect(() => {
    let cancelled = false;
    const syncAnalysis = async () => {
      try {
        const res = await apiClient.fetchConsolidatedAnalysis(params, measuredStates, desiredPoles);
        if (cancelled) return;
        setAnalysis(res);
        setBackendConnected(true);
        setBackendError(null);

        if (wsClientRef.current) {
          wsClientRef.current.send({ cmd: 'update_params', params });
          if (res.ackermann?.feasible && res.ackermann?.K) {
            wsClientRef.current.send({ cmd: 'update_K', K: res.ackermann.K });
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        setBackendConnected(false);
        setBackendError(err?.message || 'Unable to connect to Python FastAPI backend at port 8000.');
      }
    };
    syncAnalysis();
    return () => {
      cancelled = true;
    };
  }, [params, measuredStates, desiredPoles]);

  // Push initial conditions & solver config when WS reconnects
  useEffect(() => {
    if (!wsConnected || !wsClientRef.current) return;
    wsClientRef.current.send({ cmd: 'update_params', params });
    if (analysis?.ackermann?.K) {
      wsClientRef.current.send({ cmd: 'update_K', K: analysis.ackermann.K });
    }
    wsClientRef.current.send({
      cmd: 'update_initial_state',
      initial_state: [
        initialConditions.x0,
        initialConditions.x_dot0,
        (initialConditions.theta0_deg * Math.PI) / 180,
        initialConditions.theta_dot0,
      ],
    });
    wsClientRef.current.send({
      cmd: 'set_config',
      model_type: modelType,
      control_mode: controlMode,
      dt,
      duration,
      continuous,
      saturation_enabled: saturationEnabled,
      u_min: uMin,
      u_max: uMax,
    });
    wsClientRef.current.send({ cmd: 'set_speed', speed });
  }, [wsConnected]);

  // Handlers
  const handleUpdateParams = (newParams: PhysicalParameters) => {
    setParams(newParams);
    wsClientRef.current?.send({ cmd: 'update_params', params: newParams });
  };

  const handleUpdateInitialConditions = (ic: InitialConditions) => {
    setInitialConditions(ic);
    wsClientRef.current?.send({
      cmd: 'update_initial_state',
      initial_state: [
        ic.x0,
        ic.x_dot0,
        (ic.theta0_deg * Math.PI) / 180,
        ic.theta_dot0,
      ],
    });
  };

  const handleClearInitialConditions = () => {
    const zeroIC: InitialConditions = { x0: 0, x_dot0: 0, theta0_deg: 0, theta_dot0: 0 };
    setInitialConditions(zeroIC);
    wsClientRef.current?.send({ cmd: 'clear_ic' });
  };

  const handleResetDefaults = () => {
    setParams({ ...DEFAULT_PARAMETERS });
    setInitialConditions({ ...DEFAULT_IC });
    setDesiredPoles(DEFAULT_POLES);
    setDt(0.01);
    setDuration(30.0);
    setContinuous(true);
    setSaturationEnabled(false);
    setUMin(-10);
    setUMax(10);
    setControlMode('auto');
    setModelType('nonlinear');
    setSpeed(1.0);
    wsClientRef.current?.send({ cmd: 'update_params', params: DEFAULT_PARAMETERS });
    wsClientRef.current?.send({
      cmd: 'update_initial_state',
      initial_state: [0, 0, (5.0 * Math.PI) / 180, 0],
    });
    wsClientRef.current?.send({
      cmd: 'set_config',
      model_type: 'nonlinear',
      control_mode: 'auto',
      dt: 0.01,
      duration: 30.0,
      continuous: true,
      saturation_enabled: false,
      u_min: -10,
      u_max: 10,
    });
    wsClientRef.current?.send({ cmd: 'reset' });
  };

  const handleUpdateTiming = (newDt: number, newDuration: number, newCont: boolean) => {
    setDt(newDt);
    setDuration(newDuration);
    setContinuous(newCont);
    wsClientRef.current?.send({
      cmd: 'set_config',
      dt: newDt,
      duration: newDuration,
      continuous: newCont,
    });
  };

  const handleSelectSimMode = (newModel: ModelType, controlEnabled: boolean) => {
    const newControlMode: ControlMode = controlEnabled ? 'auto' : 'manual';
    setModelType(newModel);
    setControlMode(newControlMode);
    wsClientRef.current?.send({
      cmd: 'set_config',
      model_type: newModel,
      control_mode: newControlMode,
    });
  };

  const handleControlModeChange = (mode: ControlMode) => {
    setControlMode(mode);
    wsClientRef.current?.send({
      cmd: 'set_config',
      control_mode: mode,
    });
  };

  const handleSaturationChange = (enabled: boolean, minVal: number, maxVal: number) => {
    setSaturationEnabled(enabled);
    setUMin(minVal);
    setUMax(maxVal);
    wsClientRef.current?.send({
      cmd: 'set_config',
      saturation_enabled: enabled,
      u_min: minVal,
      u_max: maxVal,
    });
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    wsClientRef.current?.send({ cmd: 'set_speed', speed: newSpeed });
  };

  const handleSelectPreset = (testId: 1 | 2 | 3 | 4) => {
    if (testId === 1 || testId === 2) {
      const deg = testId === 1 ? 5.0 : 10.0;
      const ic: InitialConditions = { x0: 0, x_dot0: 0, theta0_deg: deg, theta_dot0: 0 };
      setInitialConditions(ic);
      setModelType('nonlinear');
      setControlMode('auto');
      wsClientRef.current?.send({
        cmd: 'set_config',
        model_type: 'nonlinear',
        control_mode: 'auto',
      });
      wsClientRef.current?.send({
        cmd: 'update_initial_state',
        initial_state: [0, 0, (deg * Math.PI) / 180, 0],
      });
      wsClientRef.current?.send({ cmd: 'reset' });
      wsClientRef.current?.send({ cmd: 'start' });
    } else if (testId === 3) {
      const ic: InitialConditions = { x0: 0, x_dot0: 0, theta0_deg: 0, theta_dot0: 0 };
      setInitialConditions(ic);
      setModelType('nonlinear');
      setControlMode('auto_with_disturbance');
      wsClientRef.current?.send({
        cmd: 'set_config',
        model_type: 'nonlinear',
        control_mode: 'auto_with_disturbance',
      });
      wsClientRef.current?.send({
        cmd: 'update_initial_state',
        initial_state: [0, 0, 0, 0],
      });
      wsClientRef.current?.send({ cmd: 'reset' });
      wsClientRef.current?.send({ cmd: 'start' });
      window.setTimeout(() => {
        wsClientRef.current?.send({ cmd: 'apply_impulse', force: 10.0, duration: 0.05 });
      }, 600);
    } else if (testId === 4) {
      const ic: InitialConditions = { x0: 0, x_dot0: 0, theta0_deg: 5.0, theta_dot0: 0 };
      setInitialConditions(ic);
      setModelType('nonlinear');
      setControlMode('manual');
      wsClientRef.current?.send({
        cmd: 'set_config',
        model_type: 'nonlinear',
        control_mode: 'manual',
      });
      wsClientRef.current?.send({
        cmd: 'update_initial_state',
        initial_state: [0, 0, (5.0 * Math.PI) / 180, 0],
      });
      wsClientRef.current?.send({ cmd: 'reset' });
      wsClientRef.current?.send({ cmd: 'start' });
    }
  };

  const currentK = analysis?.ackermann?.K ?? [-0.1794, -0.4588, -10.0188, -1.4635];
  const isControllable = analysis?.controllability?.is_controllable ?? true;
  const isClStable = analysis?.ackermann?.is_closed_loop_stable ?? true;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isControllable={isControllable}
        isClosedLoopStable={isClStable}
        backendConnected={backendConnected}
        wsConnected={wsConnected}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 space-y-5">
        {backendError && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <b>Python Backend Disconnected:</b> {backendError} Start the backend with{' '}
                <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#FECACA]">
                  uvicorn main:app --reload
                </code>{' '}
                in <code className="font-mono">backend/</code>.
              </span>
            </div>
          </div>
        )}

        {/* TAB 1: MAIN INTERACTIVE SIMULATION */}
        {activeTab === 'simulation' && (
          <div className="space-y-5">
            {/* Centerpiece Animation + Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <SimulationCanvas
                  state={{
                    x: simSnap.state.x,
                    x_dot: simSnap.state.x_dot,
                    theta: simSnap.state.theta,
                    theta_dot: simSnap.state.theta_dot,
                  }}
                  params={params}
                  simTime={simSnap.t}
                  uRequested={simSnap.telemetry.u_requested}
                  uApplied={simSnap.telemetry.u_applied}
                  uExternal={simSnap.telemetry.u_external}
                  isSaturated={simSnap.telemetry.is_saturated}
                  isControlEnabled={simSnap.control_enabled}
                  modelType={simSnap.model_type}
                  controlMode={simSnap.control_mode}
                  status={simSnap.status}
                />
              </div>

              <div className="lg:col-span-4">
                <SimulationControls
                  status={simSnap.status}
                  modelType={modelType}
                  controlMode={controlMode}
                  speed={speed}
                  onStart={() => wsClientRef.current?.send({ cmd: 'start' })}
                  onPause={() => wsClientRef.current?.send({ cmd: 'pause' })}
                  onResume={() => wsClientRef.current?.send({ cmd: 'resume' })}
                  onReset={() => wsClientRef.current?.send({ cmd: 'reset' })}
                  onStep={() => wsClientRef.current?.send({ cmd: 'step' })}
                  onClearICs={handleClearInitialConditions}
                  onSpeedChange={handleSpeedChange}
                  onSelectSimMode={handleSelectSimMode}
                  onSelectPreset={handleSelectPreset}
                />
              </div>
            </div>

            {/* Manual Force Control & Saturation */}
            <ForceControlPanel
              controlMode={controlMode}
              onControlModeChange={handleControlModeChange}
              onApplyManualForce={(force, dur) =>
                wsClientRef.current?.send({ cmd: 'apply_manual_force', force, duration: dur })
              }
              onReleaseManualForce={() =>
                wsClientRef.current?.send({ cmd: 'release_manual_force' })
              }
              onApplyImpulse={(force, dur) =>
                wsClientRef.current?.send({ cmd: 'apply_impulse', force, duration: dur })
              }
              uRequested={simSnap.telemetry.u_requested}
              uApplied={simSnap.telemetry.u_applied}
              uExternal={simSnap.telemetry.u_external}
              isSaturated={simSnap.telemetry.is_saturated}
              saturationEnabled={saturationEnabled}
              uMin={uMin}
              uMax={uMax}
              onSaturationChange={handleSaturationChange}
            />

            {/* Physical Parameters, Initial Conditions & Timing */}
            <ParameterPanel
              params={params}
              initialConditions={initialConditions}
              dt={dt}
              duration={duration}
              continuous={continuous}
              onUpdateParams={handleUpdateParams}
              onUpdateInitialConditions={handleUpdateInitialConditions}
              onClearInitialConditions={handleClearInitialConditions}
              onUpdateTiming={handleUpdateTiming}
              onResetAllDefaults={handleResetDefaults}
            />

            {/* Live Charts */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
              <LiveCharts
                timeHistory={timeHistory}
                xHistory={xHistory}
                xDotHistory={xDotHistory}
                thetaDegHistory={thetaDegHistory}
                thetaDotHistory={thetaDotHistory}
                uHistory={uHistory}
                uRequestedHistory={uReqHistory}
                disturbanceHistory={distHistory}
              />
            </div>
          </div>
        )}

        {/* TAB 2: MATHEMATICAL MODELLING */}
        {activeTab === 'modelling' && (
          <div className="space-y-5">
            <ParameterPanel
              params={params}
              initialConditions={initialConditions}
              dt={dt}
              duration={duration}
              continuous={continuous}
              onUpdateParams={handleUpdateParams}
              onUpdateInitialConditions={handleUpdateInitialConditions}
              onClearInitialConditions={handleClearInitialConditions}
              onUpdateTiming={handleUpdateTiming}
              onResetAllDefaults={handleResetDefaults}
            />
            <MathematicalModellingView params={params} lagrangian={analysis?.lagrangian ?? null} />
          </div>
        )}

        {/* TAB 3: LINEARIZATION */}
        {activeTab === 'linearization' && (
          <LinearizationView params={params} K={currentK} />
        )}

        {/* TAB 4: STATE SPACE */}
        {activeTab === 'statespace' && (
          <StateSpaceView
            params={params}
            linearModel={analysis?.linearized ?? null}
            measuredStates={measuredStates}
            onMeasuredStatesChange={setMeasuredStates}
          />
        )}

        {/* TAB 5: STABILITY ANALYSIS */}
        {activeTab === 'stability' && (
          <StabilityAnalysisView params={params} stability={analysis?.stability ?? null} />
        )}

        {/* TAB 6: CONTROLLABILITY */}
        {activeTab === 'controllability' && (
          <ControllabilityView controllability={analysis?.controllability ?? null} />
        )}

        {/* TAB 7: STATE FEEDBACK */}
        {activeTab === 'statefeedback' && (
          <StateFeedbackView
            ackermann={analysis?.ackermann ?? null}
            controlMode={controlMode}
            onControlModeChange={handleControlModeChange}
            saturationEnabled={saturationEnabled}
            uMin={uMin}
            uMax={uMax}
            onSaturationChange={handleSaturationChange}
            polePresets={analysis?.pole_presets ?? {}}
            onSelectPresetPoles={(key) => {
              const preset = analysis?.pole_presets?.[key];
              if (preset) setDesiredPoles(preset.poles);
            }}
            onGoToAckermann={() => setActiveTab('ackermann')}
          />
        )}

        {/* TAB 8: ACKERMANN'S FORMULA */}
        {activeTab === 'ackermann' && (
          <AckermannView
            linearModel={analysis?.linearized ?? null}
            controllability={analysis?.controllability ?? null}
            ackermann={analysis?.ackermann ?? null}
            desiredPoles={desiredPoles}
            polePresets={analysis?.pole_presets ?? {}}
            onUpdatePoles={setDesiredPoles}
            onApplyToSimulation={() => {
              setControlMode('auto');
              wsClientRef.current?.send({ cmd: 'set_config', control_mode: 'auto' });
              wsClientRef.current?.send({ cmd: 'reset' });
              setActiveTab('simulation');
            }}
          />
        )}

        {/* TAB 9: RESULTS AND ANALYSIS */}
        {activeTab === 'results' && (
          <ResultsAnalysisView
            params={params}
            K={currentK}
            initialConditions={initialConditions}
            closedLoopPoles={analysis?.ackermann?.closed_loop_eigenvalues ?? []}
            saturationEnabled={saturationEnabled}
            uMin={uMin}
            uMax={uMax}
          />
        )}
      </main>
    </div>
  );
};
