import React, { useMemo } from 'react';
import {
  ArrowRight,
  Award,
  Clock,
  Dumbbell,
  Flame,
  Lock,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  SPECIALTY_LABELS,
  TRAINING_META,
  getSkillBadgeColor,
  getSkillLabel,
} from '../constants/skillsAndTerms';
import {
  evaluateProspects,
  recommendStaminaShare,
  recommendTrainings,
} from '../engine/trainingAdvisor';
import { ClubSettings, Player, TrainingType } from '../types/hattrick';

interface TrainingViewProps {
  players: Player[];
  club: ClubSettings;
  onUpdateClub: (patch: Partial<ClubSettings>) => void;
  onApplyTrainingAndOptimize: (type: TrainingType, leaguePlayerIds: number[]) => void;
  onToggleTrainingLock: (playerId: number) => void;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  players,
  club,
  onUpdateClub,
  onApplyTrainingAndOptimize,
  onToggleTrainingLock,
}) => {
  const recommendations = useMemo(
    () => recommendTrainings(players, club),
    [players, club]
  );
  const prospects = useMemo(
    () => evaluateProspects(players, club),
    [players, club]
  );
  const recStamina = useMemo(() => recommendStaminaShare(players), [players]);

  const activeRec =
    recommendations.find((r) => r.trainingType === club.trainingType) ??
    recommendations[0];

  const lockedSet = new Set(club.trainingLockedPlayerIds);

  return (
    <div className="space-y-6">
      {/* Coach & Training Parameters */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-ht-border bg-ht-panel p-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Dumbbell className="h-5 w-5" />
            <h2 className="text-base font-bold text-white">Nastavení trenéra & intenzity</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Parametry přímo ovlivňují rychlost tréninku (týdny do další úrovně) a doporučenou kondici.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Úroveň trenéra</label>
          <select
            value={club.coachLevel}
            onChange={(e) => onUpdateClub({ coachLevel: Number(e.target.value) })}
            className="w-full rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs text-white"
          >
            <option value={5}>5 — Nedostatečný</option>
            <option value={6}>6 — Přijatelný</option>
            <option value={7}>7 — Dobrý (doporučeno)</option>
            <option value={8}>8 — Solidní</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">
            Asistenti trenéra ({club.assistantsLevel}/10)
          </label>
          <input
            type="range"
            min={0}
            max={10}
            value={club.assistantsLevel}
            onChange={(e) => onUpdateClub({ assistantsLevel: Number(e.target.value) })}
            className="mt-2 w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0</span>
            <span>5</span>
            <span>10 (max)</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Kondice ({club.staminaShare} %)</span>
            <button
              onClick={() => onUpdateClub({ staminaShare: recStamina })}
              className="text-[11px] font-semibold text-emerald-400 hover:underline"
            >
              Doporučeno: {recStamina} %
            </button>
          </div>
          <input
            type="range"
            min={5}
            max={35}
            value={club.staminaShare}
            onChange={(e) => onUpdateClub({ staminaShare: Number(e.target.value) })}
            className="mt-2 w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>5 %</span>
            <span>Intenzita: {club.trainingIntensity} %</span>
            <span>35 %</span>
          </div>
        </div>
      </div>

      {/* Top Training Rankings + Active Slots Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Ranked Trainings */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Doporučené tréninky podle tvé soupisky</span>
            </h3>
            <span className="text-xs text-slate-400">Seřazeno podle potenciálu talentů</span>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec, index) => {
              const meta = TRAINING_META[rec.trainingType];
              const isSelected = club.trainingType === rec.trainingType;
              return (
                <div
                  key={rec.trainingType}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-950/30'
                      : 'border-ht-border bg-ht-panel hover:border-slate-600'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                            index === 0
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white">{meta.label}</h4>
                        {index === 0 && (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                            Nejlepší volba pro kádr
                          </span>
                        )}
                        {isSelected && (
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                            Aktivní
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">{rec.reasoning}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-extrabold text-emerald-400">
                        {rec.suitabilityScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Skóre vhodnosti</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ht-border/70 pt-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3 text-slate-300">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-sky-400" />
                        cca <strong>{rec.weeksPerSkillUpAvg} týdne</strong> / úroveň
                      </span>
                      <span>•</span>
                      <span>
                        Formace:{' '}
                        <strong className="text-white">
                          {rec.recommendedFormations.join(', ')}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSelected && (
                        <button
                          onClick={() =>
                            onUpdateClub({
                              trainingType: rec.trainingType,
                              trainingLockedPlayerIds: rec.leagueSlots100.map((p) => p.id),
                            })
                          }
                          className="rounded-lg border border-ht-border bg-ht-card px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-emerald-500/50"
                        >
                          Zvolit trénink
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onApplyTrainingAndOptimize(
                            rec.trainingType,
                            rec.leagueSlots100.map((p) => p.id)
                          )
                        }
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        <span>Aplikovat & navrhnout sestavu</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Slot Planner for Selected Training */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-ht-border bg-ht-panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>Týdenní rozpis slotů ({TRAINING_META[activeRec.trainingType].label})</span>
              </h3>
            </div>
            <p className="mb-4 text-xs text-slate-400">
              {TRAINING_META[activeRec.trainingType].description}
            </p>

            {/* Liga 100% */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-300">
                <span>Neděle — Liga (100 % trénink)</span>
                <span>
                  {activeRec.leagueSlots100.length} /{' '}
                  {TRAINING_META[activeRec.trainingType].slots100PerMatch} slotů
                </span>
              </div>
              <div className="space-y-1.5">
                {activeRec.leagueSlots100.map((p) => {
                  const skillKey = TRAINING_META[activeRec.trainingType].skillKey;
                  const val = p.skills[skillKey];
                  const isLocked = lockedSet.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-ht-border bg-[#0c1310]/70 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="ml-2 text-slate-400">({p.ageYears}l)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded border px-1.5 py-0.5 font-bold ${getSkillBadgeColor(
                            val
                          )}`}
                        >
                          {val} ({getSkillLabel(val)})
                        </span>
                        <button
                          onClick={() => onToggleTrainingLock(p.id)}
                          className={`rounded p-1 ${
                            isLocked
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'text-slate-500 hover:text-white'
                          }`}
                          title="Uzamknout pro ligový optimalizátor"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Přátelák / Pohár 100% */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-sky-300">
                <span>Středa — Přátelák / Pohár (100 % trénink)</span>
                <span>
                  {activeRec.friendlySlots100.length} /{' '}
                  {TRAINING_META[activeRec.trainingType].slots100PerMatch} slotů
                </span>
              </div>
              {activeRec.friendlySlots100.length > 0 ? (
                <div className="space-y-1.5">
                  {activeRec.friendlySlots100.map((p) => {
                    const skillKey = TRAINING_META[activeRec.trainingType].skillKey;
                    const val = p.skills[skillKey];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-ht-border bg-[#0c1310]/40 px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-slate-200">{p.name}</span>
                          <span className="ml-2 text-slate-400">({p.ageYears}l)</span>
                        </div>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-bold ${getSkillBadgeColor(
                            val
                          )}`}
                        >
                          {val}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
                  Pro středeční zápas chybí mladí náhradníci — zvaž nákup levných 17–18letých talentů na volné sloty (výrazně zvýší zisk)!
                </div>
              )}
            </div>

            {/* 50% Sloty */}
            {activeRec.slots50.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Doplňkové 50% sloty (Liga + Přátelák)</span>
                  <span>{activeRec.slots50.length} hráčů</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeRec.slots50.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg border border-ht-border bg-[#0c1310] px-2.5 py-1 text-[11px] text-slate-300"
                    >
                      {p.name} ({p.ageYears}l)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prospect Analysis Table */}
      <div className="rounded-2xl border border-ht-border bg-ht-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Award className="h-4 w-4 text-amber-400" />
            <span>Analýza perspektivních hráčů (Na koho se zaměřit)</span>
          </h3>
          <span className="text-xs text-slate-400">
            Index perspektivy kombinuje věk, hlavní dovednost, multiskill a specialitu
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ht-border text-[11px] uppercase text-slate-400">
              <tr>
                <th className="py-2.5 pr-3">Hráč</th>
                <th className="px-2 py-2.5">Věk</th>
                <th className="px-2 py-2.5 text-center">Prospect</th>
                <th className="px-2 py-2.5">Hlavní předpoklad</th>
                <th className="px-2 py-2.5">Doporučený trénink & role</th>
                <th className="px-2 py-2.5">Vedlejší dovednosti</th>
                <th className="px-2 py-2.5 text-right">Skill-up za</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ht-border/60">
              {prospects.slice(0, 12).map((pr) => {
                const spec = SPECIALTY_LABELS[pr.player.specialty];
                return (
                  <tr key={pr.player.id} className="hover:bg-ht-card/40">
                    <td className="py-2.5 pr-3 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <span>{pr.player.name}</span>
                        {pr.player.specialty !== 'None' && (
                          <span className="text-[11px]" title={spec.label}>
                            {spec.icon}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-slate-400">
                        {pr.marketPotentialLabel}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span
                        className={
                          pr.player.ageYears <= 19
                            ? 'font-bold text-emerald-300'
                            : 'text-slate-300'
                        }
                      >
                        {pr.player.ageYears}l {pr.player.ageDays}d
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                          pr.prospectScore >= 75
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : pr.prospectScore >= 55
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pr.prospectScore >= 75 && <Flame className="h-3 w-3" />}
                        {pr.prospectScore}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-slate-300">{pr.primarySkillName}: </span>
                      <span
                        className={`ml-1 rounded border px-1.5 py-0.5 font-bold ${getSkillBadgeColor(
                          pr.primarySkillValue
                        )}`}
                      >
                        {pr.primarySkillValue}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="font-medium text-emerald-300">
                        {TRAINING_META[pr.bestTrainingType].label}
                      </div>
                      <div className="text-[11px] text-slate-400">{pr.recommendedRole}</div>
                    </td>
                    <td className="px-2 py-2.5 text-[11px] text-slate-400">
                      {pr.secondarySkillSummary}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-sky-300">
                      ~{pr.weeksToNextSkillUp} t.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
