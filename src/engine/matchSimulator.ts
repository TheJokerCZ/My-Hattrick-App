import {
  MatchSimulationResult,
  OpponentProfile,
  Player,
  SectorDuelResult,
  SectorRatings,
  TeamTactic,
} from '../types/hattrick';

/**
 * Kubický vzorec pravděpodobnosti proměnění šance v sektoru (Hattrick ME).
 * Při shodných hodnotách (Att === Def) vychází ~42.5 %.
 */
export function calculateSectorGoalProb(attack: number, defense: number): number {
  const att = Math.max(0.5, attack);
  const def = Math.max(0.5, defense);
  const num = 0.74 * Math.pow(att, 3);
  return num / (num + Math.pow(def, 3));
}

function getChanceDistribution(tactic: TeamTactic, tacticLevel: number) {
  let left = 0.25;
  let center = 0.35;
  let right = 0.25;
  const setPiece = 0.15;

  const shift = Math.min(0.18, Math.max(0, tacticLevel) * 0.011);
  if (tactic === 'aim') {
    center += shift;
    left -= shift / 2;
    right -= shift / 2;
  } else if (tactic === 'aow') {
    center -= shift;
    left += shift / 2;
    right += shift / 2;
  }

  return { left, center, right, setPiece };
}

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / fact;
}

export interface SimulateMatchParams {
  myRatings: SectorRatings;
  myTactic: TeamTactic;
  myTacticLevel: number;
  mySetPiecesAvg: number;
  myPlayers: Player[];
  opponent: OpponentProfile;
}

