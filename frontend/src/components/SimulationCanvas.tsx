import React, { useRef, useEffect } from 'react';
import { StateVector, PhysicalParameters, SimulationStatus, ModelType, ControlMode } from '../types';

interface SimulationCanvasProps {
  state: StateVector;
  params: PhysicalParameters;
  simTime: number;
  uRequested: number;
  uApplied: number;
  uExternal: number;
  isSaturated: boolean;
  isControlEnabled: boolean;
  modelType: ModelType;
  controlMode: ControlMode;
  status: SimulationStatus;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  state,
  params,
  simTime,
  uRequested,
  uApplied,
  uExternal,
  isSaturated,
  isControlEnabled,
  modelType,
  controlMode,
  status,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clean light engineering canvas background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < width; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy < height; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    const pixelsPerMeter = Math.min(280, width / 2.6);
    // Smooth camera pan if cart moves beyond +/- 0.8m so it never vanishes off-screen
    const panOffsetMeters = Math.abs(state.x) > 0.8 ? state.x - Math.sign(state.x) * 0.8 : 0;
    const worldOriginX = width / 2 - panOffsetMeters * pixelsPerMeter;
    const trackY = height * 0.72;
    const rodPixelLength = Math.min(height * 0.44, Math.max(95, params.l * pixelsPerMeter * 1.45));

    const cartPixelX = worldOriginX + state.x * pixelsPerMeter;
    const cartWidth = 92;
    const cartHeight = 42;
    const wheelRadius = 9;

    // 1. Horizontal Rail
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(24, trackY);
    ctx.lineTo(width - 24, trackY);
    ctx.stroke();

    // Rail tick marks (relative to world coordinates)
    const minMeter = Math.floor((24 - worldOriginX) / pixelsPerMeter / 0.25) * 0.25;
    const maxMeter = Math.ceil((width - 24 - worldOriginX) / pixelsPerMeter / 0.25) * 0.25;
    ctx.strokeStyle = '#CBD5E1';
    ctx.fillStyle = '#64748B';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1.5;

    for (let m = minMeter; m <= maxMeter + 1e-6; m += 0.25) {
      const tx = worldOriginX + m * pixelsPerMeter;
      if (tx >= 28 && tx <= width - 28) {
        const isZero = Math.abs(m) < 1e-6;
        ctx.strokeStyle = isZero ? '#3B82F6' : '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(tx, trackY);
        ctx.lineTo(tx, trackY + (isZero ? 11 : 7));
        ctx.stroke();
        if (Math.abs(Math.round(m * 2) - m * 2) < 1e-6) {
          ctx.fillStyle = isZero ? '#3B82F6' : '#64748B';
          ctx.fillText(`${m.toFixed(1)}m`, tx, trackY + 22);
        }
      }
    }

    // World origin vertical guide
    if (worldOriginX >= 30 && worldOriginX <= width - 30) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(worldOriginX, trackY - 150);
      ctx.lineTo(worldOriginX, trackY + 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Cart Body & Wheels
    const cartLeft = cartPixelX - cartWidth / 2;
    const cartTop = trackY - wheelRadius * 2 - cartHeight;

    const cartGrad = ctx.createLinearGradient(cartLeft, cartTop, cartLeft, cartTop + cartHeight);
    cartGrad.addColorStop(0, '#F8FAFC');
    cartGrad.addColorStop(1, '#E2E8F0');

    ctx.fillStyle = cartGrad;
    ctx.strokeStyle = status === 'unstable' ? '#DC2626' : '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cartLeft, cartTop, cartWidth, cartHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Wheels
    const wheelLeftX = cartPixelX - cartWidth * 0.32;
    const wheelRightX = cartPixelX + cartWidth * 0.32;
    const wheelCenterY = trackY - wheelRadius;
    [wheelLeftX, wheelRightX].forEach((wx) => {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(wx, wheelCenterY, wheelRadius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(wx, wheelCenterY, wheelRadius * 0.38, 0, 2 * Math.PI);
      ctx.fill();
    });

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`M=${params.M.toFixed(2)}kg`, cartPixelX, cartTop + 25);

    // 3. Pivot & Upright Reference Line
    const pivotX = cartPixelX;
    const pivotY = cartTop;

    // Subtle ±5 deg upright stability cone
    ctx.fillStyle = 'rgba(22, 163, 74, 0.08)';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    const coneLen = rodPixelLength * 0.92;
    const coneAngle = (5 * Math.PI) / 180;
    ctx.arc(pivotX, pivotY, coneLen, -Math.PI / 2 - coneAngle, -Math.PI / 2 + coneAngle);
    ctx.closePath();
    ctx.fill();

    // Reference vertical upright line (theta = 0)
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY - rodPixelLength * 1.05);
    ctx.stroke();
    ctx.setLineDash([]);

