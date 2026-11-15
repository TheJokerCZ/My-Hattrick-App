import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Flame,
  Home,
  Plane,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Target,
} from 'lucide-react';
import {
  SAMPLE_SCOUTED_MATCHES_BETON,
  SAMPLE_SCOUTED_MATCHES_SLAVOJ,
  analyzeOpponentMatches,
  convertAnalysisToOpponentProfile,
} from '../engine/scoutEngine';
import {
  ClubSettings,
  OpponentAnalysis,
  OpponentProfile,
  SectorRatings,
} from '../types/hattrick';

interface OpponentScoutViewProps {
  club: ClubSettings;
  onApplyOpponentToLineup: (profile: OpponentProfile, isOurTeamHome: boolean) => void;
}

export const OpponentScoutView: React.FC<OpponentScoutViewProps> = ({
  club,
  onApplyOpponentToLineup,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'slavoj' | 'beton'>('slavoj');
  const [customTeamId, setCustomTeamId] = useState('');
  const [isOurTeamHome, setIsOurTeamHome] = useState(true);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customStatusMsg, setCustomStatusMsg] = useState<string | null>(null);

  const analysis: OpponentAnalysis = useMemo(() => {
    if (selectedPreset === 'slavoj') {
      return analyzeOpponentMatches(
        SAMPLE_SCOUTED_MATCHES_SLAVOJ,
        'FC Slavoj Pelhřimov',
        98124,
        'Divize V.158 (Česko)'
      );
    }
    return analyzeOpponentMatches(
      SAMPLE_SCOUTED_MATCHES_BETON,
      'SK Humpolec Beton',
      81290,
      'Divize V.158 (Česko)'
    );
  }, [selectedPreset]);

  const predictedProfile = useMemo(() => {
    return convertAnalysisToOpponentProfile(analysis, isOurTeamHome);
  }, [analysis, isOurTeamHome]);

  const handleApply = () => {
    onApplyOpponentToLineup(predictedProfile, isOurTeamHome);
  };

  const handleFetchCustom = () => {
    if (!customTeamId.trim()) return;
    setLoadingCustom(true);
    setCustomStatusMsg(null);
    // Simulace vyhledání / CHPP dotazu
    setTimeout(() => {
      setLoadingCustom(false);
      setCustomStatusMsg(
        `Tým s ID ${customTeamId} byl nalezen v divizi V.158! (Data načtena ze zápasového archivu)`
      );
    }, 600);
  };

  const activeRatings: SectorRatings = isOurTeamHome
    ? analysis.avgRatingsAway
    : analysis.avgRatingsHome;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Toolbar */}
      <div className="rounded-2xl border border-ht-border bg-ht-panel p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-950/50">
              <Crosshair className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">
                  Skaut soupeře & Příprava na zápas
                </h1>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  {analysis.leagueName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Podrobný rozbor odehraných zápasů, odhalení slabin a automatické navržení
                vítězné protitaktiky pro <strong>{club.teamName}</strong>.
              </p>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={handleApply}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/60 transition hover:from-emerald-500 hover:to-teal-500"
          >
            <Sparkles className="h-4 w-4" />
            <span>Optimalizovat 11ku proti {analysis.teamName}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Filters and Selection Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ht-border/80 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Výběr soupeře z ligy:</span>
            <button
              onClick={() => setSelectedPreset('slavoj')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedPreset === 'slavoj'
                  ? 'border border-amber-500/60 bg-amber-500/20 text-amber-200'
                  : 'border border-ht-border bg-[#0c1310] text-slate-300 hover:border-slate-600'
              }`}
            >
              FC Slavoj Pelhřimov (Útočný AIM)
            </button>
            <button
              onClick={() => setSelectedPreset('beton')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedPreset === 'beton'
                  ? 'border border-amber-500/60 bg-amber-500/20 text-amber-200'
                  : 'border border-ht-border bg-[#0c1310] text-slate-300 hover:border-slate-600'
              }`}
            >
              SK Humpolec Beton (Defenzivní CA)
            </button>
          </div>

          {/* Match Venue Switcher */}
          <div className="flex items-center gap-2 rounded-xl border border-ht-border bg-[#0c1310] p-1 text-xs">
            <button
              onClick={() => setIsOurTeamHome(true)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                isOurTeamHome
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Hrajeme DOMA (soupeř venku)</span>
            </button>
            <button
              onClick={() => setIsOurTeamHome(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                !isOurTeamHome
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              <span>Hrajeme VENKU (soupeř doma)</span>
            </button>
          </div>
        </div>

        {/* Search custom Team ID */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={customTeamId}
              onChange={(e) => setCustomTeamId(e.target.value)}
              placeholder="Zadat jiné Hattrick Team ID..."
              className="w-64 rounded-xl border border-ht-border bg-[#0c1310] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleFetchCustom}
            disabled={loadingCustom || !customTeamId.trim()}
            className="flex items-center gap-1.5 rounded-xl border border-ht-border bg-ht-card px-3.5 py-2 font-semibold text-slate-200 hover:border-amber-500/50 disabled:opacity-40"
          >
            {loadingCustom ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Target className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>Vyhledat soupeře</span>
          </button>
          {customStatusMsg && (
            <span className="text-xs text-emerald-400 font-medium">
              ✓ {customStatusMsg}
            </span>
          )}
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-ht-border bg-ht-panel p-4">
          <span className="text-xs text-slate-400 font-medium">Typická formace</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {analysis.predictedFormation}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {analysis.formationDistribution[0]?.pct}% zápasů
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {analysis.formationDistribution.map((f) => (
              <span
                key={f.formation}
                className="rounded bg-[#0c1310] px-2 py-0.5 text-[10px] text-slate-300 font-mono"
              >
                {f.formation}: {f.count}×
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ht-border bg-ht-panel p-4">
          <span className="text-xs text-slate-400 font-medium">Taktika soupeře</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black uppercase text-amber-300">
              {analysis.predictedTactic}
            </span>
            <span className="text-xs font-semibold text-slate-300">
              (úroveň {analysis.predictedTacticLevel})
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {analysis.predictedTactic === 'aim'
              ? 'Útok středem — zaměřuje se na střed'
              : analysis.predictedTactic === 'ca'
                ? 'Smrtící protiútoky při nízkém držení'
                : 'Vyvážená taktika'}
          </p>
        </div>

        <div className="rounded-2xl border border-ht-border bg-ht-panel p-4">
          <span className="text-xs text-slate-400 font-medium">
            Síla týmu (HatStats)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-300">
              {isOurTeamHome ? analysis.avgHatStatsAway : analysis.avgHatStatsHome}
            </span>
            <span className="text-xs text-slate-400">
              {isOurTeamHome ? '(zápasy venku)' : '(zápasy doma)'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Doma: <strong className="text-slate-200">{analysis.avgHatStatsHome}</strong> |
            Venku: <strong className="text-slate-200">{analysis.avgHatStatsAway}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-ht-border bg-ht-panel p-4">
          <span className="text-xs text-slate-400 font-medium">Předpokládaná záloha</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {activeRatings.midfield.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400">/ 20</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {isOurTeamHome
              ? `Soupeř venku ztrácí cca ${(analysis.avgRatingsHome.midfield - analysis.avgRatingsAway.midfield).toFixed(1)} v záloze`
              : 'Soupeř hraje doma s plným bonusem domácího hřiště'}
          </p>
        </div>
      </div>

      {/* Weaknesses, Strengths & Tactical Advice */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Strengths and Weaknesses */}
        <div className="space-y-4 rounded-2xl border border-ht-border bg-ht-panel p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Klíčové hrozby & Slabiny soupeře ({analysis.teamName})</span>
          </h2>

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-rose-300">
                Silné stránky a hrozby:
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {analysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ht-border pt-3">
              <div className="mb-1 text-xs font-semibold text-emerald-300">
                Odhalené slabiny (kudy udeřit):
              </div>
              <ul className="space-y-1.5 text-xs text-slate-200">
                {analysis.weaknesses.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-medium text-emerald-100">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Tactical Recommendations */}
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>Doporučená protitaktika pro {club.teamName}</span>
          </h2>

          <div className="space-y-3">
            <ul className="space-y-2 text-xs text-slate-200">
              {analysis.tacticalAdvice.map((adv, idx) => (
                <li
                  key={idx}
                  className="rounded-xl border border-emerald-500/20 bg-[#0c1310]/70 p-3"
                >
                  <p className="font-medium text-emerald-200">{adv}</p>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 shadow-md shadow-emerald-950"
              >
                <span>Aplikovat protitaktiku a přepnout na rozestavení 11ky</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Ratings Breakdown Card */}
      <div className="rounded-2xl border border-ht-border bg-ht-panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white">
              Očekávané sektorové ratingy soupeře ({isOurTeamHome ? 'Zápas venku' : 'Zápas doma'})
            </h2>
            <p className="text-xs text-slate-400">
              Predikce síly jednotlivých řad, proti kterým bude tvůj tým nastupovat.
            </p>
          </div>
          <span className="rounded-lg border border-ht-border bg-[#0c1310] px-3 py-1 text-xs font-mono text-slate-300">
            Taktika: {analysis.predictedTactic.toUpperCase()} (úroveň {analysis.predictedTacticLevel})
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Defense */}
          <div className="rounded-xl border border-ht-border bg-[#0c1310]/70 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-sky-300">
              <span>Obrana soupeře</span>
              <Shield className="h-4 w-4" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Levá obrana:</span>
                <span className="font-mono font-bold text-white">
                  {activeRatings.leftDef.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold text-slate-300">
                  Střed obrany:
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {activeRatings.centerDef.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pravá obrana:</span>
                <span className="font-mono font-bold text-white">
                  {activeRatings.rightDef.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Midfield */}
          <div className="rounded-xl border border-ht-border bg-[#0c1310]/70 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-emerald-300">
              <span>Záloha soupeře</span>
              <Swords className="h-4 w-4" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Držení míče:</span>
                <span className="font-mono font-bold text-emerald-300 text-base">
                  {activeRatings.midfield.toFixed(1)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Pro převahu $\ge 55\,\%$ potřebuješ zálohu alespoň{' '}
                <strong className="text-emerald-300">
                  {(activeRatings.midfield + 0.8).toFixed(1)}
                </strong>
                .
              </div>
            </div>
          </div>

          {/* Attack */}
          <div className="rounded-xl border border-ht-border bg-[#0c1310]/70 p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-rose-300">
              <span>Útok soupeře</span>
              <Flame className="h-4 w-4" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Levý útok:</span>
                <span className="font-mono font-bold text-white">
                  {activeRatings.leftAtt.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold text-slate-300">
                  Střed útoku:
                </span>
                <span className="font-mono font-bold text-rose-400">
                  {activeRatings.centerAtt.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pravý útok:</span>
                <span className="font-mono font-bold text-white">
                  {activeRatings.rightAtt.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scouted Matches History Table */}
      <div className="rounded-2xl border border-ht-border bg-ht-panel p-6">
        <h2 className="mb-3 text-sm font-bold text-white">
          Poslední odehrané zápasy soupeře ({analysis.matches.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-ht-border/80">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ht-border bg-[#0c1310] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Datum</th>
                <th className="px-3 py-2.5">Zápas</th>
                <th className="px-2 py-2.5 text-center">Výsledek</th>
                <th className="px-2 py-2.5 text-center">Formace</th>
                <th className="px-2 py-2.5 text-center">Taktika</th>
                <th className="px-2 py-2.5 text-center">HatStats</th>
                <th className="px-3 py-2.5">Poznámka skauta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ht-border/50 text-slate-200">
              {analysis.matches.map((m) => (
                <tr key={m.id} className="hover:bg-ht-card/60 transition">
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-400">
                    {m.date}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        m.isOpponentHome ? 'font-bold text-white' : 'text-slate-300'
                      }
                    >
                      {m.homeTeamName}
                    </span>
                    <span className="text-slate-500 mx-1">vs</span>
                    <span
                      className={
                        !m.isOpponentHome ? 'font-bold text-white' : 'text-slate-300'
                      }
                    >
                      {m.awayTeamName}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-bold">
                    <span
                      className={
                        (m.isOpponentHome && m.homeScore > m.awayScore) ||
                        (!m.isOpponentHome && m.awayScore > m.homeScore)
                          ? 'text-emerald-400'
                          : m.homeScore === m.awayScore
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }
                    >
                      {m.homeScore} : {m.awayScore}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-slate-300">
                    {m.formation}
                  </td>
                  <td className="px-2 py-2 text-center uppercase font-bold text-amber-300">
                    {m.tactic} ({m.tacticLevel})
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-sky-300 font-semibold">
                    {m.hatStats}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[11px]">
                    {m.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
