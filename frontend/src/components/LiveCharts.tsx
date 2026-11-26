import React, { useState } from 'react';

interface ChartSeries {
  title: string;
  dataKey: 'theta_deg' | 'x' | 'x_dot' | 'theta_dot' | 'u';
  color: string;
  unit: string;
}

interface LiveChartsProps {
  timeHistory: number[];
  xHistory: number[];
  xDotHistory: number[];
  thetaDegHistory: number[];
  thetaDotHistory: number[];
  uHistory: number[];
  uRequestedHistory?: number[];
  disturbanceHistory?: number[];
}

export const LiveCharts: React.FC<LiveChartsProps> = ({
  timeHistory,
  xHistory,
  xDotHistory,
  thetaDegHistory,
  thetaDotHistory,
  uHistory,
  uRequestedHistory,
  disturbanceHistory,
}) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'angle' | 'position' | 'velocity' | 'force'>('all');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const seriesConfig: ChartSeries[] = [
    { title: 'Pendulum Angle θ(t)', dataKey: 'theta_deg', color: '#3B82F6', unit: 'deg' },
    { title: 'Cart Position x(t)', dataKey: 'x', color: '#16A34A', unit: 'm' },
    { title: 'Cart Velocity ẋ(t)', dataKey: 'x_dot', color: '#0EA5E9', unit: 'm/s' },
    { title: 'Angular Velocity θ̇(t)', dataKey: 'theta_dot', color: '#F97316', unit: 'rad/s' },
    { title: 'Control Force u(t) & Disturbance', dataKey: 'u', color: '#DC2626', unit: 'N' },
  ];

  const getData = (key: ChartSeries['dataKey']) => {
    switch (key) {
      case 'theta_deg':
        return thetaDegHistory;
      case 'x':
        return xHistory;
      case 'x_dot':
        return xDotHistory;
      case 'theta_dot':
        return thetaDotHistory;
      case 'u':
        return uHistory;
    }
  };

  const renderSvgChart = (series: ChartSeries, height = 155) => {
    const data = getData(series.dataKey);
    const times = timeHistory;

    if (data.length < 2) {
      return (
        <div className="h-[155px] flex items-center justify-center text-xs text-[#94A3B8] italic bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
          Start or Step simulation to record time history...
        </div>
      );
    }

    const width = 520;
    const padding = { top: 16, right: 20, bottom: 26, left: 48 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const tMin = times[0];
    const tMax = Math.max(tMin + 0.1, times[times.length - 1]);

    const extraSeries: { values: number[]; color: string; dashed?: boolean; label: string }[] = [];
    if (series.dataKey === 'u') {
      if (uRequestedHistory && uRequestedHistory.length === data.length) {
        extraSeries.push({ values: uRequestedHistory, color: '#F59E0B', dashed: true, label: 'u_req' });
      }
      if (disturbanceHistory && disturbanceHistory.length === data.length) {
        extraSeries.push({ values: disturbanceHistory, color: '#7C3AED', dashed: false, label: 'F_ext' });
      }
    }

    const allVals = [...data, ...extraSeries.flatMap((e) => e.values)];
    let yMin = Math.min(...allVals);
    let yMax = Math.max(...allVals);

    if (Math.abs(yMax - yMin) < 1e-4) {
      yMin -= 1;
      yMax += 1;
    } else {
      const margin = (yMax - yMin) * 0.15;
      yMin -= margin;
      yMax += margin;
    }
    if (yMin > 0) yMin = 0;
    if (yMax < 0) yMax = 0;

    const getX = (t: number) => padding.left + ((t - tMin) / (tMax - tMin)) * innerWidth;
    const getY = (v: number) => padding.top + innerHeight - ((v - yMin) / (yMax - yMin)) * innerHeight;

    const points = times.map((t, i) => `${getX(t).toFixed(1)},${getY(data[i]).toFixed(1)}`).join(' ');
    const zeroY = getY(0);

    const activeIdx = hoverIdx !== null && hoverIdx < data.length ? hoverIdx : data.length - 1;

    return (
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="text-xs font-bold text-[#1E293B]">{series.title}</span>
          </div>
          <span className="text-[11px] font-mono text-[#64748B]">
            t={times[activeIdx]?.toFixed(2)}s:{' '}
            <span className="font-bold text-[#1E293B]">
              {data[activeIdx]?.toFixed(3)} {series.unit}
            </span>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * width;
            const tHover = tMin + ((relX - padding.left) / innerWidth) * (tMax - tMin);
            let best = 0;
            let bestDiff = Infinity;
            for (let i = 0; i < times.length; i++) {
              const d = Math.abs(times[i] - tHover);
              if (d < bestDiff) {
                bestDiff = d;
                best = i;
              }
            }
            setHoverIdx(best);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#F1F5F9" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top + innerHeight / 2} x2={width - padding.right} y2={padding.top + innerHeight / 2} stroke="#F1F5F9" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top + innerHeight} x2={width - padding.right} y2={padding.top + innerHeight} stroke="#F1F5F9" strokeWidth="1" />

          {zeroY >= padding.top && zeroY <= padding.top + innerHeight && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="#94A3B8"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} fill="none" stroke="#E2E8F0" strokeWidth="1" />

          <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
            {yMax.toFixed(1)}
          </text>
          <text x={padding.left - 6} y={zeroY + 3} textAnchor="end" fontSize="9" fill="#64748B" fontFamily="monospace">
            0
          </text>
          <text x={padding.left - 6} y={padding.top + innerHeight} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
            {yMin.toFixed(1)}
          </text>

          <text x={padding.left} y={height - 8} textAnchor="start" fontSize="9" fill="#94A3B8" fontFamily="monospace">
            {tMin.toFixed(1)}s
          </text>
          <text x={width - padding.right} y={height - 8} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
            {tMax.toFixed(1)}s
          </text>

          {extraSeries.map((ex) => {
            const exPts = times.map((t, i) => `${getX(t).toFixed(1)},${getY(ex.values[i]).toFixed(1)}`).join(' ');
            return (
              <polyline
                key={ex.label}
                fill="none"
                stroke={ex.color}
                strokeWidth="1.6"
                strokeDasharray={ex.dashed ? '4,3' : undefined}
                points={exPts}
              />
            );
          })}

          <polyline
            fill="none"
            stroke={series.color}
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {hoverIdx !== null && hoverIdx < times.length && (
            <g>
              <line
                x1={getX(times[hoverIdx])}
                y1={padding.top}
                x2={getX(times[hoverIdx])}
                y2={padding.top + innerHeight}
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                cx={getX(times[hoverIdx])}
                cy={getY(data[hoverIdx])}
                r="3.5"
                fill={series.color}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {series.dataKey === 'u' && (
          <div className="flex items-center gap-3 mt-1 text-[10px] text-[#64748B]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#DC2626] inline-block" /> u_applied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[#F59E0B] inline-block" /> u_requested
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#7C3AED] inline-block" /> F_external
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'All 5 Responses' },
            { id: 'angle', label: 'Angle θ(t)' },
            { id: 'position', label: 'Position x(t)' },
            { id: 'velocity', label: 'Velocities' },
            { id: 'force', label: 'Force & Disturbance' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-[#3B82F6] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[#64748B]">
          Samples: <span className="font-mono font-bold text-[#1E293B]">{timeHistory.length}</span>
        </span>
      </div>

      {selectedTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {seriesConfig.map((s) => (
            <div key={s.dataKey}>{renderSvgChart(s, 155)}</div>
          ))}
        </div>
      )}

      {selectedTab === 'angle' && renderSvgChart(seriesConfig[0], 280)}
      {selectedTab === 'position' && renderSvgChart(seriesConfig[1], 280)}
      {selectedTab === 'velocity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderSvgChart(seriesConfig[2], 250)}
          {renderSvgChart(seriesConfig[3], 250)}
        </div>
      )}
      {selectedTab === 'force' && renderSvgChart(seriesConfig[4], 280)}
    </div>
  );
};
