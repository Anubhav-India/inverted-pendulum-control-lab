import {
  PhysicalParameters,
  ComplexNumber,
  ConsolidatedAnalysisResponse,
  SimulationTrajectory,
  PerformanceMetrics,
  ComparisonTableRow,
  RealtimeSimSnapshot,
} from '../types';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE || '').replace(/\/+$/, '');

export function getWsSimulationUrl(): string {
  const envWs = (import.meta as any).env?.VITE_WS_URL;
  if (envWs) return envWs;
  if (API_BASE) {
    return API_BASE.replace(/^http/, 'ws') + '/ws/simulation';
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Vite dev server proxies /ws -> ws://127.0.0.1:8000
  return `${proto}//${window.location.host}/ws/simulation`;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.detail) detail = errBody.detail;
    } catch {
      // ignore parse failure
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  health: () => requestJson<{ status: string; service: string; version?: string }>('/api/health'),

  fetchConsolidatedAnalysis: (
    params: PhysicalParameters,
    measuredStates: string[],
    desiredPoles: ComplexNumber[]
  ) =>
    requestJson<ConsolidatedAnalysisResponse>('/api/analysis/all', {
      method: 'POST',
      body: JSON.stringify({
        params,
        measured_states: measuredStates,
        desired_poles: desiredPoles,
      }),
    }),

  resetParameters: () =>
    requestJson<{ message: string; raw: PhysicalParameters }>('/api/parameters/reset', {
      method: 'POST',
    }),

  solveNonlinearAccelerations: (payload: {
    x: number;
    x_dot: number;
    theta: number;
    theta_dot: number;
    u: number;
    params: PhysicalParameters;
  }) =>
    requestJson<{
      inputs: Record<string, number>;
      outputs: { x_ddot: number; theta_ddot: number; theta_ddot_deg: number; determinant_D: number };
      breakdown: Record<string, number>;
    }>('/api/stage1/solve-accelerations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSmallAngleAnalysis: (thetaDeg: number) =>
    requestJson<{
      point: {
        theta_deg: number;
        theta_rad: number;
        sin_exact: number;
        sin_approx: number;
        sin_abs_err: number;
        sin_rel_err_pct: number;
        cos_exact: number;
        cos_approx: number;
        cos_abs_err: number;
        cos_rel_err_pct: number;
        is_accurate_regime: boolean;
      };
      curve: Array<{
        theta_deg: number;
        sin_exact: number;
        sin_approx: number;
        sin_rel_err_pct: number;
        cos_exact: number;
        cos_rel_err_pct: number;
      }>;
    }>(`/api/stage2/small-angle?theta_deg=${encodeURIComponent(thetaDeg)}`),

  compareLinearVsNonlinear: (payload: {
    initial_state: number[];
    t_end: number;
    dt: number;
    manual_force: number;
    control_enabled: boolean;
    K: number[] | null;
    saturation_enabled: boolean;
    u_min: number;
    u_max: number;
    params: PhysicalParameters;
  }) =>
    requestJson<{
      nonlinear: SimulationTrajectory;
      linear: SimulationTrajectory;
      theta_error_deg: number[];
      x_error_m: number[];
      max_theta_error_deg: number;
      max_x_error_m: number;
    }>('/api/stage2/linear-vs-nonlinear', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  runSimulation: (payload: {
    initial_state: number[];
    t_end: number;
    dt: number;
    disturbance_mag: number;
    disturbance_start: number;
    disturbance_duration: number;
    manual_force: number;
    model_type: 'nonlinear' | 'linear';
    control_enabled: boolean;
    K: number[] | null;
    saturation_enabled: boolean;
    u_min: number;
    u_max: number;
    params: PhysicalParameters;
  }) =>
    requestJson<{ simulation: SimulationTrajectory; metrics: PerformanceMetrics }>(
      '/api/simulation/run',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  runDisturbanceTest: (payload: {
    initial_state: number[];
    t_end: number;
    dt: number;
    disturbance_mag: number;
    disturbance_start: number;
    disturbance_duration: number;
    control_enabled: boolean;
    K: number[] | null;
    saturation_enabled: boolean;
    u_min: number;
    u_max: number;
    model_type: 'nonlinear' | 'linear';
    params: PhysicalParameters;
  }) =>
    requestJson<{
      disturbed: SimulationTrajectory;
      undisturbed: SimulationTrajectory;
      disturbed_metrics: PerformanceMetrics;
      undisturbed_metrics: PerformanceMetrics;
    }>('/api/simulation/disturbance-test', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getBenchmarks: () =>
    requestJson<{
      controller_gain: number[];
      benchmarks: Record<string, SimulationTrajectory>;
      metrics: Record<string, PerformanceMetrics>;
      comparison_table: ComparisonTableRow[];
    }>('/api/simulation/benchmarks'),
};

export type WsCommand =
  | { cmd: 'start' }
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  | { cmd: 'reset' }
  | { cmd: 'clear_ic' }
  | { cmd: 'step' }
  | { cmd: 'set_speed'; speed: number }
  | {
      cmd: 'set_config';
      model_type?: 'nonlinear' | 'linear';
      control_mode?: 'auto' | 'manual' | 'auto_with_disturbance';
      dt?: number;
      duration?: number;
      continuous?: boolean;
      saturation_enabled?: boolean;
      u_min?: number;
      u_max?: number;
    }
  | { cmd: 'update_params'; params: PhysicalParameters }
  | { cmd: 'update_K'; K: number[] }
  | { cmd: 'update_initial_state'; initial_state: number[] }
  | { cmd: 'apply_manual_force'; force: number; duration?: number | null }
  | { cmd: 'release_manual_force' }
  | { cmd: 'apply_impulse'; force: number; duration: number };

export class SimulationWebSocketClient {
  private ws: WebSocket | null = null;
  private onMessageCb: (snap: RealtimeSimSnapshot) => void;
  private onStatusCb: (connected: boolean) => void;
  private reconnectTimer: number | null = null;
  private disposed = false;

  constructor(
    onMessage: (snap: RealtimeSimSnapshot) => void,
    onStatus: (connected: boolean) => void
  ) {
    this.onMessageCb = onMessage;
    this.onStatusCb = onStatus;
  }

  connect() {
    if (this.disposed) return;
    try {
      const url = getWsSimulationUrl();
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.onStatusCb(true);
      };
      this.ws.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as RealtimeSimSnapshot;
          if (parsed && parsed.type === 'sim_state') {
            this.onMessageCb(parsed);
          }
        } catch {
          // ignore malformed frames
        }
      };
      this.ws.onclose = () => {
        this.onStatusCb(false);
        if (!this.disposed) {
          this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
        }
      };
      this.ws.onerror = () => {
        this.onStatusCb(false);
      };
    } catch {
      this.onStatusCb(false);
    }
  }

  send(command: WsCommand): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
      return true;
    }
    return false;
  }

  dispose() {
    this.disposed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
