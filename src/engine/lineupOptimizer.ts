import { FORMATIONS, SLOT_META, TRAINING_META } from '../constants/skillsAndTerms';
import {
  BenchPlan,
  ClubSettings,
  FormationId,
  LineupAssignment,
  MatchContext,
  OpponentProfile,
  OptimizerObjective,
  Player,
  PlayerOrder,
  RecommendedLineup,
  SlotId,
  SubstitutionPlan,
  TeamTactic,
} from '../types/hattrick';
import { simulateMatch } from './matchSimulator';
import {
  calculateTeamRatings,
  estimatePlayerStarRating,
  getSlotContribution,
} from './ratingsEngine';

export interface OptimizeLineupOptions {
  players: Player[];
  club: ClubSettings;
  context: MatchContext;
  opponent: OpponentProfile;
  objective: OptimizerObjective;
  respectTraining: boolean;
  allowedFormations?: FormationId[];
}

function getSlotHeuristicScore(
  player: Player,
  slotId: SlotId,
  order: PlayerOrder,
  context: MatchContext,
  objective: OptimizerObjective
): number {
  const c = getSlotContribution(player, slotId, order, context.weather);
  if (objective === 'midfield') {
    return c.midfield * 2.4 + (c.centerDef + c.leftDef + c.rightDef) * 0.5 + (c.centerAtt + c.leftAtt + c.rightAtt) * 0.5;
  }
  if (objective === 'counter_attack') {
    return (
      (c.centerDef * 1.4 + c.leftDef * 1.2 + c.rightDef * 1.2) +
      (c.centerAtt * 1.1 + c.leftAtt * 1.0 + c.rightAtt * 1.0) +
      c.midfield * 0.3
    );
  }
  // Balanced / win_probability / hatstats
  return (
    c.midfield * 1.55 +
    c.centerDef * 1.0 +
    (c.leftDef + c.rightDef) * 0.85 +
    c.centerAtt * 1.0 +
    (c.leftAtt + c.rightAtt) * 0.85
  );
}

function evaluateCandidateScore(
  assignments: LineupAssignment[],
  playersById: Map<number, Player>,
  club: ClubSettings,
  context: MatchContext,
  opponent: OpponentProfile,
  tactic: TeamTactic,
  formation: FormationId,
  objective: OptimizerObjective,
  respectTraining: boolean,
  trainedSlotSet: Set<SlotId>,
  maxTrainingSlotsInTrainingType: number
): {
  score: number;
  hatStats: number;
  loddarStats: number;
  tacticLevel: number;
  ratings: ReturnType<typeof calculateTeamRatings>['ratings'];
  simulation: ReturnType<typeof simulateMatch>;
  trainingSlotsUsed: number;
  trainingEfficiencyPct: number;
} {
  const expLevel = club.formationExperience[formation] ?? 8;
  const { ratings, hatStats, loddarStats, tacticLevel } = calculateTeamRatings(
    assignments,
    playersById,
    club,
    context,
    tactic,
    expLevel
  );

  const lineupPlayers = assignments
    .map((a) => playersById.get(a.playerId))
    .filter((p): p is Player => Boolean(p));

  const avgSp =
    lineupPlayers.length > 0
      ? lineupPlayers.reduce((sum, p) => sum + p.skills.setPieces, 0) / lineupPlayers.length
      : 5;

  const simulation = simulateMatch({
    myRatings: ratings,
    myTactic: tactic,
    myTacticLevel: tacticLevel,
    mySetPiecesAvg: avgSp,
    myPlayers: lineupPlayers,
    opponent,
  });

  // Počet trénovaných hráčů obsazených v trénovaných slotech
  const lockedSet = new Set(club.trainingLockedPlayerIds);
  let lockedInTrainedSlots = 0;
  let totalTrainedSlotsPresent = 0;

  for (const a of assignments) {
    if (trainedSlotSet.has(a.slotId)) {
      totalTrainedSlotsPresent++;
      if (lockedSet.has(a.playerId)) {
        lockedInTrainedSlots++;
      }
    }
  }

  const targetSlots = Math.max(1, maxTrainingSlotsInTrainingType);
  const trainingEfficiencyPct = Math.round(
    (Math.min(targetSlots, totalTrainedSlotsPresent) / targetSlots) * 100
  );

  let baseScore = 0;
  if (objective === 'win_probability') {
    // Primárně očekávané body (xPts), při rovnosti rozhoduje gólový rozdíl a HatStats
    baseScore =
      simulation.expectedPoints * 100 +
      (simulation.xGMy - simulation.xGOpp) * 8 +
      hatStats * 0.02;
  } else if (objective === 'hatstats') {
    baseScore = hatStats + simulation.expectedPoints * 5;
  } else if (objective === 'midfield') {
    baseScore = ratings.midfield * 25 + simulation.possessionMy * 1.2 + hatStats * 0.05;
  } else if (objective === 'counter_attack') {
    const defSum = ratings.leftDef + ratings.centerDef + ratings.rightDef;
    baseScore = simulation.expectedPoints * 90 + defSum * 5 + tacticLevel * 2;
  }

  // Pokud uživatel vyžaduje respektování tréninku, přidáme výraznou bonifikaci za zaplněné tréninkové sloty
  let trainingBonus = 0;
  if (respectTraining) {
    trainingBonus = totalTrainedSlotsPresent * 45 + lockedInTrainedSlots * 80;
  }

  return {
    score: baseScore + trainingBonus,
    hatStats,
    loddarStats,
    tacticLevel,
    ratings,
    simulation,
    trainingSlotsUsed: totalTrainedSlotsPresent,
    trainingEfficiencyPct,
  };
}

