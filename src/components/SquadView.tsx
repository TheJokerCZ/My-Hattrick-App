import React, { useMemo, useState } from 'react';
import {
  Edit3,
  Heart,
  Lock,
  Plus,
  Search,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  SPECIALTY_LABELS,
  getSkillBadgeColor,
  getSkillLabel,
} from '../constants/skillsAndTerms';
import { evaluateProspects } from '../engine/trainingAdvisor';
import { ClubSettings, Player, Specialty } from '../types/hattrick';

interface SquadViewProps {
  players: Player[];
  club: ClubSettings;
  onSavePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: number) => void;
  onToggleTrainingLock: (playerId: number) => void;
  onOpenImport: () => void;
}

const EMPTY_PLAYER = (nextNum: number): Player => ({
  id: Date.now(),
  name: 'Nový Talent',
  number: nextNum,
  ageYears: 18,
  ageDays: 20,
  tsi: 3500,
  wage: 18000,
  injuredWeeks: 0,
  cards: 0,
  specialty: 'Quick',
  form: 7,
  stamina: 7,
  experience: 2,
  leadership: 4,
  loyalty: 12,
  motherClubBonus: false,
  skills: {
    keeper: 1,
    defending: 5,
    playmaking: 8,
    winger: 5,
    passing: 7,
    scoring: 4,
    setPieces: 4,
  },
});

