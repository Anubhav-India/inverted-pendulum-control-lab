import React from 'react';
import {
  Activity,
  Sigma,
  GitCompare,
  Grid,
  Compass,
  CheckCircle2,
  Sliders,
  Cpu,
  BarChart2,
  ShieldCheck,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isControllable: boolean;
  isClosedLoopStable: boolean;
  backendConnected: boolean;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isControllable,
  isClosedLoopStable,
  backendConnected,
  wsConnected,
}) => {
  const navItems = [
    { id: 'simulation', label: '1. Simulation', icon: Activity },
    { id: 'modelling', label: '2. Mathematical Modelling', icon: Sigma },
    { id: 'linearization', label: '3. Linearization', icon: GitCompare },
    { id: 'statespace', label: '4. State Space', icon: Grid },
    { id: 'stability', label: '5. Stability Analysis', icon: Compass },
    { id: 'controllability', label: '6. Controllability', icon: CheckCircle2 },
    { id: 'statefeedback', label: '7. State Feedback', icon: Sliders },
    { id: 'ackermann', label: "8. Ackermann's Formula", icon: Cpu },
    { id: 'results', label: '9. Results & Analysis', icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFFF] border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] border border-[#3B82F6] flex items-center justify-center text-[#3B82F6]">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-[#1E293B] tracking-tight">
                  Inverted Pendulum Control Lab
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#16A34A]/30 rounded-full uppercase tracking-wider">
                  u = -KX
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] hidden sm:block">
                Nonlinear Physics, State-Space Modelling &amp; Ackermann Pole Placement
              </p>
            </div>
          </div>

          {/* Live Backend & Control Status Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                backendConnected && wsConnected
                  ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20'
                  : 'bg-[#FEF3C7] text-[#B45309] border-[#F59E0B]/30'
              }`}
              title="Python FastAPI + WebSocket Physics Engine status"
            >
              {backendConnected && wsConnected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {backendConnected && wsConnected ? 'Python Engine Live' : 'Backend Connecting...'}
              </span>
            </div>

            <div
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                isControllable
                  ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20'
                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/20'
              }`}
            >
              {isControllable ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{isControllable ? 'Rank 4/4' : 'Uncontrollable'}</span>
            </div>

            <div
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                isClosedLoopStable
                  ? 'bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20'
                  : 'bg-[#FEE2E2] text-[#DC2626] border-[#DC2626]/20'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isClosedLoopStable ? 'CL Stable' : 'CL Unstable'}</span>
            </div>
          </div>
        </div>

        {/* 9-Tab Engineering Navigation Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1.5 border-t border-[#F1F5F9]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
