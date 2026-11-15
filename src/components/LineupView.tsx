import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  Check,
  Crosshair,
  Crown,
  Lock,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import {
  FORMATIONS,
  ORDER_LABELS,
  SLOT_META,
  SPECIALTY_LABELS,
  TACTIC_LABELS,
  TRAINING_META,
  WEATHER_LABELS,
  getSubLevelLabel,
} from '../constants/skillsAndTerms';
import { simulateMatch } from '../engine/matchSimulator';
import {
  calculateTeamRatings,
  estimatePlayerStarRating,
} from '../engine/ratingsEngine';
import {
  ClubSettings,
  FormationId,
  LineupAssignment,
  MatchAttitude,
  MatchContext,
  MatchVenue,
  OpponentProfile,
  OptimizerObjective,
  Player,
  PlayerOrder,
  RecommendedLineup,
  SlotId,
  TeamTactic,
  WeatherType,
} from '../types/hattrick';

interface LineupViewProps {
  players: Player[];
  club: ClubSettings;
  context: MatchContext;
  opponent: OpponentProfile;
  variants: RecommendedLineup[];
  activeVariantIdx: number;
  objective: OptimizerObjective;
  respectTraining: boolean;
  allowedFormations: FormationId[];
  onChangeObjective: (obj: OptimizerObjective) => void;
  onChangeRespectTraining: (val: boolean) => void;
  onToggleFormation: (f: FormationId) => void;
  onUpdateContext: (patch: Partial<MatchContext>) => void;
  onRunOptimizer: () => void;
  onSelectVariant: (idx: number) => void;
  onUpdateActiveLineup: (lineup: RecommendedLineup) => void;
}

// Vizuální souřadnice na hřišti (útok nahoru, brankář dole; levá strana je vlevo)
const PITCH_COORDS: Record<SlotId, { top: number; left: number }> = {
  LFW: { top: 14, left: 26 },
  CFW: { top: 12, left: 50 },
  RFW: { top: 14, left: 74 },

  LW: { top: 40, left: 13 },
  LIM: { top: 43, left: 34 },
  CIM: { top: 45, left: 50 },
  RIM: { top: 43, left: 66 },
  RW: { top: 40, left: 87 },

  LWB: { top: 69, left: 13 },
  LCD: { top: 71, left: 34 },
  CD: { top: 73, left: 50 },
  RCD: { top: 71, left: 66 },
  RWB: { top: 69, left: 87 },

  GK: { top: 90, left: 50 },
};

