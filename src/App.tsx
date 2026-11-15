import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_CLUB_SETTINGS,
  DEFAULT_MATCH_CONTEXT,
  DEFAULT_OPPONENT,
  SAMPLE_SQUAD,
} from './constants/sampleSquad';
import { FORMATIONS } from './constants/skillsAndTerms';
import { optimizeLineup } from './engine/lineupOptimizer';
import { recommendStaminaShare, recommendTrainings } from './engine/trainingAdvisor';
import {
  ChppCredentials,
  ClubSettings,
  FormationId,
  MatchContext,
  OpponentProfile,
  OptimizerObjective,
  Player,
  RecommendedLineup,
  TrainingType,
} from './types/hattrick';
import { DashboardView } from './components/DashboardView';
import { ImportModal } from './components/ImportModal';
import { LineupView } from './components/LineupView';
import { MatchSimView } from './components/MatchSimView';
import { ActiveTab, Navbar } from './components/Navbar';
import { OpponentScoutView } from './components/OpponentScoutView';
import { SquadView } from './components/SquadView';
import { TrainingView } from './components/TrainingView';

const STORAGE_KEY = 'myhattrick_state_v1';

interface PersistedState {
  players: Player[];
  club: ClubSettings;
  context: MatchContext;
  opponent: OpponentProfile;
  chpp: ChppCredentials;
  objective: OptimizerObjective;
  respectTraining: boolean;
  allowedFormations: FormationId[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.players) && parsed.players.length > 0 && parsed.club) {
        return {
          players: parsed.players,
          club: { ...DEFAULT_CLUB_SETTINGS, ...parsed.club },
          context: { ...DEFAULT_MATCH_CONTEXT, ...(parsed.context ?? {}) },
          opponent: { ...DEFAULT_OPPONENT, ...(parsed.opponent ?? {}) },
          chpp: {
            consumerKey: '',
            consumerSecret: '',
            accessToken: '',
            accessTokenSecret: '',
            ...(parsed.chpp ?? {}),
          },
          objective: parsed.objective ?? 'win_probability',
          respectTraining: parsed.respectTraining ?? true,
          allowedFormations:
            parsed.allowedFormations ?? (Object.keys(FORMATIONS) as FormationId[]),
        };
      }
    }
  } catch {
    // Fallback na výchozí data
  }
  return {
    players: SAMPLE_SQUAD,
    club: DEFAULT_CLUB_SETTINGS,
    context: DEFAULT_MATCH_CONTEXT,
    opponent: DEFAULT_OPPONENT,
    chpp: {
      consumerKey: '',
      consumerSecret: '',
      accessToken: '',
      accessTokenSecret: '',
    },
    objective: 'win_probability',
    respectTraining: true,
    allowedFormations: Object.keys(FORMATIONS) as FormationId[],
  };
}

