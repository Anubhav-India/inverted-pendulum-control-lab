import React, { useState } from 'react';
import { ComplexNumber } from '../types';

export interface PoleSeriesItem {
  label: string;
  poles: ComplexNumber[];
  color: string;
  marker: 'x' | 'o' | 'diamond';
}

interface PolePlotProps {
  series: PoleSeriesItem[];
  title?: string;
  height?: number;
}

export const PolePlot: React.FC<PolePlotProps> = ({
  series,
  title = 'Complex s-Plane Pole Map',
  height = 300,
}) => {
  const [hovered, setHovered] = useState<{
    label: string;
    real: number;
    imag: number;
    x: number;
    y: number;
  } | null>(null);

  const width = 560;
  const pad = { top: 24, right: 24, bottom: 32, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allPoles = series.flatMap((s) => s.poles);
  const maxAbsRe = Math.max(4, ...allPoles.map((p) => Math.abs(p.real) + 1.5));
  const maxAbsIm = Math.max(3, ...allPoles.map((p) => Math.abs(p.imag) + 1.2));

  const reMin = -maxAbsRe;
  const reMax = Math.max(3.5, Math.min(maxAbsRe * 0.85, Math.max(3.5, ...allPoles.map((p) => p.real + 1.5))));
  const imMin = -maxAbsIm;
  const imMax = maxAbsIm;

  const mapX = (re: number) => pad.left + ((re - reMin) / (reMax - reMin)) * innerW;
  const mapY = (im: number) => pad.top + innerH - ((im - imMin) / (imMax - imMin)) * innerH;

  const zeroX = mapX(0);
  const zeroY = mapY(0);

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-bold text-xs text-[#1E293B]">{title}</span>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#64748B]">
          {series.map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-semibold text-[#1E293B]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
          {/* LHP Stable Region */}
          <rect
            x={pad.left}
            y={pad.top}
            width={Math.max(0, zeroX - pad.left)}
            height={innerH}
            fill="#DCFCE7"
            fillOpacity="0.45"
          />
          {/* RHP Unstable Region */}
          <rect
            x={zeroX}
            y={pad.top}
            width={Math.max(0, pad.left + innerW - zeroX)}
            height={innerH}
            fill="#FEE2E2"
            fillOpacity="0.45"
          />

          {/* Region labels */}
          <text x={pad.left + 8} y={pad.top + 14} fontSize="9" fontWeight="700" fill="#15803D">
            STABLE LHP (Re &lt; 0)
          </text>
          <text
            x={pad.left + innerW - 8}
            y={pad.top + 14}
            textAnchor="end"
            fontSize="9"
            fontWeight="700"
            fill="#B91C1C"
          >
            UNSTABLE RHP (Re &gt; 0)
          </text>

          {/* Grid lines */}
          {[-8, -6, -4, -2, 0, 2, 4, 6].map((val) => {
            if (val < reMin || val > reMax) return null;
            const gx = mapX(val);
            return (
              <g key={`re-${val}`}>
                <line
                  x1={gx}
                  y1={pad.top}
                  x2={gx}
                  y2={pad.top + innerH}
                  stroke={val === 0 ? '#64748B' : '#E2E8F0'}
                  strokeWidth={val === 0 ? 1.5 : 1}
                  strokeDasharray={val === 0 ? '4,3' : undefined}
                />
                <text
                  x={gx}
                  y={pad.top + innerH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748B"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {[-6, -4, -2, 0, 2, 4, 6].map((val) => {
            if (val < imMin || val > imMax) return null;
            const gy = mapY(val);
            return (
              <g key={`im-${val}`}>
                <line
                  x1={pad.left}
                  y1={gy}
                  x2={pad.left + innerW}
                  y2={gy}
                  stroke={val === 0 ? '#64748B' : '#E2E8F0'}
                  strokeWidth={val === 0 ? 1.2 : 1}
                />
                <text
                  x={pad.left - 6}
                  y={gy + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#64748B"
                  fontFamily="monospace"
                >
                  {val === 0 ? '0' : `${val}j`}
                </text>
              </g>
            );
          })}

          {/* Border */}
          <rect
            x={pad.left}
            y={pad.top}
            width={innerW}
            height={innerH}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Axis captions */}
          <text
            x={pad.left + innerW / 2}
            y={height - 4}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
            fontWeight="600"
          >
            Real Axis Re(s) [rad/s]
          </text>
          <text
            x={12}
            y={pad.top + innerH / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
            fontWeight="600"
            transform={`rotate(-90, 12, ${pad.top + innerH / 2})`}
          >
            Imag Axis Im(s)
          </text>

          {/* Marginal jw-axis label */}
          <text x={zeroX + 4} y={pad.top + innerH - 6} fontSize="8" fill="#475569" fontFamily="monospace">
            jω (Marginal)
          </text>

          {/* Pole markers */}
          {series.map((s) =>
            s.poles.map((p, idx) => {
              const px = mapX(p.real);
              const py = mapY(p.imag);
              return (
                <g
                  key={`${s.label}-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHovered({ label: s.label, real: p.real, imag: p.imag, x: px, y: py })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <circle cx={px} cy={py} r={10} fill="transparent" />
                  {s.marker === 'x' && (
                    <g stroke={s.color} strokeWidth="2.4" strokeLinecap="round">
                      <line x1={px - 5} y1={py - 5} x2={px + 5} y2={py + 5} />
                      <line x1={px - 5} y1={py + 5} x2={px + 5} y2={py - 5} />
                    </g>
                  )}
                  {s.marker === 'o' && (
                    <circle
                      cx={px}
                      cy={py}
                      r={6}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.2"
                    />
                  )}
                  {s.marker === 'diamond' && (
                    <polygon
                      points={`${px},${py - 6} ${px + 6},${py} ${px},${py + 6} ${px - 6},${py}`}
                      fill={s.color}
                      fillOpacity="0.85"
                      stroke="#FFFFFF"
                      strokeWidth="1"
                    />
                  )}
                </g>
              );
            })
          )}
        </svg>

        {hovered && (
          <div className="mt-1 px-3 py-1.5 rounded-lg bg-[#1E293B] text-white text-[11px] font-mono inline-flex items-center gap-2">
            <span className="font-sans font-semibold text-[#93C5FD]">{hovered.label}:</span>
            <span>
              s = {hovered.real.toFixed(4)} {hovered.imag >= 0 ? '+' : '-'} {Math.abs(hovered.imag).toFixed(4)}j
            </span>
            <span className="text-[10px] text-[#CBD5E1]">
              ({hovered.real > 1e-5 ? 'Unstable RHP' : hovered.real < -1e-5 ? 'Stable LHP' : 'Marginal jω'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