export const SquadView: React.FC<SquadViewProps> = ({
  players,
  club,
  onSavePlayer,
  onDeletePlayer,
  onToggleTrainingLock,
  onOpenImport,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'talents' | 'locked' | 'available'>('all');
  const [sortBy, setSortBy] = useState<'prospect' | 'tsi' | 'age' | 'name'>('prospect');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const prospectMap = useMemo(() => {
    const evals = evaluateProspects(players, club);
    return new Map(evals.map((e) => [e.player.id, e]));
  }, [players, club]);

  const lockedSet = useMemo(
    () => new Set(club.trainingLockedPlayerIds),
    [club.trainingLockedPlayerIds]
  );

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === 'talents' && p.ageYears > 21) return false;
        if (filter === 'locked' && !lockedSet.has(p.id)) return false;
        if (filter === 'available' && (p.injuredWeeks > 0 || p.cards >= 3)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'prospect') {
          return (
            (prospectMap.get(b.id)?.prospectScore ?? 0) -
            (prospectMap.get(a.id)?.prospectScore ?? 0)
          );
        }
        if (sortBy === 'tsi') return b.tsi - a.tsi;
        if (sortBy === 'age') {
          return a.ageYears * 112 + a.ageDays - (b.ageYears * 112 + b.ageDays);
        }
        return a.name.localeCompare(b.name, 'cs');
      });
  }, [players, search, filter, sortBy, lockedSet, prospectMap]);

  const avgAge =
    players.length > 0
      ? (players.reduce((s, p) => s + p.ageYears, 0) / players.length).toFixed(1)
      : '0';

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ht-border bg-ht-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat hráče..."
              className="w-56 rounded-xl border border-ht-border bg-[#0c1310] py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex rounded-xl border border-ht-border bg-[#0c1310] p-1 text-xs font-medium">
            {[
              { id: 'all', label: `Všichni (${players.length})` },
              { id: 'talents', label: 'Mladí ≤21' },
              { id: 'locked', label: `Trénovaní (${lockedSet.size})` },
              { id: 'available', label: 'Zdraví' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`rounded-lg px-2.5 py-1.5 transition ${
                  filter === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-xl border border-ht-border bg-[#0c1310] px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="prospect">Řadit: Perspektiva (Prospect)</option>
            <option value="tsi">Řadit: TSI (Síla)</option>
            <option value="age">Řadit: Nejmladší</option>
            <option value="name">Řadit: Jméno</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-slate-400 md:inline">
            Průměrný věk: <strong className="text-slate-200">{avgAge} let</strong>
          </span>
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            <Upload className="h-4 w-4" />
            <span>Importovat z Hattricku</span>
          </button>
          <button
            onClick={() => setEditingPlayer(EMPTY_PLAYER(players.length + 1))}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            <span>Přidat hráče</span>
          </button>
        </div>
      </div>

      {/* Squad Table */}
      <div className="overflow-x-auto rounded-2xl border border-ht-border bg-ht-panel">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-ht-border bg-[#0c1310]/80 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-3">Trénink</th>
              <th className="px-3 py-3">Hráč</th>
              <th className="px-2 py-3 text-center">Věk</th>
              <th className="px-2 py-3 text-center">TSI</th>
              <th className="px-2 py-3 text-center" title="Forma / Kondice">F / K</th>
              <th className="px-2 py-3 text-center" title="Brankář">BR</th>
              <th className="px-2 py-3 text-center" title="Bránění">OB</th>
              <th className="px-2 py-3 text-center" title="Tvorba hry">TV</th>
              <th className="px-2 py-3 text-center" title="Křídlo">KŘ</th>
              <th className="px-2 py-3 text-center" title="Přihrávky">PŘ</th>
              <th className="px-2 py-3 text-center" title="Zakončování">ZAK</th>
              <th className="px-2 py-3 text-center" title="Standardní situace">SP</th>
              <th className="px-3 py-3 text-center">Potenciál</th>
              <th className="px-3 py-3 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ht-border/60">
            {filteredPlayers.map((p) => {
              const evalInfo = prospectMap.get(p.id);
              const isLocked = lockedSet.has(p.id);
              const spec = SPECIALTY_LABELS[p.specialty];
              return (
                <tr key={p.id} className="transition hover:bg-ht-card/50">
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onToggleTrainingLock(p.id)}
                      title={
                        isLocked
                          ? 'Hráč je uzamčen pro ligové tréninkové sloty (kliknutím odemkneš)'
                          : 'Uzamknout hráče do ligového tréninku'
                      }
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                        isLocked
                          ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                          : 'border-ht-border bg-[#0c1310]/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                      <span>{isLocked ? 'Trénink' : 'Volný'}</span>
                    </button>
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[11px] font-bold text-slate-300">
                        {p.number}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-white">
                          <span>{p.name}</span>
                          {p.nationality && (
                            <span
                              className="rounded border border-sky-600/40 bg-sky-950/80 px-1 py-0.2 text-[9px] font-bold text-sky-300"
                              title={`Národnost: ${p.nationality}`}
                            >
                              {p.nationality}
                            </span>
                          )}
                          {p.motherClubBonus && (
                            <span title="Odchovanec (+0.5 ke všem dovednostem)">
                              <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                            </span>
                          )}
                          {p.specialty !== 'None' && (
                            <span
                              className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200"
                              title={spec.label}
                            >
                              {spec.icon} {spec.short}
                            </span>
                          )}
                          {p.injuredWeeks > 0 && (
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                              +{p.injuredWeeks}t
                            </span>
                          )}
                          {p.injuredWeeks === -1 && (
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              Náplast
                            </span>
                          )}
                          {p.cards >= 3 && (
                            <span className="rounded bg-red-600/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                              Stopka
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{evalInfo?.recommendedRole}</span>
                          {p.preferredPosition && (
                            <span
                              className="rounded border border-emerald-500/40 bg-emerald-950/70 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-300"
                              title="Doporučená pozice a pokyn z Foxtricku / Excelu (NejP)"
                            >
                              NejP: {p.preferredPosition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2.5 text-center whitespace-nowrap">
                    <span className={p.ageYears <= 20 ? 'font-bold text-emerald-300' : 'text-slate-300'}>
                      {p.ageYears}l {p.ageDays}d
                    </span>
                  </td>

                  <td className="px-2 py-2.5 text-center font-mono text-slate-300">
                    {p.tsi.toLocaleString('cs-CZ')}
                  </td>

                  <td className="px-2 py-2.5 text-center">
                    <span className="text-sky-300">{p.form}</span>
                    <span className="text-slate-500">/</span>
                    <span className={p.stamina <= 5 ? 'text-amber-400' : 'text-emerald-300'}>
                      {p.stamina}
                    </span>
                  </td>

                  {(
                    [
                      p.skills.keeper,
                      p.skills.defending,
                      p.skills.playmaking,
                      p.skills.winger,
                      p.skills.passing,
                      p.skills.scoring,
                      p.skills.setPieces,
                    ] as const
                  ).map((val, idx) => (
                    <td key={idx} className="px-1.5 py-2.5 text-center">
                      <span
                        title={getSkillLabel(val)}
                        className={`inline-block min-w-[26px] rounded-md border px-1.5 py-0.5 font-bold ${getSkillBadgeColor(
                          val
                        )}`}
                      >
                        {val}
                      </span>
                    </td>
                  ))}

                  <td className="px-3 py-2.5 text-center">
                    {evalInfo && (
                      <div className="flex flex-col items-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            evalInfo.prospectScore >= 75
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : evalInfo.prospectScore >= 50
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {evalInfo.prospectScore}/100
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingPlayer(structuredClone(p))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Upravit hráče"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeletePlayer(p.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300"
                        title="Odstranit hráče"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Player Editor Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ht-border bg-ht-panel p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-ht-border pb-3">
              <h3 className="text-base font-bold text-white">Upravit hráče: {editingPlayer.name}</h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="col-span-2">
                <label className="mb-1 block text-slate-400">Jméno</label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Národnost</label>
                <input
                  type="text"
                  value={editingPlayer.nationality ?? ''}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, nationality: e.target.value })
                  }
                  placeholder="např. Česká republika nebo CZ"
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">NejP (Pozice / Pokyn)</label>
                <input
                  type="text"
                  value={editingPlayer.preferredPosition ?? ''}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, preferredPosition: e.target.value })
                  }
                  placeholder="např. KOd, SO, Únk..."
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Věk (roky)</label>
                <input
                  type="number"
                  min={17}
                  max={45}
                  value={editingPlayer.ageYears}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      ageYears: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Dny (0–111)</label>
                <input
                  type="number"
                  min={0}
                  max={111}
                  value={editingPlayer.ageDays}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      ageDays: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-400">TSI</label>
                <input
                  type="number"
                  value={editingPlayer.tsi}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, tsi: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Specialita</label>
                <select
                  value={editingPlayer.specialty}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      specialty: e.target.value as Specialty,
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-2 py-2 text-white"
                >
                  {Object.entries(SPECIALTY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.icon} {v.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Forma (1–8)</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={editingPlayer.form}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, form: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Kondice (1–9)</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  value={editingPlayer.stamina}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      stamina: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Zkušenosti (1–20)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editingPlayer.experience}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      experience: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Vůdcovství (1–8)</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={editingPlayer.leadership}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      leadership: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Věrnost (1–20)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editingPlayer.loyalty}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      loyalty: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-400">Zranění (-1=náplast)</label>
                <input
                  type="number"
                  min={-1}
                  max={12}
                  value={editingPlayer.injuredWeeks}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      injuredWeeks: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="mt-4 border-t border-ht-border pt-4">
              <div className="mb-2 text-xs font-semibold text-emerald-300">
                Hlavní dovednosti (1–20)
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {(
                  [
                    ['keeper', 'Brankář'],
                    ['defending', 'Bránění'],
                    ['playmaking', 'Tvorba hry'],
                    ['winger', 'Křídlo'],
                    ['passing', 'Přihrávky'],
                    ['scoring', 'Zakončování'],
                    ['setPieces', 'Standardky'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-slate-400">
                      {label} ({getSkillLabel(editingPlayer.skills[key])})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={editingPlayer.skills[key]}
                      onChange={(e) =>
                        setEditingPlayer({
                          ...editingPlayer,
                          skills: {
                            ...editingPlayer.skills,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full rounded-lg border border-ht-border bg-[#0c1310] px-3 py-2 text-white"
                    />
                  </div>
                ))}
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={editingPlayer.motherClubBonus}
                      onChange={(e) =>
                        setEditingPlayer({
                          ...editingPlayer,
                          motherClubBonus: e.target.checked,
                        })
                      }
                      className="accent-emerald-500"
                    />
                    <span>Odchovanec (+0.5)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="rounded-xl border border-ht-border px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-ht-card"
              >
                Zrušit
              </button>
              <button
                onClick={() => {
                  onSavePlayer(editingPlayer);
                  setEditingPlayer(null);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Uložit hráče
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
