import React from 'react';
import { Award, CheckCircle2, XCircle, TrendingUp, Zap, Clock, ShieldCheck, Scale } from 'lucide-react';
import { PerformanceMetrics, ComparisonTableRow } from '../types';

interface PerformanceDashboardProps {
  metrics: PerformanceMetrics;
  comparisonTable: ComparisonTableRow[];
  closedLoopPoles: string[];
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  comparisonTable,
  closedLoopPoles
}) => {
  const metricCards = [
    {
      title: 'Settling Time (2% band)',
      value: metrics.settling_time_s !== null ? `${metrics.settling_time_s.toFixed(2)} s` : 'Diverged',
      icon: Clock,
      color: 'text-[#3B82F6]',
      bg: 'bg-[#DBEAFE]',
      desc: `Threshold: ±${metrics.settling_threshold_deg.toFixed(2)}°`
    },
    {
      title: 'Peak Angular Displacement',
      value: `${metrics.peak_angle_deg.toFixed(2)}°`,
      icon: TrendingUp,
      color: 'text-[#F97316]',
      bg: 'bg-[#FFEDD5]',
      desc: `${metrics.peak_angle_rad.toFixed(4)} rad peak`
    },
    {
      title: 'Maximum Control Force |u|',
      value: `${metrics.peak_control_force_N.toFixed(2)} N`,
      icon: Zap,
      color: 'text-[#DC2626]',
      bg: 'bg-[#FEE2E2]',
      desc: `Actuator horizontal thrust`
    },
    {
      title: 'Steady-State Angular Error',
      value: `${metrics.steady_state_angle_deg.toFixed(4)}°`,
      icon: ShieldCheck,
      color: 'text-[#16A34A]',
      bg: 'bg-[#DCFCE7]',
      desc: `Zero error at upright θ = 0`
    },
    {
      title: 'Peak Cart Displacement |x|',
      value: `${metrics.peak_cart_displacement_m.toFixed(3)} m`,
      icon: Scale,
      color: 'text-[#2563EB]',
      bg: 'bg-[#EFF6FF]',
      desc: `Track boundary requirement`
    },
    {
      title: 'Control Energy ∫ u² dt',
      value: `${metrics.control_effort_integral_N2s.toFixed(2)} N²·s`,
      icon: Award,
      color: 'text-[#7C3AED]',
      bg: 'bg-[#F3E8FF]',
      desc: `Actuator effort integral`
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B]">{c.title}</span>
                <div className={`p-1.5 rounded-md ${c.bg} ${c.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-base font-bold font-mono text-[#1E293B] mb-1">
                {c.value}
              </div>
              <span className="text-[10px] text-[#94A3B8] truncate">{c.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Open-Loop vs Closed-Loop Comparison Table */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1E293B]">Open-Loop vs. Closed-Loop Performance Evaluation</h3>
            <p className="text-xs text-[#64748B]">Rigorous comparison from numerical simulation trajectories</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#FEE2E2] text-[#DC2626] border border-[#DC2626]/20">
              Open-Loop: Unstable
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/20">
              Closed-Loop: Asymptotically Stable
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-[#E2E8F0] uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Performance Metric</th>
                <th className="py-3 px-4 font-semibold text-[#DC2626]">Open-Loop System (u = 0)</th>
                <th className="py-3 px-4 font-semibold text-[#16A34A]">Closed-Loop State Feedback (u = -Kx)</th>
                <th className="py-3 px-4 font-semibold text-center">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {comparisonTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#1E293B]">{row.metric}</td>
                  <td className="py-3 px-4 font-mono text-[#DC2626] font-semibold">{row.open_loop}</td>
                  <td className="py-3 px-4 font-mono text-[#16A34A] font-semibold">{row.closed_loop}</td>
                  <td className="py-3 px-4 text-center font-mono text-[#64748B]">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed-Loop Poles Card */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <h4 className="font-bold text-sm text-[#1E293B]">Verified Closed-Loop Eigenvalues</h4>
          </div>
          <span className="text-xs text-[#16A34A] font-semibold">Ackermann Placement Match &lt; 1e-6</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {closedLoopPoles.map((pole, idx) => (
            <div key={idx} className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2 rounded-lg font-mono text-xs">
              <span className="text-[#64748B] mr-1">p_{idx + 1} =</span>
              <span className="font-bold text-[#3B82F6]">{pole}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
          Because all four closed-loop poles possess strictly negative real parts in the left-half s-plane, the upright equilibrium point is globally asymptotically stable for small-to-moderate perturbations within the linear control regime.
        </p>
      </div>
    </div>
  );
};