function buildCaptainAndSp(
  assignments: LineupAssignment[],
  playersById: Map<number, Player>
): { captainId: number | null; setPiecesTakerId: number | null } {
  let captainId: number | null = null;
  let bestCaptainScore = -1;

  let setPiecesTakerId: number | null = null;
  let bestSpScore = -1;

  for (const a of assignments) {
    const p = playersById.get(a.playerId);
    if (!p) continue;

    const capScore = p.experience * 0.6 + p.leadership * 0.4 + p.form * 0.05;
    if (capScore > bestCaptainScore) {
      bestCaptainScore = capScore;
      captainId = p.id;
    }

    const spScore = p.skills.setPieces + p.skills.scoring * 0.25 + p.experience * 0.15;
    if (spScore > bestSpScore) {
      bestSpScore = spScore;
      setPiecesTakerId = p.id;
    }
  }

  return { captainId, setPiecesTakerId };
}

function buildBenchAndSubstitutions(
  assignments: LineupAssignment[],
  availablePlayers: Player[],
  playersById: Map<number, Player>,
  context: MatchContext
): { bench: BenchPlan; substitutions: SubstitutionPlan[] } {
  const starterIds = new Set(assignments.map((a) => a.playerId));
  const benchCandidates = availablePlayers.filter((p) => !starterIds.has(p.id));

  const pickBestForSlot = (slot: SlotId, excludeIds: Set<number>): Player | null => {
    let best: Player | null = null;
    let bestVal = -1;
    for (const p of benchCandidates) {
      if (excludeIds.has(p.id)) continue;
      const val = getSlotHeuristicScore(p, slot, 'normal', context, 'hatstats');
      if (val > bestVal) {
        bestVal = val;
        best = p;
      }
    }
    return best;
  };

  const pickedBenchIds = new Set<number>();
  const gk = pickBestForSlot('GK', pickedBenchIds);
  if (gk) pickedBenchIds.add(gk.id);
  const def = pickBestForSlot('CD', pickedBenchIds);
  if (def) pickedBenchIds.add(def.id);
  const im = pickBestForSlot('CIM', pickedBenchIds);
  if (im) pickedBenchIds.add(im.id);
  const wi = pickBestForSlot('RW', pickedBenchIds);
  if (wi) pickedBenchIds.add(wi.id);
  const fw = pickBestForSlot('CFW', pickedBenchIds);
  if (fw) pickedBenchIds.add(fw.id);

  const bench: BenchPlan = {
    gkId: gk?.id ?? null,
    defId: def?.id ?? null,
    imId: im?.id ?? null,
    wiId: wi?.id ?? null,
    fwId: fw?.id ?? null,
  };

  // Najdeme až 3 nejvhodnější střídání pro hráče v poli s nejnižší kondicí (62.–72. minuta)
  const outfieldStarters = assignments
    .filter((a) => a.slotId !== 'GK')
    .map((a) => ({
      assignment: a,
      player: playersById.get(a.playerId)!,
    }))
    .filter((item) => Boolean(item.player))
    .sort((a, b) => a.player.stamina - b.player.stamina);

  const substitutions: SubstitutionPlan[] = [];
  const usedSubIn = new Set<number>();

  const benchByGroup: Record<string, Player | null> = {
    CD: def,
    WB: def,
    IM: im,
    WI: wi,
    FW: fw,
  };

  for (const item of outfieldStarters) {
    if (substitutions.length >= 3) break;
    if (item.player.stamina >= 8) continue; // vysoká kondice nepotřebuje střídat nutně

    const grp = SLOT_META[item.assignment.slotId].group;
    const candidateIn = benchByGroup[grp];
    if (!candidateIn || usedSubIn.has(candidateIn.id)) continue;

    const starterVal = getSlotHeuristicScore(
      item.player,
      item.assignment.slotId,
      item.assignment.order,
      context,
      'hatstats'
    );
    const subVal = getSlotHeuristicScore(
      candidateIn,
      item.assignment.slotId,
      item.assignment.order,
      context,
      'hatstats'
    );

    if (subVal >= starterVal * 0.65) {
      usedSubIn.add(candidateIn.id);
      const minute = item.player.stamina <= 5 ? 60 : item.player.stamina === 6 ? 66 : 72;
      substitutions.push({
        minute,
        outPlayerId: item.player.id,
        outPlayerName: item.player.name,
        inPlayerId: candidateIn.id,
        inPlayerName: candidateIn.name,
        slotId: item.assignment.slotId,
        reason: `Kondice ${item.player.stamina}/9 — čerstvý náhradník zabrání poklesu ratingu v závěru.`,
      });
    }
  }

  return { bench, substitutions };
}