export function App() {
  const [initial] = useState<PersistedState>(() => loadInitialState());
  const [players, setPlayers] = useState<Player[]>(initial.players);
  const [club, setClub] = useState<ClubSettings>(initial.club);
  const [context, setContext] = useState<MatchContext>(initial.context);
  const [opponent, setOpponent] = useState<OpponentProfile>(initial.opponent);
  const [chpp, setChpp] = useState<ChppCredentials>(initial.chpp);
  const [objective, setObjective] = useState<OptimizerObjective>(initial.objective);
  const [respectTraining, setRespectTraining] = useState<boolean>(initial.respectTraining);
  const [allowedFormations, setAllowedFormations] = useState<FormationId[]>(
    initial.allowedFormations
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [importOpen, setImportOpen] = useState(false);

  const [variants, setVariants] = useState<RecommendedLineup[]>(() =>
    optimizeLineup({
      players: initial.players,
      club: initial.club,
      context: initial.context,
      opponent: initial.opponent,
      objective: initial.objective,
      respectTraining: initial.respectTraining,
      allowedFormations: initial.allowedFormations,
    })
  );
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  // Ukládání změn do localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        players,
        club,
        context,
        opponent,
        chpp,
        objective,
        respectTraining,
        allowedFormations,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignorujeme chybu kvóty úložiště
    }
  }, [players, club, context, opponent, chpp, objective, respectTraining, allowedFormations]);

  const runOptimizer = useCallback(
    (
      nextPlayers = players,
      nextClub = club,
      nextContext = context,
      nextOpponent = opponent,
      nextObjective = objective,
      nextRespectTraining = respectTraining,
      nextAllowed = allowedFormations
    ) => {
      const result = optimizeLineup({
        players: nextPlayers,
        club: nextClub,
        context: nextContext,
        opponent: nextOpponent,
        objective: nextObjective,
        respectTraining: nextRespectTraining,
        allowedFormations: nextAllowed,
      });
      setVariants(result);
      setActiveVariantIdx(0);
    },
    [players, club, context, opponent, objective, respectTraining, allowedFormations]
  );

  const handleUpdateClub = (patch: Partial<ClubSettings>) => {
    const nextClub = { ...club, ...patch };
    setClub(nextClub);
  };

  const handleUpdateContext = (patch: Partial<MatchContext>) => {
    const nextCtx = { ...context, ...patch };
    setContext(nextCtx);
  };

  const handleSavePlayer = (updated: Player) => {
    setPlayers((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      const next = exists
        ? prev.map((p) => (p.id === updated.id ? updated : p))
        : [updated, ...prev];
      return next;
    });
  };

  const handleDeletePlayer = (playerId: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setClub((prev) => ({
      ...prev,
      trainingLockedPlayerIds: prev.trainingLockedPlayerIds.filter(
        (id) => id !== playerId
      ),
    }));
  };

  const handleToggleTrainingLock = (playerId: number) => {
    setClub((prev) => {
      const exists = prev.trainingLockedPlayerIds.includes(playerId);
      const nextLocked = exists
        ? prev.trainingLockedPlayerIds.filter((id) => id !== playerId)
        : [...prev.trainingLockedPlayerIds, playerId];
      return { ...prev, trainingLockedPlayerIds: nextLocked };
    });
  };

  const handleImportPlayers = (
    imported: Player[],
    mode: 'replace' | 'merge',
    clubPatch?: Partial<ClubSettings>
  ) => {
    let nextPlayers: Player[];
    if (mode === 'replace') {
      nextPlayers = imported;
    } else {
      const map = new Map(players.map((p) => [p.id, p]));
      for (const imp of imported) {
        map.set(imp.id, imp);
      }
      nextPlayers = Array.from(map.values());
    }

    // Automaticky navrhneme nejlepší trénink a kondici pro nově nahraný kádr
    const draftClub: ClubSettings = { ...club, ...(clubPatch ?? {}) };
    const topRec = recommendTrainings(nextPlayers, draftClub)[0];
    const recStamina = recommendStaminaShare(nextPlayers);

    const nextClub: ClubSettings = {
      ...draftClub,
      trainingType: clubPatch?.trainingType ?? topRec?.trainingType ?? draftClub.trainingType,
      staminaShare: clubPatch?.staminaShare ?? recStamina,
      trainingLockedPlayerIds:
        topRec?.leagueSlots100.map((p) => p.id) ?? draftClub.trainingLockedPlayerIds,
    };

    setPlayers(nextPlayers);
    setClub(nextClub);
    runOptimizer(nextPlayers, nextClub);
  };

  const handleApplyTrainingAndOptimize = (
    type: TrainingType,
    leaguePlayerIds: number[]
  ) => {
    const nextClub: ClubSettings = {
      ...club,
      trainingType: type,
      trainingLockedPlayerIds: leaguePlayerIds,
    };
    setClub(nextClub);
    runOptimizer(players, nextClub, context, opponent, objective, true, allowedFormations);
    setRespectTraining(true);
    setActiveTab('lineup');
  };

  const handleToggleFormation = (f: FormationId) => {
    setAllowedFormations((prev) => {
      if (prev.includes(f)) {
        return prev.length > 1 ? prev.filter((x) => x !== f) : prev;
      }
      return [...prev, f];
    });
  };

  const handleExportJson = () => {
    return JSON.stringify(
      {
        players,
        club,
        context,
        opponent,
      },
      null,
      2
    );
  };

  const handleImportJson = (raw: string) => {
    const data = JSON.parse(raw) as Partial<PersistedState>;
    if (!Array.isArray(data.players)) {
      throw new Error('JSON neobsahuje pole players.');
    }
    const nextPlayers = data.players;
    const nextClub = data.club ? { ...DEFAULT_CLUB_SETTINGS, ...data.club } : club;
    const nextContext = data.context ? { ...DEFAULT_MATCH_CONTEXT, ...data.context } : context;
    const nextOpp = data.opponent ? { ...DEFAULT_OPPONENT, ...data.opponent } : opponent;

    setPlayers(nextPlayers);
    setClub(nextClub);
    setContext(nextContext);
    setOpponent(nextOpp);
    runOptimizer(nextPlayers, nextClub, nextContext, nextOpp);
  };

  const handleResetSampleSquad = () => {
    setPlayers(SAMPLE_SQUAD);
    setClub(DEFAULT_CLUB_SETTINGS);
    setContext(DEFAULT_MATCH_CONTEXT);
    setOpponent(DEFAULT_OPPONENT);
    runOptimizer(
      SAMPLE_SQUAD,
      DEFAULT_CLUB_SETTINGS,
      DEFAULT_MATCH_CONTEXT,
      DEFAULT_OPPONENT
    );
  };

  const handleApplyOpponentFromScout = (
    scoutedOpponent: OpponentProfile,
    isOurTeamHome: boolean
  ) => {
    setOpponent(scoutedOpponent);
    const nextContext: MatchContext = {
      ...context,
      venue: isOurTeamHome ? 'home' : 'away',
    };
    setContext(nextContext);
    runOptimizer(
      players,
      club,
      nextContext,
      scoutedOpponent,
      objective,
      respectTraining,
      allowedFormations
    );
    setActiveTab('lineup');
  };

  const activeLineup = variants[activeVariantIdx] ?? variants[0] ?? null;

  return (
    <div className="min-h-screen bg-[#0c1310] text-slate-100">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        club={club}
        playerCount={players.length}
        chppConnected={Boolean(chpp.accessToken)}
        onOpenImport={() => setImportOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            players={players}
            club={club}
            opponent={opponent}
            activeLineup={activeLineup}
            onNavigate={setActiveTab}
            onOpenImport={() => setImportOpen(true)}
            onQuickOptimize={() => {
              runOptimizer();
              setActiveTab('lineup');
            }}
          />
        )}

        {activeTab === 'squad' && (
          <SquadView
            players={players}
            club={club}
            onSavePlayer={handleSavePlayer}
            onDeletePlayer={handleDeletePlayer}
            onToggleTrainingLock={handleToggleTrainingLock}
            onOpenImport={() => setImportOpen(true)}
          />
        )}

        {activeTab === 'training' && (
          <TrainingView
            players={players}
            club={club}
            onUpdateClub={handleUpdateClub}
            onApplyTrainingAndOptimize={handleApplyTrainingAndOptimize}
            onToggleTrainingLock={handleToggleTrainingLock}
          />
        )}

        {activeTab === 'lineup' && (
          <LineupView
            players={players}
            club={club}
            context={context}
            opponent={opponent}
            variants={variants}
            activeVariantIdx={activeVariantIdx}
            objective={objective}
            respectTraining={respectTraining}
            allowedFormations={allowedFormations}
            onChangeObjective={setObjective}
            onChangeRespectTraining={setRespectTraining}
            onToggleFormation={handleToggleFormation}
            onUpdateContext={handleUpdateContext}
            onRunOptimizer={() => runOptimizer()}
            onSelectVariant={setActiveVariantIdx}
            onUpdateActiveLineup={(updated) =>
              setVariants((prev) =>
                prev.map((v, idx) => (idx === activeVariantIdx ? updated : v))
              )
            }
          />
        )}

        {activeTab === 'scout' && (
          <OpponentScoutView
            club={club}
            onApplyOpponentToLineup={handleApplyOpponentFromScout}
          />
        )}

        {activeTab === 'simulator' && (
          <MatchSimView
            players={players}
            club={club}
            context={context}
            opponent={opponent}
            activeLineup={activeLineup}
            onUpdateClub={handleUpdateClub}
            onUpdateContext={handleUpdateContext}
            onUpdateOpponent={setOpponent}
            onOptimizeAgainstOpponent={() => {
              runOptimizer();
              setActiveTab('lineup');
            }}
          />
        )}
      </main>

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        players={players}
        chpp={chpp}
        onUpdateChpp={setChpp}
        onImportPlayers={handleImportPlayers}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onResetSampleSquad={handleResetSampleSquad}
      />
    </div>
  );
}

export default App;