export function simulateMatch(params: SimulateMatchParams): MatchSimulationResult {
  const { myRatings, myTactic, myTacticLevel, mySetPiecesAvg, myPlayers, opponent } = params;
  const opp = opponent.ratings;

  // 1. Držení míče (nelineární poměr záloh)
  const midMyPow = Math.pow(Math.max(1, myRatings.midfield), 2.1);
  const midOppPow = Math.pow(Math.max(1, opp.midfield), 2.1);
  const possessionMy = midMyPow / (midMyPow + midOppPow);
  const possessionOpp = 1 - possessionMy;

  // 2. Počet běžných šancí (základ 10, presink šance ruší)
  let regularPool = 10.0;
  if (myTactic === 'pressing') {
    regularPool -= Math.min(2.6, (myTacticLevel / 20) * 2.5);
  }
  if (opponent.tactic === 'pressing') {
    regularPool -= Math.min(2.6, (opponent.tacticLevel / 20) * 2.5);
  }
  regularPool = Math.max(4.5, regularPool);

  const expectedRegularChancesMy = regularPool * possessionMy;
  const expectedRegularChancesOpp = regularPool * possessionOpp;

  // 3. Pravděpodobnosti proměnění šancí v jednotlivých sektorech
  // Poznámka: Levý útok hraje proti pravé obraně soupeře!
  const myLeftProb = calculateSectorGoalProb(myRatings.leftAtt, opp.rightDef);
  const myCenterProb = calculateSectorGoalProb(myRatings.centerAtt, opp.centerDef);
  const myRightProb = calculateSectorGoalProb(myRatings.rightAtt, opp.leftDef);
  const mySpProb = calculateSectorGoalProb(mySetPiecesAvg, opp.indirectSetPiecesDef);

  const oppLeftProb = calculateSectorGoalProb(opp.leftAtt, myRatings.rightDef);
  const oppCenterProb = calculateSectorGoalProb(opp.centerAtt, myRatings.centerDef);
  const oppRightProb = calculateSectorGoalProb(opp.rightAtt, myRatings.leftDef);
  const oppSpProb = calculateSectorGoalProb(
    opponent.setPiecesLevel,
    myRatings.indirectSetPiecesDef
  );

  const distMy = getChanceDistribution(myTactic, myTacticLevel);
  const distOpp = getChanceDistribution(opponent.tactic, opponent.tacticLevel);

  const myConversionPerRegularChance =
    distMy.left * myLeftProb +
    distMy.center * myCenterProb +
    distMy.right * myRightProb +
    distMy.setPiece * mySpProb;

  const oppConversionPerRegularChance =
    distOpp.left * oppLeftProb +
    distOpp.center * oppCenterProb +
    distOpp.right * oppRightProb +
    distOpp.setPiece * oppSpProb;

  let xGMy = expectedRegularChancesMy * myConversionPerRegularChance;
  let xGOpp = expectedRegularChancesOpp * oppConversionPerRegularChance;

  // 4. Protiútoky (CA)
  let expectedCounterChancesMy = 0;
  let expectedCounterChancesOpp = 0;

  if (myTactic === 'ca' && possessionMy < 0.5) {
    const missedOppChances = expectedRegularChancesOpp * (1 - oppConversionPerRegularChance);
    const caConversion = Math.min(0.45, (myTacticLevel / 20) * 0.42);
    expectedCounterChancesMy = missedOppChances * caConversion;
    const avgMySectorProb = (myLeftProb + myCenterProb + myRightProb) / 3;
    xGMy += expectedCounterChancesMy * avgMySectorProb;
  }

  if (opponent.tactic === 'ca' && possessionOpp < 0.5) {
    const missedMyChances = expectedRegularChancesMy * (1 - myConversionPerRegularChance);
    const caConversion = Math.min(0.45, (opponent.tacticLevel / 20) * 0.42);
    expectedCounterChancesOpp = missedMyChances * caConversion;
    const avgOppSectorProb = (oppLeftProb + oppCenterProb + oppRightProb) / 3;
    xGOpp += expectedCounterChancesOpp * avgOppSectorProb;
  }

  // 5. Speciální události (SE)
  const specCount = myPlayers.filter((p) => p.specialty !== 'None').length;
  const headCount = myPlayers.filter((p) => p.specialty === 'Head').length;
  const quickCount = myPlayers.filter((p) => p.specialty === 'Quick').length;

  const creativeBoostMy = myTactic === 'creative' ? 1.45 : 1.0;
  const creativeBoostOpp = opponent.tactic === 'creative' ? 1.45 : 1.0;

  const expectedSpecialEventsMy =
    (0.35 + specCount * 0.08 + headCount * 0.04 + quickCount * 0.04) * creativeBoostMy;
  const expectedSpecialEventsOpp = 0.65 * creativeBoostOpp;

  xGMy += expectedSpecialEventsMy * 0.36;
  xGOpp += expectedSpecialEventsOpp * 0.36;

  // Střelba z dálky upraví profil gólů mírně směrem k zakončování + SP
  if (myTactic === 'long_shots') {
    const lsBonus = (myTacticLevel / 20) * 0.35;
    xGMy = xGMy * 0.85 + lsBonus;
  }

  // 6. Poissonova matice skóre 0..10 pro Výhra / Remíza / Prohra
  let winRaw = 0;
  let drawRaw = 0;
  let lossRaw = 0;
  let bestScoreProb = -1;
  let likelyScore = '1:1';

  const maxG = 10;
  for (let i = 0; i <= maxG; i++) {
    const pi = poissonPmf(i, xGMy);
    for (let j = 0; j <= maxG; j++) {
      const pj = poissonPmf(j, xGOpp);
      const p = pi * pj;
      if (i > j) winRaw += p;
      else if (i === j) drawRaw += p;
      else lossRaw += p;

      if (p > bestScoreProb) {
        bestScoreProb = p;
        likelyScore = `${i}:${j}`;
      }
    }
  }

  const total = winRaw + drawRaw + lossRaw || 1;
  const winProb = Math.round((winRaw / total) * 1000) / 10;
  const drawProb = Math.round((drawRaw / total) * 1000) / 10;
  const lossProb = Math.max(0, Math.round((100 - winProb - drawProb) * 10) / 10);
  const expectedPoints = Math.round((3 * (winProb / 100) + 1 * (drawProb / 100)) * 100) / 100;

  const sectorDuels: SectorDuelResult[] = [
    {
      sectorName: 'Levé křídlo (My) vs Pravá obrana (Soupeř)',
      myAttack: myRatings.leftAtt,
      oppDefense: opp.rightDef,
      myGoalProb: Math.round(myLeftProb * 1000) / 10,
      oppAttack: opp.rightAtt,
      myDefense: myRatings.leftDef,
      oppGoalProb: Math.round(oppRightProb * 1000) / 10,
    },
    {
      sectorName: 'Střed útoku vs Střed obrany',
      myAttack: myRatings.centerAtt,
      oppDefense: opp.centerDef,
      myGoalProb: Math.round(myCenterProb * 1000) / 10,
      oppAttack: opp.centerAtt,
      myDefense: myRatings.centerDef,
      oppGoalProb: Math.round(oppCenterProb * 1000) / 10,
    },
    {
      sectorName: 'Pravé křídlo (My) vs Levá obrana (Soupeř)',
      myAttack: myRatings.rightAtt,
      oppDefense: opp.leftDef,
      myGoalProb: Math.round(myRightProb * 1000) / 10,
      oppAttack: opp.leftAtt,
      myDefense: myRatings.rightDef,
      oppGoalProb: Math.round(oppLeftProb * 1000) / 10,
    },
  ];

  return {
    possessionMy: Math.round(possessionMy * 1000) / 10,
    possessionOpp: Math.round(possessionOpp * 1000) / 10,
    expectedRegularChancesMy: Math.round(expectedRegularChancesMy * 100) / 100,
    expectedRegularChancesOpp: Math.round(expectedRegularChancesOpp * 100) / 100,
    expectedCounterChancesMy: Math.round(expectedCounterChancesMy * 100) / 100,
    expectedCounterChancesOpp: Math.round(expectedCounterChancesOpp * 100) / 100,
    expectedSpecialEventsMy: Math.round(expectedSpecialEventsMy * 100) / 100,
    expectedSpecialEventsOpp: Math.round(expectedSpecialEventsOpp * 100) / 100,
    xGMy: Math.round(xGMy * 100) / 100,
    xGOpp: Math.round(xGOpp * 100) / 100,
    winProb,
    drawProb,
    lossProb,
    expectedPoints,
    sectorDuels,
    likelyScore,
  };
}