/**
 * Hlavní optimalizátor sestavy: otestuje povolené formace, rozestavení obránců,
 * přiřadí hráče (s ohledem na uzamčený trénink), optimalizuje individuální pokyny
 * a vybere nejlepší týmovou taktiku, kapitána, exekutora SP a střídání.
 */
export function optimizeLineup(options: OptimizeLineupOptions): RecommendedLineup[] {
  const {
    players,
    club,
    context,
    opponent,
    objective,
    respectTraining,
    allowedFormations,
  } = options;

  const availablePlayers = players.filter((p) => {
    if (p.injuredWeeks > 0) return false;
    if (p.cards >= 3) return false;
    if (!context.allowBruised && p.injuredWeeks === -1) return false;
    return true;
  });

  // Fallback pokud by byl extrémně úzký kádr
  const pool = availablePlayers.length >= 11 ? availablePlayers : players;
  const playersById = new Map(pool.map((p) => [p.id, p]));

  const trainingMeta = TRAINING_META[club.trainingType];
  const trainedSlotSet = new Set<SlotId>(trainingMeta.slotLabels100);
  const lockedAvailableIds = new Set(
    club.trainingLockedPlayerIds.filter((id) => playersById.has(id))
  );

  const formationKeys =
    allowedFormations && allowedFormations.length > 0
      ? allowedFormations
      : (Object.keys(FORMATIONS) as FormationId[]);

  const candidateResults: RecommendedLineup[] = [];

  for (const formationId of formationKeys) {
    const formDef = FORMATIONS[formationId];
    const layouts = formDef.altLayouts ?? [formDef.slots];

    let bestForFormation: RecommendedLineup | null = null;

    for (const layout of layouts) {
      if (pool.length < layout.length) continue;

      // 1. Počáteční hladové přiřazení: nejprve tréninkově uzamčení hráči do trénovaných slotů
      const usedPlayerIds = new Set<number>();
      const assignments: LineupAssignment[] = [];
      const unassignedSlots: SlotId[] = [];

      if (respectTraining && lockedAvailableIds.size > 0) {
        const trainedSlotsInLayout = layout.filter((s) => trainedSlotSet.has(s));
        const lockedPool = pool.filter((p) => lockedAvailableIds.has(p.id));

        for (const slot of trainedSlotsInLayout) {
          let bestLocked: Player | null = null;
          let bestScore = -1;
          for (const p of lockedPool) {
            if (usedPlayerIds.has(p.id)) continue;
            const sc = getSlotHeuristicScore(p, slot, 'normal', context, objective);
            if (sc > bestScore) {
              bestScore = sc;
              bestLocked = p;
            }
          }
          if (bestLocked) {
            usedPlayerIds.add(bestLocked.id);
            assignments.push({
              slotId: slot,
              playerId: bestLocked.id,
              order: 'normal',
            });
          } else {
            unassignedSlots.push(slot);
          }
        }
      }

      // Zbylé sloty seřadíme (GK první, aby brankář nezůstal na konec)
      const remainingSlots = layout.filter(
        (s) => !assignments.some((a) => a.slotId === s)
      );
      remainingSlots.sort((a, b) => (a === 'GK' ? -1 : b === 'GK' ? 1 : 0));

      for (const slot of remainingSlots) {
        let bestPlayer: Player | null = null;
        let bestOrder: PlayerOrder = 'normal';
        let bestScore = -1;

        for (const p of pool) {
          if (usedPlayerIds.has(p.id)) continue;
          for (const order of SLOT_META[slot].allowedOrders) {
            const sc = getSlotHeuristicScore(p, slot, order, context, objective);
            if (sc > bestScore) {
              bestScore = sc;
              bestPlayer = p;
              bestOrder = order;
            }
          }
        }

        if (bestPlayer) {
          usedPlayerIds.add(bestPlayer.id);
          assignments.push({
            slotId: slot,
            playerId: bestPlayer.id,
            order: bestOrder,
          });
        }
      }

      // Seřadíme assignments podle pořadí v layoutu
      assignments.sort((a, b) => layout.indexOf(a.slotId) - layout.indexOf(b.slotId));

      const defaultTactic: TeamTactic =
        objective === 'counter_attack' ? 'ca' : 'normal';

      // 2. Lokální optimalizace: 2 průchody přes pokyny a prohozy hráčů přímo proti Match Simulátoru
      let currentEval = evaluateCandidateScore(
        assignments,
        playersById,
        club,
        context,
        opponent,
        defaultTactic,
        formationId,
        objective,
        respectTraining,
        trainedSlotSet,
        trainingMeta.slots100PerMatch
      );

      for (let pass = 0; pass < 2; pass++) {
        let improved = false;

        // Optimalizace individuálních pokynů pro každý slot
        for (let i = 0; i < assignments.length; i++) {
          const slot = assignments[i].slotId;
          const origOrder = assignments[i].order;
          let bestOrder = origOrder;

          for (const order of SLOT_META[slot].allowedOrders) {
            if (order === origOrder) continue;
            assignments[i].order = order;
            const testEval = evaluateCandidateScore(
              assignments,
              playersById,
              club,
              context,
              opponent,
              defaultTactic,
              formationId,
              objective,
              respectTraining,
              trainedSlotSet,
              trainingMeta.slots100PerMatch
            );
            if (testEval.score > currentEval.score + 0.05) {
              currentEval = testEval;
              bestOrder = order;
              improved = true;
            }
          }
          assignments[i].order = bestOrder;
        }

        // Prohození dvojic hráčů na hřišti (pokud neporušuje tréninkový zámek)
        for (let i = 0; i < assignments.length; i++) {
          for (let j = i + 1; j < assignments.length; j++) {
            const pA = assignments[i].playerId;
            const pB = assignments[j].playerId;
            const slotA = assignments[i].slotId;
            const slotB = assignments[j].slotId;

            if (respectTraining) {
              if (lockedAvailableIds.has(pA) && trainedSlotSet.has(slotA) && !trainedSlotSet.has(slotB)) {
                continue;
              }
              if (lockedAvailableIds.has(pB) && trainedSlotSet.has(slotB) && !trainedSlotSet.has(slotA)) {
                continue;
              }
            }

            assignments[i].playerId = pB;
            assignments[j].playerId = pA;
            const origOrderA = assignments[i].order;
            const origOrderB = assignments[j].order;

            const testEval = evaluateCandidateScore(
              assignments,
              playersById,
              club,
              context,
              opponent,
              defaultTactic,
              formationId,
              objective,
              respectTraining,
              trainedSlotSet,
              trainingMeta.slots100PerMatch
            );

            if (testEval.score > currentEval.score + 0.05) {
              currentEval = testEval;
              improved = true;
            } else {
              assignments[i].playerId = pA;
              assignments[j].playerId = pB;
              assignments[i].order = origOrderA;
              assignments[j].order = origOrderB;
            }
          }
        }

        // Vyzkoušíme náhradu z lavičky pro zlepšení skóre (respektuje zámek)
        const onPitch = new Set(assignments.map((a) => a.playerId));
        const unused = pool.filter((p) => !onPitch.has(p.id));
        for (let i = 0; i < assignments.length; i++) {
          const origId = assignments[i].playerId;
          const slot = assignments[i].slotId;
          if (respectTraining && lockedAvailableIds.has(origId) && trainedSlotSet.has(slot)) {
            continue;
          }
          for (const sub of unused) {
            assignments[i].playerId = sub.id;
            const testEval = evaluateCandidateScore(
              assignments,
              playersById,
              club,
              context,
              opponent,
              defaultTactic,
              formationId,
              objective,
              respectTraining,
              trainedSlotSet,
              trainingMeta.slots100PerMatch
            );
            if (testEval.score > currentEval.score + 0.05) {
              currentEval = testEval;
              improved = true;
              break;
            } else {
              assignments[i].playerId = origId;
            }
          }
        }

        if (!improved) break;
      }

      // 3. Výběr nejlepší týmové taktiky pro finální 11ku
      const tacticsToTest: TeamTactic[] =
        objective === 'counter_attack'
          ? ['ca', 'normal', 'pressing']
          : ['normal', 'aim', 'aow', 'ca', 'pressing', 'creative'];

      let bestTactic: TeamTactic = defaultTactic;
      let bestTacticEval = currentEval;

      for (const tac of tacticsToTest) {
        const evalTac = evaluateCandidateScore(
          assignments,
          playersById,
          club,
          context,
          opponent,
          tac,
          formationId,
          objective,
          respectTraining,
          trainedSlotSet,
          trainingMeta.slots100PerMatch
        );
        if (evalTac.score > bestTacticEval.score + 0.01) {
          bestTacticEval = evalTac;
          bestTactic = tac;
        }
      }

      // Spočítáme odhad hvězdiček pro každého hráče
      const enrichedAssignments: LineupAssignment[] = assignments.map((a) => {
        const p = playersById.get(a.playerId);
        return {
          ...a,
          starRating: p ? estimatePlayerStarRating(p, a.slotId, a.order, context.weather) : 3,
        };
      });

      const { captainId, setPiecesTakerId } = buildCaptainAndSp(
        enrichedAssignments,
        playersById
      );
      const { bench, substitutions } = buildBenchAndSubstitutions(
        enrichedAssignments,
        pool,
        playersById,
        context
      );

      const notes: string[] = [];
      const exp = club.formationExperience[formationId] ?? 8;
      if (exp < 8) {
        notes.push(
          `Pozor: Zkušenost s rozestavením ${formationId} je pouze ${exp}/10 – hrozí zmatení týmu.`
        );
      }
      if (respectTraining) {
        notes.push(
          `Trénink „${trainingMeta.label}“: obsazeno ${bestTacticEval.trainingSlotsUsed} trénovaných postů (${bestTacticEval.trainingEfficiencyPct} % ligové kapacity).`
        );
      }
      if (bestTactic === 'ca' && bestTacticEval.simulation.possessionMy < 48) {
        notes.push(
          `Soupeř má převahu v záloze (${bestTacticEval.simulation.possessionOpp} %) — protiútoky (CA) efektivně trestají ztráty soupeře.`
        );
      } else if (bestTactic === 'aim') {
        notes.push(
          `Útok středem (AIM) využívá převahu vašeho středového útoku nad soupeřovou obranou.`
        );
      } else if (bestTactic === 'aow') {
        notes.push(
          `Útok po křídlech (AOW) směřuje šance do krajů, kde má soupeř slabší obranu.`
        );
      }

      const lineupObj: RecommendedLineup = {
        formation: formationId,
        assignments: enrichedAssignments,
        tactic: bestTactic,
        tacticLevel: bestTacticEval.tacticLevel,
        captainId,
        setPiecesTakerId,
        bench,
        substitutions,
        ratings: bestTacticEval.ratings,
        hatStats: bestTacticEval.hatStats,
        loddarStats: bestTacticEval.loddarStats,
        simulation: bestTacticEval.simulation,
        trainingSlotsUsed: bestTacticEval.trainingSlotsUsed,
        trainingEfficiencyPct: bestTacticEval.trainingEfficiencyPct,
        objectiveScore: Math.round(bestTacticEval.score * 10) / 10,
        notes,
      };

      if (!bestForFormation || lineupObj.objectiveScore > bestForFormation.objectiveScore) {
        bestForFormation = lineupObj;
      }
    }

    if (bestForFormation) {
      candidateResults.push(bestForFormation);
    }
  }

  return candidateResults.sort((a, b) => b.objectiveScore - a.objectiveScore);
}
