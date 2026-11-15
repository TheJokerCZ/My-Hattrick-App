import React, { useMemo } from 'react';
import {
  BarChart3,
  CloudSun,
  Crosshair,
  ShieldAlert,
  Sparkles,
  Swords,
} from 'lucide-react';
import {
  TACTIC_LABELS,
  WEATHER_LABELS,
  getSubLevelLabel,
} from '../constants/skillsAndTerms';
import { simulateMatch } from '../engine/matchSimulator';
import { calculateTeamRatings } from '../engine/ratingsEngine';
import {
  ClubSettings,
  CoachStyle,
  MatchAttitude,
  MatchContext,
  MatchVenue,
  OpponentProfile,
  Player,
  RecommendedLineup,
  TeamTactic,
  WeatherType,
} from '../types/hattrick';

interface MatchSimViewProps {
  players: Player[];
  club: ClubSettings;
  context: MatchContext;
  opponent: OpponentProfile;
  activeLineup: RecommendedLineup | null;
  onUpdateClub: (patch: Partial<ClubSettings>) => void;
  onUpdateContext: (patch: Partial<MatchContext>) => void;
  onUpdateOpponent: (opp: OpponentProfile) => void;
  onOptimizeAgainstOpponent: () => void;
}

const OPPONENT_PRESETS: Array<{ label: string; profile: OpponentProfile }> = [
  {
    label: 'Vyrovnaný soupeř',
    profile: {
      name: 'FC Rival Praha',
      tactic: 'normal',
      tacticLevel: 8,
      setPiecesLevel: 7,
      ratings: {
        midfield: 7.5,
        rightDef: 7.2,
        centerDef: 8.0,
        leftDef: 7.0,
        rightAtt: 6.8,
        centerAtt: 7.6,
        leftAtt: 6.9,
        indirectSetPiecesDef: 7.0,
        indirectSetPiecesAtt: 7.0,
      },
    },
  },
  {
    label: 'Křídelní tým (AOW)',
    profile: {
      name: 'AC Rychlá Křídla',
      tactic: 'aow',
      tacticLevel: 12,
      setPiecesLevel: 7,
      ratings: {
        midfield: 7.2,
        rightDef: 6.8,
        centerDef: 6.4,
        leftDef: 6.8,
        rightAtt: 9.2,
        centerAtt: 5.8,
        leftAtt: 9.0,
        indirectSetPiecesDef: 6.5,
        indirectSetPiecesAtt: 7.5,
      },
    },
  },
  {
    label: 'Betonář s protiútoky (CA)',
    profile: {
      name: 'TJ Železná Obrana',
      tactic: 'ca',
      tacticLevel: 14,
      setPiecesLevel: 9,
      ratings: {
        midfield: 5.2,
        rightDef: 9.2,
        centerDef: 10.2,
        leftDef: 9.0,
        rightAtt: 7.4,
        centerAtt: 8.2,
        leftAtt: 7.4,
        indirectSetPiecesDef: 8.5,
        indirectSetPiecesAtt: 8.0,
      },
    },
  },
  {
    label: 'Dominantní záloha',
    profile: {
      name: 'SK Záložní Válec',
      tactic: 'aim',
      tacticLevel: 11,
      setPiecesLevel: 8,
      ratings: {
        midfield: 10.4,
        rightDef: 6.3,
        centerDef: 7.4,
        leftDef: 6.2,
        rightAtt: 6.0,
        centerAtt: 8.8,
        leftAtt: 6.1,
        indirectSetPiecesDef: 7.0,
        indirectSetPiecesAtt: 7.5,
      },
    },
  },
];

