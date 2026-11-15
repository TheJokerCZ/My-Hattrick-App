import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  Dumbbell,
  Flame,
  Shield,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { TACTIC_LABELS, TRAINING_META } from '../constants/skillsAndTerms';
import { evaluateProspects, recommendTrainings } from '../engine/trainingAdvisor';
import {
  ClubSettings,
  OpponentProfile,
  Player,
  RecommendedLineup,
} from '../types/hattrick';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  players: Player[];
  club: ClubSettings;
  opponent: OpponentProfile;
  activeLineup: RecommendedLineup | null;
  onNavigate: (tab: ActiveTab) => void;
  onOpenImport: () => void;
  onQuickOptimize: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  players,
  club,
  opponent,
  activeLineup,
  onNavigate,
  onOpenImport,
  onQuickOptimize,
}) => {
  const topTraining = useMemo(
    () => recommendTrainings(players, club)[0],
    [players, club]
  );
  const topProspects = useMemo(
    () => evaluateProspects(players, club).slice(0, 4),
    [players, club]
  );

  const healthyCount = players.filter(
    (p) => p.injuredWeeks <= 0 && p.cards < 3
  ).length;
  const youngCount = players.filter((p) => p.ageYears <= 20).length;
  const avgAge =
    players.length > 0
      ? (players.reduce((s, p) => s + p.ageYears, 0) / players.length).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-ht-panel via-[#12241a] to-[#0c1310] p-6 shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Taktický & tréninkový manažer pro Hattrick.org</span>
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
            Vítej v MyHattrick — {club.teamName}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Aplikace automaticky analyzuje tvůj kádr, vyhledává nejperspektivnější mladé hráče pro trénink
            a pomocí výpočtů zápasového enginu navrhuje optimální rozestavení, pokyny i taktiku.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
          >
            <Upload className="h-4 w-4" />
            <span>Načíst svůj tým (CHPP / Copy-Paste)</span>
          </button>
          <button
            onClick={onQuickOptimize}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Shield className="h-4 w-4" />
            <span>Navrhnout nejlepší sestavu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => onNavigate('squad')}
          className="cursor-pointer rounded-2xl border border-ht-border bg-ht-panel p-5 transition hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Aktuální kádr</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {players.length} hráčů
          </div>
          <div className="mt-1 text-xs text-slate-300">
            {healthyCount} připravených • {youngCount} mladých (≤20 let) • průměr {avgAge} l.
          </div>
        </div>

        <div
          onClick={() => onNavigate('training')}
          className="cursor-pointer rounded-2xl border border-ht-border bg-ht-panel p-5 transition hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Doporučený trénink #1</span>
            <Dumbbell className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-lg font-extrabold text-emerald-300">
            {topTraining ? TRAINING_META[topTraining.trainingType].label : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Vhodnost: <strong>{topTraining?.suitabilityScore ?? 0}/100</strong> •{' '}
            {topTraining?.weeksPerSkillUpAvg ?? 4.5} t./úroveň
          </div>
        </div>

        <div
          onClick={() => onNavigate('lineup')}
          className="cursor-pointer rounded-2xl border border-ht-border bg-ht-panel p-5 transition hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Doporučená sestava</span>
            <Shield className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {activeLineup?.formation ?? '—'}
            </span>
            <span className="text-xs font-semibold text-sky-300">
              {activeLineup ? TACTIC_LABELS[activeLineup.tactic].short : ''}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-300">
            HatStats: <strong>{activeLineup?.hatStats ?? 0}</strong> • Trénink:{' '}
            <strong>{activeLineup?.trainingEfficiencyPct ?? 0} %</strong>
          </div>
        </div>

        <div
          onClick={() => onNavigate('simulator')}
          className="cursor-pointer rounded-2xl border border-ht-border bg-ht-panel p-5 transition hover:border-emerald-500/50"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Proti {opponent.name}</span>
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-400">
            {activeLineup ? `${activeLineup.simulation.winProb} % výhra` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Držení: <strong>{activeLineup?.simulation.possessionMy ?? 50} %</strong> • xG{' '}
            <strong>
              {activeLineup?.simulation.xGMy ?? 0} : {activeLineup?.simulation.xGOpp ?? 0}
            </strong>
          </div>
        </div>
      </div>

      {/* Two columns: Top Prospects + Quick Training/Lineup Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-ht-border bg-ht-panel p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Award className="h-4 w-4 text-amber-400" />
              <span>Nejperspektivnější talenti kádru</span>
            </h2>
            <button
              onClick={() => onNavigate('training')}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
            >
              <span>Otevřít Tréninkového poradce</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topProspects.map((pr) => (
              <div
                key={pr.player.id}
                className="rounded-xl border border-ht-border bg-[#0c1310]/70 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{pr.player.name}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    <Flame className="h-3 w-3" />
                    {pr.prospectScore}/100
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {pr.player.ageYears} let ({pr.player.ageDays} dní) • {pr.recommendedRole}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-ht-border/60 pt-2 text-[11px]">
                  <span className="text-emerald-300">
                    {TRAINING_META[pr.bestTrainingType].label}
                  </span>
                  <span className="text-sky-300">
                    {pr.primarySkillName}: {pr.primarySkillValue} (~{pr.weeksToNextSkillUp} t.)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-ht-border bg-ht-panel p-5 lg:col-span-5">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Doporučení na tento týden</span>
            </h2>
            {topTraining && (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="font-bold text-emerald-300">
                    1. Trénink: {TRAINING_META[topTraining.trainingType].label}
                  </div>
                  <p className="mt-1 text-slate-300">{topTraining.reasoning}</p>
                </div>

                {activeLineup && (
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
                    <div className="font-bold text-sky-300">
                      2. Sestava: {activeLineup.formation} ({TACTIC_LABELS[activeLineup.tactic].label})
                    </div>
                    <p className="mt-1 text-slate-300">
                      Očekávané body: <strong>{activeLineup.simulation.expectedPoints} xPts</strong> •
                      Šance na výhru <strong>{activeLineup.simulation.winProb} %</strong>.
                      Střední záloha <strong>{activeLineup.ratings.midfield.toFixed(1)}</strong>,
                      HatStats <strong>{activeLineup.hatStats}</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onNavigate('lineup')}
              className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              Zobrazit 2D hřiště & pokyny
            </button>
            <button
              onClick={() => onNavigate('simulator')}
              className="flex-1 rounded-xl border border-ht-border bg-ht-card py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/50"
            >
              Nastavit soupeře
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