    // Angle arc showing theta
    if (Math.abs(state.theta) > 0.005) {
      const displayTheta = Math.max(-Math.PI, Math.min(Math.PI, state.theta));
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 38, -Math.PI / 2, -Math.PI / 2 + displayTheta, displayTheta < 0);
      ctx.stroke();

      // Theta label near arc
      const midAngle = -Math.PI / 2 + displayTheta * 0.5;
      ctx.fillStyle = '#EA580C';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(
        `θ=${(state.theta * (180 / Math.PI)).toFixed(1)}°`,
        pivotX + 52 * Math.cos(midAngle),
        pivotY + 52 * Math.sin(midAngle)
      );
    }

    // 4. Pendulum Rod & Bob (theta=0 upright, theta>0 tilts right)
    const bobX = pivotX + rodPixelLength * Math.sin(state.theta);
    const bobY = pivotY - rodPixelLength * Math.cos(state.theta);
    const comX = pivotX + rodPixelLength * 0.72 * Math.sin(state.theta);
    const comY = pivotY - rodPixelLength * 0.72 * Math.cos(state.theta);

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // COM marker
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(comX, comY, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Bob
    const bobRadius = 15;
    const isAngleSafe = Math.abs(state.theta * (180 / Math.PI)) < 15;
    const bobGrad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, bobRadius);
    if (status === 'unstable' || !isAngleSafe) {
      bobGrad.addColorStop(0, '#FCA5A5');
      bobGrad.addColorStop(1, '#DC2626');
    } else {
      bobGrad.addColorStop(0, '#60A5FA');
      bobGrad.addColorStop(1, '#2563EB');
    }

    ctx.fillStyle = bobGrad;
    ctx.strokeStyle = status === 'unstable' || !isAngleSafe ? '#991B1B' : '#1D4ED8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('m', bobX, bobY + 3);

    // Pivot Bearing
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5.5, 0, 2 * Math.PI);
    ctx.fill();

    // 5. Force Vector Drawing Helper
    const drawForceArrow = (
      force: number,
      yPos: number,
      color: string,
      label: string,
      labelBelow = false
    ) => {
      if (Math.abs(force) < 0.03) return;
      const dir = Math.sign(force);
      const len = Math.min(110, Math.max(18, Math.abs(force) * 5.5));
      const startX = cartPixelX + dir * (cartWidth / 2 + 4);
      const endX = startX + dir * len;

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX, yPos);
      ctx.lineTo(endX, yPos);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(endX + dir * 3, yPos);
      ctx.lineTo(endX - dir * 7, yPos - 5);
      ctx.lineTo(endX - dir * 7, yPos + 5);
      ctx.closePath();
      ctx.fill();

      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = dir > 0 ? 'left' : 'right';
      ctx.fillText(label, endX + dir * 7, labelBelow ? yPos + 13 : yPos - 5);
    };

    // Controller Force Arrow (Green)
    drawForceArrow(
      uApplied,
      cartTop + cartHeight * 0.62,
      isSaturated ? '#D97706' : '#16A34A',
      `u=${uApplied.toFixed(2)}N${isSaturated ? ' (SAT)' : ''}`,
      true
    );

    // Manual / Disturbance Force Arrow (Red/Orange)
    drawForceArrow(
      uExternal,
      cartTop + cartHeight * 0.28,
      '#DC2626',
      `F_ext=${uExternal.toFixed(2)}N`,
      false
    );

    // 6. Live Telemetry HUD (Top Left & Top Right)
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`t      : ${simTime.toFixed(2)} s`, 14, 22);
    ctx.fillText(`x      : ${state.x.toFixed(4)} m`, 14, 38);
    ctx.fillText(`ẋ      : ${state.x_dot.toFixed(4)} m/s`, 14, 54);

    ctx.textAlign = 'right';
    const degVal = state.theta * (180 / Math.PI);
    ctx.fillText(`θ      : ${degVal.toFixed(2)}° (${state.theta.toFixed(4)} rad)`, width - 14, 22);
    ctx.fillText(`θ̇      : ${state.theta_dot.toFixed(4)} rad/s`, width - 14, 38);
    ctx.fillStyle = isSaturated ? '#D97706' : '#15803D';
    ctx.fillText(
      isControlEnabled
        ? `u_ctrl : ${uApplied.toFixed(2)} N${isSaturated ? ` (req ${uRequested.toFixed(2)} N)` : ''}`
        : `u_ctrl : 0.00 N (Manual/Open-Loop)`,
      width - 14,
      54
    );

    ctx.restore();
  }, [state, params, simTime, uRequested, uApplied, uExternal, isSaturated, isControlEnabled, status]);

  const isPhysicallyStableNow =
    status === 'settled' ||
    (isControlEnabled && Math.abs(state.theta * (180 / Math.PI)) < 25 && status !== 'unstable');

  return (
    <div className="relative w-full h-[380px] bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top-center Mode & Stability Pill */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
          {modelType === 'nonlinear' ? 'Nonlinear Dynamics' : 'Linearized Model'} &bull;{' '}
          {controlMode === 'manual' ? 'Manual Force' : controlMode === 'auto' ? 'Auto u=-KX' : 'Auto + Disturbance'}
        </span>
        <span
          className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
            status === 'unstable' || !isPhysicallyStableNow
              ? 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30'
              : 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/30'
          }`}
        >
          {status === 'unstable'
            ? 'Unstable (Fallen)'
            : status === 'settled'
            ? 'Stabilized (Equilibrium)'
            : isPhysicallyStableNow
            ? 'Actively Balancing'
            : 'Open-Loop / Unstable'}
        </span>
      </div>

      {/* Bottom-left Simulation Status */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span
          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border flex items-center gap-1.5 shadow-xs ${
            status === 'running'
              ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/30'
              : status === 'settled'
              ? 'bg-[#DBEAFE] text-[#2563EB] border-[#3B82F6]/30'
              : status === 'paused'
              ? 'bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/30'
              : status === 'unstable'
              ? 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/30'
              : 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'running'
                ? 'bg-[#16A34A] animate-pulse'
                : status === 'unstable'
                ? 'bg-[#DC2626]'
                : status === 'settled'
                ? 'bg-[#2563EB]'
                : 'bg-[#64748B]'
            }`}
          />
          {status === 'running' && 'Running (Python RK4 Stream)'}
          {status === 'paused' && 'Paused'}
          {status === 'settled' && 'Settled at Upright Equilibrium'}
          {status === 'unstable' && 'Fallen / Diverged'}
          {status === 'completed' && 'Duration Completed'}
          {status === 'reset' && 'Ready'}
        </span>

        {isSaturated && (
          <span className="px-2 py-1 text-[11px] font-bold rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/40">
            Actuator Saturated
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-[#E2E8F0] px-2.5 py-1 rounded-md text-[10px] text-[#64748B]">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-[#16A34A] rounded-full inline-block" />
          <span>Control u</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-full inline-block" />
          <span>Manual / Disturbance</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-[#F97316] rounded-full inline-block" />
          <span>Angle θ &amp; COM</span>
        </div>
      </div>
    </div>
  );
};