export const LineupView: React.FC<LineupViewProps> = ({
  players,
  club,
  context,
  opponent,
  variants,
  activeVariantIdx,
  objective,
  respectTraining,
  allowedFormations,
  onChangeObjective,
  onChangeRespectTraining,
  onToggleFormation,
  onUpdateContext,
  onRunOptimizer,
  onSelectVariant,
  onUpdateActiveLineup,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);
  const lineup = variants[activeVariantIdx] ?? variants[0] ?? null;

  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );
  const lockedSet = useMemo(
    () => new Set(club.trainingLockedPlayerIds),
    [club.trainingLockedPlayerIds]
  );
  const trainedSlotsSet = useMemo(
    () => new Set<SlotId>(TRAINING_META[club.trainingType].slotLabels100),
    [club.trainingType]
  );

  const recomputeLineup = (
    nextAssignments: LineupAssignment[],
    nextTactic: TeamTactic
  ) => {
    if (!lineup) return;
    const expLevel = club.formationExperience[lineup.formation] ?? 8;
    const { ratings, hatStats, loddarStats, tacticLevel } = calculateTeamRatings(
      nextAssignments,
      playersById,
      club,
      context,
      nextTactic,
      expLevel
    );

    const lineupPlayers = nextAssignments
      .map((a) => playersById.get(a.playerId))
      .filter((p): p is Player => Boolean(p));

    const avgSp =
      lineupPlayers.length > 0
        ? lineupPlayers.reduce((s, p) => s + p.skills.setPieces, 0) / lineupPlayers.length
        : 5;

    const simulation = simulateMatch({
      myRatings: ratings,
      myTactic: nextTactic,
      myTacticLevel: tacticLevel,
      mySetPiecesAvg: avgSp,
      myPlayers: lineupPlayers,
      opponent,
    });

    const enriched = nextAssignments.map((a) => {
      const p = playersById.get(a.playerId);
      return {
        ...a,
        starRating: p
          ? estimatePlayerStarRating(p, a.slotId, a.order, context.weather)
          : 3,
      };
    });

    onUpdateActiveLineup({
      ...lineup,
      assignments: enriched,
      tactic: nextTactic,
      tacticLevel,
      ratings,
      hatStats,
      loddarStats,
      simulation,
    });
  };

  const handleChangeOrder = (slotId: SlotId, newOrder: PlayerOrder) => {
    if (!lineup) return;
    const next = lineup.assignments.map((a) =>
      a.slotId === slotId ? { ...a, order: newOrder } : a
    );
    recomputeLineup(next, lineup.tactic);
  };

  const handleSwapPlayer = (slotId: SlotId, newPlayerId: number) => {
    if (!lineup) return;
    const existingSlot = lineup.assignments.find((a) => a.playerId === newPlayerId);
    const targetAssign = lineup.assignments.find((a) => a.slotId === slotId);
    if (!targetAssign) return;

    const next = lineup.assignments.map((a) => {
      if (a.slotId === slotId) return { ...a, playerId: newPlayerId };
      if (existingSlot && a.slotId === existingSlot.slotId) {
        return { ...a, playerId: targetAssign.playerId };
      }
      return a;
    });
    recomputeLineup(next, lineup.tactic);
  };

  const selectedAssignment = lineup?.assignments.find((a) => a.slotId === selectedSlot);
  const selectedPlayer = selectedAssignment
    ? playersById.get(selectedAssignment.playerId)
    : undefined;

  return (
    <div className="space-y-5">
      {/* Optimizer Controls */}
      <div className="rounded-2xl border border-ht-border bg-ht-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                Cíl optimalizace
              </label>
              <select
                value={objective}
                onChange={(e) => onChangeObjective(e.target.value as OptimizerObjective)}
                className="rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="win_probability">Max šance na výhru proti soupeři (xPts)</option>
                <option value="hatstats">Maximální HatStats (celková síla)</option>
                <option value="midfield">Dominance v záloze (držení míče)</option>
                <option value="counter_attack">Obrana & Protiútoky (CA)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">
                Hřiště & Přístup
              </label>
              <div className="flex gap-1.5">
                <select
                  value={context.venue}
                  onChange={(e) =>
                    onUpdateContext({ venue: e.target.value as MatchVenue })
                  }
                  className="rounded-xl border border-ht-border bg-[#0c1310] px-2.5 py-2 text-xs text-white"
                >
                  <option value="home">Doma (+záloha)</option>
                  <option value="away">Venku</option>
                  <option value="derby">Derby</option>
                </select>
                <select
                  value={context.attitude}
                  onChange={(e) =>
                    onUpdateContext({ attitude: e.target.value as MatchAttitude })
                  }
                  className="rounded-xl border border-ht-border bg-[#0c1310] px-2.5 py-2 text-xs text-white"
                >
                  <option value="normal">Normální přístup</option>
                  <option value="pic">PIC (Lážo plážo)</option>
                  <option value="mots">MOTS (Zápas sezóny)</option>
                </select>
                <select
                  value={context.weather}
                  onChange={(e) =>
                    onUpdateContext({ weather: e.target.value as WeatherType })
                  }
                  className="rounded-xl border border-ht-border bg-[#0c1310] px-2.5 py-2 text-xs text-white"
                >
                  {Object.entries(WEATHER_LABELS).map(([k, w]) => (
                    <option key={k} value={k}>
                      {w.icon} {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={respectTraining}
                  onChange={(e) => onChangeRespectTraining(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span>
                  Garantovat trénink ({TRAINING_META[club.trainingType].label})
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={onRunOptimizer}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition hover:from-emerald-500 hover:to-green-500"
          >
            <Sparkles className="h-4 w-4" />
            <span>Navrhnout optimální sestavu</span>
          </button>
        </div>

        {/* Formation Filter Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ht-border/70 pt-3">
          <span className="mr-1 text-[11px] text-slate-400">Povolená rozestavení:</span>
          {(Object.keys(FORMATIONS) as FormationId[]).map((fid) => {
            const active = allowedFormations.includes(fid);
            const exp = club.formationExperience[fid] ?? 8;
            return (
              <button
                key={fid}
                onClick={() => onToggleFormation(fid)}
                title={`Zkušenost s formací ${fid}: ${exp}/10`}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                    : 'border-ht-border bg-[#0c1310] text-slate-500 hover:text-slate-300'
                }`}
              >
                {active && <Check className="h-3 w-3" />}
                <span>{fid}</span>
                <span className="text-[10px] opacity-70">({exp})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 3 Suggested Variants */}
      {variants.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {variants.slice(0, 3).map((v, idx) => {
            const active = idx === activeVariantIdx;
            return (
              <button
                key={`${v.formation}-${idx}`}
                onClick={() => {
                  onSelectVariant(idx);
                  setSelectedSlot(null);
                }}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-950/30'
                    : 'border-ht-border bg-ht-panel hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-bold text-amber-300">
                      #{idx + 1}
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {v.formation}
                    </span>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {TACTIC_LABELS[v.tactic].short}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {v.simulation.winProb} % výhra
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>HatStats: <strong className="text-slate-200">{v.hatStats}</strong></span>
                  <span>xPts: <strong className="text-sky-300">{v.simulation.expectedPoints}</strong></span>
                  <span>Trénink: <strong className="text-amber-300">{v.trainingEfficiencyPct} %</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {lineup && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Pitch + Slot Editor */}
          <div className="space-y-4 lg:col-span-7">
            {/* 2D Football Pitch */}
            <div className="pitch-surface relative h-[560px] w-full overflow-hidden rounded-3xl border-2 border-emerald-500/40 shadow-2xl">
              {/* Pitch Lines */}
              <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-white/25">
                {/* Halfway line */}
                <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/25" />
                {/* Center circle */}
                <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
                {/* Opponent Penalty Box (Top) */}
                <div className="absolute left-1/2 top-0 h-20 w-56 -translate-x-1/2 border-b-2 border-l-2 border-r-2 border-white/25" />
                {/* My Penalty Box (Bottom) */}
                <div className="absolute bottom-0 left-1/2 h-20 w-56 -translate-x-1/2 border-l-2 border-r-2 border-t-2 border-white/25" />
              </div>

              <div className="pointer-events-none absolute left-6 top-6 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                ↑ Útok proti {opponent.name}
              </div>
              <div className="pointer-events-none absolute right-6 top-6 rounded-lg bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
                Formace {lineup.formation}
              </div>

              {/* Player Nodes */}
              {lineup.assignments.map((a) => {
                const p = playersById.get(a.playerId);
                if (!p) return null;
                const pos = PITCH_COORDS[a.slotId];
                const meta = SLOT_META[a.slotId];
                const orderMeta = ORDER_LABELS[a.order];
                const isSelected = selectedSlot === a.slotId;
                const isTrained =
                  trainedSlotsSet.has(a.slotId) && lockedSet.has(p.id);
                const isCap = lineup.captainId === p.id;
                const isSp = lineup.setPiecesTakerId === p.id;
                const spec = SPECIALTY_LABELS[p.specialty];
                const lastName = p.name.split(' ').slice(-1)[0];

                return (
                  <button
                    key={a.slotId}
                    onClick={() => setSelectedSlot(isSelected ? null : a.slotId)}
                    style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
                    className={`absolute flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-xl border p-1.5 text-center shadow-lg transition sm:w-32 ${
                      isSelected
                        ? 'z-20 scale-105 border-amber-400 bg-slate-900 ring-2 ring-amber-400/50'
                        : 'z-10 border-white/25 bg-[#0c1310]/90 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between px-0.5 text-[10px]">
                      <span className="font-bold text-emerald-400">{meta.short}</span>
                      <div className="flex items-center gap-0.5">
                        {isTrained && (
                          <span title="Trénovaný talent">
                            <Lock className="h-2.5 w-2.5 text-amber-400" />
                          </span>
                        )}
                        {isCap && (
                          <span className="rounded bg-amber-500 px-1 font-extrabold text-black" title="Kapitán">
                            C
                          </span>
                        )}
                        {isSp && (
                          <span className="rounded bg-sky-500 px-1 font-extrabold text-black" title="Standardky">
                            SP
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-white">
                      <span className="truncate max-w-[85px]">{lastName}</span>
                      {p.specialty !== 'None' && <span>{spec.icon}</span>}
                    </div>

                    <div className="mt-0.5 flex w-full items-center justify-between px-0.5 text-[10px]">
                      <span
                        className={`rounded px-1 font-medium ${
                          a.order === 'normal'
                            ? 'text-slate-400'
                            : 'bg-emerald-500/25 text-emerald-300'
                        }`}
                      >
                        {orderMeta.arrow} {orderMeta.short}
                      </span>
                      <span className="font-semibold text-amber-300">
                        ★ {a.starRating?.toFixed(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Slot Editor when a player on pitch is clicked */}
            {selectedSlot && selectedAssignment && selectedPlayer ? (
              <div className="rounded-2xl border border-amber-500/40 bg-ht-panel p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-amber-300">
                      Úprava postu: {SLOT_META[selectedSlot].label}
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      {selectedPlayer.name} ({selectedPlayer.ageYears}l) —{' '}
                      <span className="text-emerald-400">
                        ★ {selectedAssignment.starRating?.toFixed(1)}
                      </span>
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedSlot(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Zavřít úpravu
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Individuální pokyn hráče
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {SLOT_META[selectedSlot].allowedOrders.map((ord) => (
                        <button
                          key={ord}
                          onClick={() => handleChangeOrder(selectedSlot, ord)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                            selectedAssignment.order === ord
                              ? 'border-emerald-500 bg-emerald-600 text-white'
                              : 'border-ht-border bg-[#0c1310] text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {ORDER_LABELS[ord].arrow} {ORDER_LABELS[ord].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Vyměnit hráče na tomto postu
                    </label>
                    <select
                      value={selectedPlayer.id}
                      onChange={(e) =>
                        handleSwapPlayer(selectedSlot, Number(e.target.value))
                      }
                      className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs text-white"
                    >
                      {players
                        .filter((p) => p.injuredWeeks <= 0 && p.cards < 3)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.ageYears}l) — BR:{p.skills.keeper} OB:{p.skills.defending} TV:{p.skills.playmaking} KŘ:{p.skills.winger} ZAK:{p.skills.scoring}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-ht-border bg-ht-panel/70 px-4 py-2.5 text-xs text-slate-400">
                Tip: Klikni na jakéhokoliv hráče na hřišti pro okamžitou změnu individuálního pokynu nebo výměnu hráče se živým přepočtem šancí na výhru.
              </div>
            )}
          </div>

          {/* Right Panel: Ratings, Tactics, Captain, Substitutions */}
          <div className="space-y-4 lg:col-span-5">
            {/* Match Prediction & Summary */}
            <div className="rounded-2xl border border-ht-border bg-ht-panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span>Očekávaný výkon & výsledek</span>
                </h3>
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
                  HatStats: {lineup.hatStats}
                </span>
              </div>

              {/* Win / Draw / Loss Bar */}
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">
                    Výhra {lineup.simulation.winProb} %
                  </span>
                  <span className="text-slate-300">
                    Remíza {lineup.simulation.drawProb} %
                  </span>
                  <span className="text-rose-400">
                    Prohra {lineup.simulation.lossProb} %
                  </span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    style={{ width: `${lineup.simulation.winProb}%` }}
                    className="bg-emerald-500 transition-all"
                  />
                  <div
                    style={{ width: `${lineup.simulation.drawProb}%` }}
                    className="bg-slate-500 transition-all"
                  />
                  <div
                    style={{ width: `${lineup.simulation.lossProb}%` }}
                    className="bg-rose-500 transition-all"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>
                    Držení míče:{' '}
                    <strong className="text-white">
                      {lineup.simulation.possessionMy} %
                    </strong>
                  </span>
                  <span>
                    Oček. skóre:{' '}
                    <strong className="text-white">
                      {lineup.simulation.xGMy} : {lineup.simulation.xGOpp}
                    </strong>
                  </span>
                  <span>
                    Loddar: <strong className="text-sky-300">{lineup.loddarStats}</strong>
                  </span>
                </div>
              </div>

              {/* 7 Sectors Breakdown */}
              <div className="space-y-1.5 border-t border-ht-border pt-3 text-xs">
                {(
                  [
                    ['Záloha', lineup.ratings.midfield, opponent.ratings.midfield],
                    ['Pravá obrana', lineup.ratings.rightDef, opponent.ratings.leftAtt],
                    ['Střední obrana', lineup.ratings.centerDef, opponent.ratings.centerAtt],
                    ['Levá obrana', lineup.ratings.leftDef, opponent.ratings.rightAtt],
                    ['Pravý útok', lineup.ratings.rightAtt, opponent.ratings.leftDef],
                    ['Střední útok', lineup.ratings.centerAtt, opponent.ratings.centerDef],
                    ['Levý útok', lineup.ratings.leftAtt, opponent.ratings.rightDef],
                  ] as const
                ).map(([label, myVal, oppVal]) => {
                  const diff = myVal - oppVal;
                  return (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg bg-[#0c1310]/60 px-3 py-1.5"
                    >
                      <span className="font-medium text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {getSubLevelLabel(myVal)}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {myVal.toFixed(2)}
                        </span>
                        <span
                          className={`w-12 text-right font-mono text-[11px] font-semibold ${
                            diff >= 0.4
                              ? 'text-emerald-400'
                              : diff <= -0.4
                                ? 'text-rose-400'
                                : 'text-slate-400'
                          }`}
                        >
                          ({diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactic + Roles */}
            <div className="rounded-2xl border border-ht-border bg-ht-panel p-5 space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span>Týmová taktika (úroveň {lineup.tacticLevel}/20)</span>
                  </label>
                </div>
                <select
                  value={lineup.tactic}
                  onChange={(e) =>
                    recomputeLineup(lineup.assignments, e.target.value as TeamTactic)
                  }
                  className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs font-semibold text-white"
                >
                  {Object.entries(TACTIC_LABELS).map(([k, t]) => (
                    <option key={k} value={k}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  {TACTIC_LABELS[lineup.tactic].description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-ht-border pt-3 text-xs">
                <div className="rounded-xl bg-[#0c1310]/70 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-amber-300">
                    <Crown className="h-3.5 w-3.5" />
                    <span>Kapitán</span>
                  </div>
                  <div className="mt-1 font-bold text-white">
                    {lineup.captainId ? playersById.get(lineup.captainId)?.name : '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-[#0c1310]/70 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-sky-300">
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>Standardky</span>
                  </div>
                  <div className="mt-1 font-bold text-white">
                    {lineup.setPiecesTakerId
                      ? playersById.get(lineup.setPiecesTakerId)?.name
                      : '—'}
                  </div>
                </div>
              </div>

              {/* Bench & Substitutions */}
              <div className="border-t border-ht-border pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white">
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Lavička & Doporučená střídání</span>
                </div>

                <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
                  {[
                    ['GK', lineup.bench.gkId],
                    ['OBR', lineup.bench.defId],
                    ['ZÁL', lineup.bench.imId],
                    ['KŘ', lineup.bench.wiId],
                    ['ÚT', lineup.bench.fwId],
                  ].map(([role, id]) => (
                    <span
                      key={String(role)}
                      className="rounded-lg border border-ht-border bg-[#0c1310] px-2 py-1 text-slate-300"
                    >
                      <strong className="text-emerald-400">{role}:</strong>{' '}
                      {id ? playersById.get(Number(id))?.name.split(' ').slice(-1)[0] : '—'}
                    </span>
                  ))}
                </div>

                {lineup.substitutions.length > 0 ? (
                  <div className="space-y-1.5">
                    {lineup.substitutions.map((sub, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-ht-border/80 bg-[#0c1310]/60 px-3 py-2 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300">
                            {sub.minute}. min
                          </span>
                          <span>{sub.outPlayerName}</span>
                          <ArrowLeftRight className="h-3 w-3 text-amber-400" />
                          <span className="text-emerald-300">{sub.inPlayerName}</span>
                        </div>
                        <div className="mt-0.5 text-slate-400">{sub.reason}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    Kondice základní sestavy je dostatečná pro celých 90 minut.
                  </div>
                )}
              </div>

              {lineup.notes.length > 0 && (
                <div className="space-y-1 border-t border-ht-border pt-3">
                  {lineup.notes.map((n, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                      <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
