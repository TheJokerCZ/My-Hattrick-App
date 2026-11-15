import React from 'react';
import {
  Activity,
  BarChart3,
  Download,
  Dumbbell,
  LayoutDashboard,
  Shield,
  Users,
} from 'lucide-react';
import { TRAINING_META } from '../constants/skillsAndTerms';
import { ClubSettings } from '../types/hattrick';

export type ActiveTab = 'dashboard' | 'squad' | 'training' | 'lineup' | 'simulator';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  club: ClubSettings;
  playerCount: number;
  chppConnected: boolean;
  onOpenImport: () => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Přehled', icon: LayoutDashboard },
  { id: 'squad', label: 'Kádr', icon: Users },
  { id: 'training', label: 'Trénink & Talenti', icon: Dumbbell },
  { id: 'lineup', label: 'Sestava & Rozestavení', icon: Shield },
  { id: 'simulator', label: 'Simulátor & Soupeř', icon: BarChart3 },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  club,
  playerCount,
  chppConnected,
  onOpenImport,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-ht-border bg-[#0c1310]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-950/50">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">MyHattrick</span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                v1.0
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-200">{club.teamName}</span>
              <span>•</span>
              <span>{playerCount} hráčů</span>
              <span>•</span>
              <span className="text-emerald-400">
                Trénink: {TRAINING_META[club.trainingType].label}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-ht-border bg-ht-panel p-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-ht-card hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={onOpenImport}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <Download className="h-4 w-4" />
          <span>Import / CHPP</span>
          {chppConnected && (
            <span className="h-2 w-2 rounded-full bg-emerald-400" title="CHPP připojeno" />
          )}
        </button>
      </div>
    </header>
  );
};