export const MatchSimView: React.FC<MatchSimViewProps> = ({
  players,
  club,
  context,
  opponent,
  activeLineup,
  onUpdateClub,
  onUpdateContext,
  onUpdateOpponent,
  onOptimizeAgainstOpponent,
}) => {
  const playersById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );

  // Živý přepočet naší aktivní sestavy s aktuálními parametry klubu & kontextu
  const liveEval = useMemo(() => {
    if (!activeLineup) return null;
    const expLevel = club.formationExperience[activeLineup.formation] ?? 8;
    const { ratings, hatStats, loddarStats, tacticLevel } = calculateTeamRatings(
      activeLineup.assignments,
      playersById,
      club,
      context,
      activeLineup.tactic,
      expLevel
    );
    const lineupPlayers = activeLineup.assignments
      .map((a) => playersById.get(a.playerId))
      .filter((p): p is Player => Boolean(p));
    const avgSp =
      lineupPlayers.length > 0
        ? lineupPlayers.reduce((s, p) => s + p.skills.setPieces, 0) / lineupPlayers.length
        : 5;

    const simulation = simulateMatch({
      myRatings: ratings,
      myTactic: activeLineup.tactic,
      myTacticLevel: tacticLevel,
      mySetPiecesAvg: avgSp,
      myPlayers: lineupPlayers,
      opponent,
    });
    return { ratings, hatStats, loddarStats, tacticLevel, simulation };
  }, [activeLineup, playersById, club, context, opponent]);

  const updateOppRating = (key: keyof OpponentProfile['ratings'], val: number) => {
    onUpdateOpponent({
      ...opponent,
      ratings: {
        ...opponent.ratings,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Context + Team Spirit Controls */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-ht-border bg-ht-panel p-5 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Nálada v týmu (TS: {club.teamSpirit}/10)
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={club.teamSpirit}
            onChange={(e) => onUpdateClub({ teamSpirit: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <div className="text-[11px] text-emerald-300">
            {getSubLevelLabel(club.teamSpirit)}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Sebevědomí ({club.confidence}/10)
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={club.confidence}
            onChange={(e) => onUpdateClub({ confidence: Number(e.target.value) })}
            className="w-full accent-emerald-500"
          />
          <div className="text-[11px] text-sky-300">
            {getSubLevelLabel(club.confidence)}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Styl trenéra</label>
          <select
            value={club.coachStyle}
            onChange={(e) =>
              onUpdateClub({ coachStyle: e.target.value as CoachStyle })
            }
            className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs text-white"
          >
            <option value="balanced">Neutrální</option>
            <option value="defensive">Defenzivní (+8 % obrana)</option>
            <option value="offensive">Ofenzivní (+8 % útok)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Hřiště & Přístup</label>
          <div className="flex gap-1.5">
            <select
              value={context.venue}
              onChange={(e) =>
                onUpdateContext({ venue: e.target.value as MatchVenue })
              }
              className="w-1/2 rounded-xl border border-ht-border bg-[#0c1310] px-2 py-2 text-xs text-white"
            >
              <option value="home">Doma</option>
              <option value="away">Venku</option>
              <option value="derby">Derby</option>
            </select>
            <select
              value={context.attitude}
              onChange={(e) =>
                onUpdateContext({ attitude: e.target.value as MatchAttitude })
              }
              className="w-1/2 rounded-xl border border-ht-border bg-[#0c1310] px-2 py-2 text-xs text-white"
            >
              <option value="normal">Normál</option>
              <option value="pic">PIC</option>
              <option value="mots">MOTS</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 flex items-center gap-1 text-xs text-slate-400">
            <CloudSun className="h-3.5 w-3.5" />
            <span>Počasí</span>
          </label>
          <select
            value={context.weather}
            onChange={(e) =>
              onUpdateContext({ weather: e.target.value as WeatherType })
            }
            className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs text-white"
          >
            {Object.entries(WEATHER_LABELS).map(([k, w]) => (
              <option key={k} value={k}>
                {w.icon} {w.label}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[10px] text-slate-400">
            {WEATHER_LABELS[context.weather].effect}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Opponent Scouting & Sliders */}
        <div className="space-y-4 rounded-2xl border border-ht-border bg-ht-panel p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Profil & ratingy soupeře</span>
            </h3>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {OPPONENT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onUpdateOpponent(structuredClone(preset.profile))}
                className="rounded-lg border border-ht-border bg-[#0c1310] px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-emerald-500/50 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="mb-1 block text-slate-400">Název soupeře</label>
              <input
                type="text"
                value={opponent.name}
                onChange={(e) =>
                  onUpdateOpponent({ ...opponent, name: e.target.value })
                }
                className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-slate-400">Taktika soupeře</label>
              <select
                value={opponent.tactic}
                onChange={(e) =>
                  onUpdateOpponent({
                    ...opponent,
                    tactic: e.target.value as TeamTactic,
                  })
                }
                className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
              >
                {Object.entries(TACTIC_LABELS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-ht-border pt-3">
            {(
              [
                ['midfield', 'Záloha soupeře'],
                ['rightDef', 'Pravá obrana soupeře'],
                ['centerDef', 'Střední obrana soupeře'],
                ['leftDef', 'Levá obrana soupeře'],
                ['rightAtt', 'Pravý útok soupeře'],
                ['centerAtt', 'Střední útok soupeře'],
                ['leftAtt', 'Levý útok soupeře'],
              ] as const
            ).map(([key, label]) => {
              const val = opponent.ratings[key];
              return (
                <div key={key} className="text-xs">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-mono font-bold text-rose-300">
                      {val.toFixed(1)}{' '}
                      <span className="font-sans text-[10px] font-normal text-slate-400">
                        ({getSubLevelLabel(val)})
                      </span>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={18}
                    step={0.25}
                    value={val}
                    onChange={(e) => updateOppRating(key, Number(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={onOptimizeAgainstOpponent}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500"
          >
            <Sparkles className="h-4 w-4" />
            <span>Přeoptimalizovat sestavu proti tomuto soupeři</span>
          </button>
        </div>

        {/* Right: Match Simulation Output */}
        <div className="space-y-5 lg:col-span-7">
          {liveEval && (
            <>
              <div className="rounded-2xl border border-ht-border bg-ht-panel p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-white">
                      <Swords className="h-5 w-5 text-emerald-400" />
                      <span>
                        {club.teamName} vs. {opponent.name}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Formace {activeLineup?.formation} • Taktika{' '}
                      {activeLineup ? TACTIC_LABELS[activeLineup.tactic].label : ''}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-right">
                    <div className="text-[11px] text-emerald-300">Očekávané body</div>
                    <div className="text-lg font-extrabold text-white">
                      {liveEval.simulation.expectedPoints} xPts
                    </div>
                  </div>
                </div>

                {/* Big Outcome Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="text-xs font-semibold text-emerald-300">VÝHRA</div>
                    <div className="mt-1 text-3xl font-black text-white">
                      {liveEval.simulation.winProb} %
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-600/40 bg-slate-800/40 p-4">
                    <div className="text-xs font-semibold text-slate-300">REMÍZA</div>
                    <div className="mt-1 text-3xl font-black text-white">
                      {liveEval.simulation.drawProb} %
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
                    <div className="text-xs font-semibold text-rose-300">PROHRA</div>
                    <div className="mt-1 text-3xl font-black text-white">
                      {liveEval.simulation.lossProb} %
                    </div>
                  </div>
                </div>

                {/* Possession & xG Breakdown */}
                <div className="mt-5 space-y-3 border-t border-ht-border pt-4 text-xs">
                  <div>
                    <div className="mb-1 flex justify-between font-semibold">
                      <span className="text-emerald-300">
                        Držení míče (My): {liveEval.simulation.possessionMy} %
                      </span>
                      <span className="text-rose-300">
                        Soupeř: {liveEval.simulation.possessionOpp} %
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
                      <div
                        style={{ width: `${liveEval.simulation.possessionMy}%` }}
                        className="bg-emerald-500"
                      />
                      <div
                        style={{ width: `${liveEval.simulation.possessionOpp}%` }}
                        className="bg-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-[#0c1310]/70 p-3">
                      <div className="text-[11px] text-slate-400">Oček. skóre (xG)</div>
                      <div className="mt-0.5 text-base font-extrabold text-white">
                        {liveEval.simulation.xGMy} : {liveEval.simulation.xGOpp}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0c1310]/70 p-3">
                      <div className="text-[11px] text-slate-400">Nejčastější výsledek</div>
                      <div className="mt-0.5 text-base font-extrabold text-amber-300">
                        {liveEval.simulation.likelyScore}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0c1310]/70 p-3">
                      <div className="text-[11px] text-slate-400">Běžné šance (My/Soup)</div>
                      <div className="mt-0.5 text-base font-extrabold text-sky-300">
                        {liveEval.simulation.expectedRegularChancesMy} /{' '}
                        {liveEval.simulation.expectedRegularChancesOpp}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#0c1310]/70 p-3">
                      <div className="text-[11px] text-slate-400">Brejky + SE (My)</div>
                      <div className="mt-0.5 text-base font-extrabold text-emerald-300">
                        {(
                          liveEval.simulation.expectedCounterChancesMy +
                          liveEval.simulation.expectedSpecialEventsMy
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sector Duels (Cubic Probabilities) */}
              <div className="rounded-2xl border border-ht-border bg-ht-panel p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                  <BarChart3 className="h-4 w-4 text-sky-400" />
                  <span>Kubické souboje sektorů (Šance na proměnění šance)</span>
                </h4>
                <div className="space-y-3">
                  {liveEval.simulation.sectorDuels.map((duel) => (
                    <div
                      key={duel.sectorName}
                      className="rounded-xl border border-ht-border bg-[#0c1310]/60 p-3 text-xs"
                    >
                      <div className="mb-2 font-semibold text-slate-200">
                        {duel.sectorName}
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2">
                          <div>
                            <div className="text-[11px] text-slate-400">
                              Náš útok ({duel.myAttack.toFixed(1)}) vs Obr. (
                              {duel.oppDefense.toFixed(1)})
                            </div>
                          </div>
                          <span className="flex items-center gap-1 font-extrabold text-emerald-400">
                            <Crosshair className="h-3.5 w-3.5" />
                            {duel.myGoalProb} % gól
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-rose-500/10 px-3 py-2">
                          <div>
                            <div className="text-[11px] text-slate-400">
                              Jejich útok ({duel.oppAttack.toFixed(1)}) vs Obr. (
                              {duel.myDefense.toFixed(1)})
                            </div>
                          </div>
                          <span className="font-extrabold text-rose-400">
                            {duel.oppGoalProb} % gól
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
