import {
  FormationId,
  OpponentAnalysis,
  OpponentProfile,
  ScoutedMatch,
  SectorRatings,
  TeamTactic,
} from '../types/hattrick';

/**
 * Vzorový ligový soupeř z divize V.158 pro FC Gunners Jihlava.
 * Hraje převážně 3-5-2 s útokem středem (AIM), silný v záloze a ve středu útoku,
 * ale s výraznou slabinou na krajích obrany a poklesem formy při zápasech venku.
 */
export const SAMPLE_SCOUTED_MATCHES_SLAVOJ: ScoutedMatch[] = [
  {
    id: 729101,
    date: '08.11.2026',
    matchType: 'league',
    homeTeamId: 98124,
    homeTeamName: 'FC Slavoj Pelhřimov',
    awayTeamId: 44102,
    awayTeamName: 'TJ Sokol Štoky',
    homeScore: 3,
    awayScore: 1,
    isOpponentHome: true,
    formation: '3-5-2',
    tactic: 'aim',
    tacticLevel: 12,
    ratings: {
      midfield: 8.5,
      rightDef: 5.5,
      centerDef: 9.0,
      leftDef: 5.8,
      rightAtt: 5.2,
      centerAtt: 11.2,
      leftAtt: 5.0,
      indirectSetPiecesDef: 7.2,
      indirectSetPiecesAtt: 7.0,
    },
    hatStats: 182,
    starsTotal: 52.5,
    notes: 'AIM zafungoval skvěle — 3 góly středem, soupeřovy kraje neohrozily.',
  },
  {
    id: 729102,
    date: '01.11.2026',
    matchType: 'league',
    homeTeamId: 65119,
    homeTeamName: 'FK Chotěboř B',
    awayTeamId: 98124,
    awayTeamName: 'FC Slavoj Pelhřimov',
    homeScore: 2,
    awayScore: 2,
    isOpponentHome: false,
    formation: '3-5-2',
    tactic: 'aim',
    tacticLevel: 11,
    ratings: {
      midfield: 6.8,
      rightDef: 5.2,
      centerDef: 8.8,
      leftDef: 5.5,
      rightAtt: 5.0,
      centerAtt: 10.5,
      leftAtt: 4.8,
      indirectSetPiecesDef: 7.0,
      indirectSetPiecesAtt: 6.8,
    },
    hatStats: 165,
    starsTotal: 50.0,
    notes: 'Venku ztráta kontroly zálohy (48 % držení míče), inkasoval 2 góly z křídel.',
  },
  {
    id: 729103,
    date: '25.10.2026',
    matchType: 'league',
    homeTeamId: 98124,
    homeTeamName: 'FC Slavoj Pelhřimov',
    awayTeamId: 88201,
    awayTeamName: 'Dynamo Velké Meziříčí',
    homeScore: 4,
    awayScore: 0,
    isOpponentHome: true,
    formation: '2-5-3',
    tactic: 'aim',
    tacticLevel: 12,
    ratings: {
      midfield: 8.8,
      rightDef: 4.8,
      centerDef: 7.8,
      leftDef: 5.0,
      rightAtt: 6.0,
      centerAtt: 12.0,
      leftAtt: 5.8,
      indirectSetPiecesDef: 7.0,
      indirectSetPiecesAtt: 7.2,
    },
    hatStats: 193,
    starsTotal: 54.0,
    notes: 'Riskantní 2-5-3 doma: totální dominance v záloze a drtivý střed útoku (12.0).',
  },
  {
    id: 729104,
    date: '18.10.2026',
    matchType: 'league',
    homeTeamId: 77112,
    homeTeamName: 'FC Telč Union',
    awayTeamId: 98124,
    awayTeamName: 'FC Slavoj Pelhřimov',
    homeScore: 3,
    awayScore: 1,
    isOpponentHome: false,
    formation: '3-5-2',
    tactic: 'normal',
    tacticLevel: 1,
    ratings: {
      midfield: 6.5,
      rightDef: 5.0,
      centerDef: 8.5,
      leftDef: 5.2,
      rightAtt: 5.5,
      centerAtt: 9.8,
      leftAtt: 5.4,
      indirectSetPiecesDef: 6.8,
      indirectSetPiecesAtt: 6.5,
    },
    hatStats: 158,
    starsTotal: 48.5,
    notes: 'Prohra venku: soupeř zaútočil po obou křídlech a roztrhal krajní obránce Slavoje.',
  },
  {
    id: 729105,
    date: '11.10.2026',
    matchType: 'league',
    homeTeamId: 98124,
    homeTeamName: 'FC Slavoj Pelhřimov',
    awayTeamId: 90155,
    awayTeamName: 'Spartak Třešť',
    homeScore: 2,
    awayScore: 1,
    isOpponentHome: true,
    formation: '3-5-2',
    tactic: 'aim',
    tacticLevel: 12,
    ratings: {
      midfield: 8.2,
      rightDef: 5.8,
      centerDef: 9.2,
      leftDef: 5.6,
      rightAtt: 5.4,
      centerAtt: 10.8,
      leftAtt: 5.2,
      indirectSetPiecesDef: 7.2,
      indirectSetPiecesAtt: 7.0,
    },
    hatStats: 181,
    starsTotal: 51.5,
    notes: 'Těsná výhra: standardní situace rozhodla v 84. minutě.',
  },
];

export const SAMPLE_SCOUTED_MATCHES_BETON: ScoutedMatch[] = [
  {
    id: 729201,
    date: '08.11.2026',
    matchType: 'league',
    homeTeamId: 81290,
    homeTeamName: 'SK Humpolec Beton',
    awayTeamId: 33119,
    awayTeamName: 'TJ Sokol Bedřichov',
    homeScore: 2,
    awayScore: 0,
    isOpponentHome: true,
    formation: '5-3-2',
    tactic: 'ca',
    tacticLevel: 14,
    ratings: {
      midfield: 4.8,
      rightDef: 10.2,
      centerDef: 12.0,
      leftDef: 10.0,
      rightAtt: 4.5,
      centerAtt: 9.0,
      leftAtt: 4.2,
      indirectSetPiecesDef: 8.5,
      indirectSetPiecesAtt: 7.5,
    },
    hatStats: 184,
    starsTotal: 53.0,
    notes: 'Učebnicový brejk: 2 rychlé protiútoky z 3 celkových šancí.',
  },
  {
    id: 729202,
    date: '01.11.2026',
    matchType: 'league',
    homeTeamId: 55102,
    homeTeamName: 'FC Žďár nad Sázavou',
    awayTeamId: 81290,
    awayTeamName: 'SK Humpolec Beton',
    homeScore: 1,
    awayScore: 1,
    isOpponentHome: false,
    formation: '5-4-1',
    tactic: 'ca',
    tacticLevel: 13,
    ratings: {
      midfield: 4.2,
      rightDef: 9.8,
      centerDef: 11.5,
      leftDef: 9.5,
      rightAtt: 4.0,
      centerAtt: 7.8,
      leftAtt: 4.0,
      indirectSetPiecesDef: 8.2,
      indirectSetPiecesAtt: 7.0,
    },
    hatStats: 172,
    starsTotal: 50.0,
    notes: 'Neprostupný obranný val venku, držení míče pouze 34 %.',
  },
];

function avgField(list: ScoutedMatch[], key: keyof SectorRatings): number {
  if (list.length === 0) return 6.0;
  const sum = list.reduce((acc, m) => acc + (m.ratings[key] ?? 6.0), 0);
  return Math.round((sum / list.length) * 10) / 10;
}

function calculateAverageSectorRatings(matches: ScoutedMatch[]): SectorRatings {
  return {
    midfield: avgField(matches, 'midfield'),
    rightDef: avgField(matches, 'rightDef'),
    centerDef: avgField(matches, 'centerDef'),
    leftDef: avgField(matches, 'leftDef'),
    rightAtt: avgField(matches, 'rightAtt'),
    centerAtt: avgField(matches, 'centerAtt'),
    leftAtt: avgField(matches, 'leftAtt'),
    indirectSetPiecesDef: avgField(matches, 'indirectSetPiecesDef'),
    indirectSetPiecesAtt: avgField(matches, 'indirectSetPiecesAtt'),
  };
}

/**
 * Komplexní statistická analýza odehraných zápasů soupeře.
 */
export function analyzeOpponentMatches(
  matches: ScoutedMatch[],
  teamName: string,
  teamId = 98124,
  leagueName = 'V.158 (Česko)'
): OpponentAnalysis {
  if (!matches || matches.length === 0) {
    matches = SAMPLE_SCOUTED_MATCHES_SLAVOJ;
  }

  const homeMatches = matches.filter((m) => m.isOpponentHome);
  const awayMatches = matches.filter((m) => !m.isOpponentHome);

  const avgRatingsOverall = calculateAverageSectorRatings(matches);
  const avgRatingsHome =
    homeMatches.length > 0 ? calculateAverageSectorRatings(homeMatches) : avgRatingsOverall;
  const avgRatingsAway =
    awayMatches.length > 0 ? calculateAverageSectorRatings(awayMatches) : avgRatingsOverall;

  const avgHatStatsOverall = Math.round(
    matches.reduce((acc, m) => acc + m.hatStats, 0) / matches.length
  );
  const avgHatStatsHome =
    homeMatches.length > 0
      ? Math.round(homeMatches.reduce((acc, m) => acc + m.hatStats, 0) / homeMatches.length)
      : avgHatStatsOverall;
  const avgHatStatsAway =
    awayMatches.length > 0
      ? Math.round(awayMatches.reduce((acc, m) => acc + m.hatStats, 0) / awayMatches.length)
      : avgHatStatsOverall;

  // Rozložení formací
  const formCounts: Record<string, number> = {};
  for (const m of matches) {
    formCounts[m.formation] = (formCounts[m.formation] ?? 0) + 1;
  }
  const formationDistribution = Object.entries(formCounts)
    .map(([formation, count]) => ({
      formation: formation as FormationId,
      count,
      pct: Math.round((count / matches.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Rozložení taktik
  const tacticCounts: Record<string, { count: number; totalLevel: number }> = {};
  for (const m of matches) {
    if (!tacticCounts[m.tactic]) tacticCounts[m.tactic] = { count: 0, totalLevel: 0 };
    tacticCounts[m.tactic].count++;
    tacticCounts[m.tactic].totalLevel += m.tacticLevel;
  }
  const tacticsDistribution = Object.entries(tacticCounts)
    .map(([tactic, data]) => ({
      tactic: tactic as TeamTactic,
      count: data.count,
      avgLevel: Math.round((data.totalLevel / data.count) * 10) / 10,
      pct: Math.round((data.count / matches.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominantTactic = tacticsDistribution[0]?.tactic ?? 'normal';
  const dominantTacticLevel = Math.round(tacticsDistribution[0]?.avgLevel ?? 8);
  const dominantFormation = formationDistribution[0]?.formation ?? '3-5-2';

  // Analýza slabin a silných stránek
  const weaknesses: string[] = [];
  const strengths: string[] = [];
  const tacticalAdvice: string[] = [];

  // 1. Kraje obrany vs Střed obrany
  const minFlankDef = Math.min(avgRatingsOverall.rightDef, avgRatingsOverall.leftDef);
  const flankDiff = avgRatingsOverall.centerDef - minFlankDef;
  if (flankDiff >= 2.5) {
    weaknesses.push(
      `Děravé kraje obrany: Střed obrany má ${avgRatingsOverall.centerDef}, ale křídla jen ${minFlankDef}.`
    );
    tacticalAdvice.push(
      `Zvol taktiku AOW (Útok po křídlech) a ofenzivní křídla — soupeřovy kraje obrany propouštějí velké šance.`
    );
  } else if (avgRatingsOverall.centerDef < minFlankDef - 1.0) {
    weaknesses.push(
      `Slabý střed obrany (${avgRatingsOverall.centerDef}) oproti krajům (${minFlankDef}).`
    );
    tacticalAdvice.push(
      `Zvol taktiku AIM (Útok středem) — soupeř má ve středu obrany mezeru.`
    );
  }

  // 2. Útok soupeře
  if (avgRatingsOverall.centerAtt >= 10.0) {
    strengths.push(
      `Extrémně nebezpečný střed útoku (${avgRatingsOverall.centerAtt}) — vyžaduje zesílené stopery.`
    );
    tacticalAdvice.push(
      `Zahuštěný střed obrany: nasaď 2–3 střední obránce (případně krajní obránce s pokynem „doprostřed“).`
    );
  }
  if (dominantTactic === 'aim') {
    strengths.push(
      `Vysoká orientace na střed (AIM úroveň ${dominantTacticLevel}) — 60–75 % jeho šancí půjde středem!`
    );
  } else if (dominantTactic === 'ca') {
    strengths.push(
      `Nebezpečné protiútoky (CA úroveň ${dominantTacticLevel}) — soupeř rád přenechává držení míče a trestá brejky.`
    );
    tacticalAdvice.push(
      `Proti CA je klíčové mít pevnou obranu i při vysokém držení míče, nebo sám nasadit pressing.`
    );
  }

  // 3. Pokles zálohy venku
  const midfieldHomeAwayDrop = avgRatingsHome.midfield - avgRatingsAway.midfield;
  if (midfieldHomeAwayDrop >= 1.2) {
    weaknesses.push(
      `Výrazný pokles zálohy venku: Doma mívá ${avgRatingsHome.midfield}, ale venku jen ${avgRatingsAway.midfield} (-${Math.round(midfieldHomeAwayDrop * 10) / 10}).`
    );
    tacticalAdvice.push(
      `Pokud hrajete doma, můžeš soupeře snadno přečíslit v záloze s držením míče $\\ge 58\\,\\%$.`
    );
  }

  // Fallbacky pokud je tým vyrovnaný
  if (weaknesses.length === 0) {
    weaknesses.push(
      `Vyrovnaný tým bez zjevné slabiny; nejnižší sektor je ${minFlankDef.toFixed(1)}.`
    );
  }
  if (strengths.length === 0) {
    strengths.push(`Tým hraje stabilně rozestavení ${dominantFormation} s průměrem ${avgHatStatsOverall} HatStats.`);
  }
  if (tacticalAdvice.length === 0) {
    tacticalAdvice.push(
      `Zvol rozestavení maximalizující zálohu a zaměř své nejsilnější útočníky proti jeho slabší straně.`
    );
  }

  return {
    teamId,
    teamName,
    leagueName,
    matches,
    formationDistribution,
    tacticsDistribution,
    avgRatingsHome,
    avgRatingsAway,
    avgRatingsOverall,
    avgHatStatsHome,
    avgHatStatsAway,
    avgHatStatsOverall,
    weaknesses,
    strengths,
    tacticalAdvice,
    predictedRatingsAgainstMe: avgRatingsAway, // výchozí pro zápas u nás doma
    predictedTactic: dominantTactic,
    predictedTacticLevel: dominantTacticLevel,
    predictedFormation: dominantFormation,
  };
}

/**
 * Převede analýzu soupeře do OpponentProfile pro matchSimulator a lineupOptimizer.
 */
export function convertAnalysisToOpponentProfile(
  analysis: OpponentAnalysis,
  isOurTeamHome: boolean
): OpponentProfile {
  // Pokud hrajeme my doma, soupeř hraje venku (použijeme avgRatingsAway)
  // Pokud hrajeme my venku, soupeř hraje doma (použijeme avgRatingsHome)
  const ratings = isOurTeamHome ? analysis.avgRatingsAway : analysis.avgRatingsHome;

  return {
    name: analysis.teamName,
    ratings: { ...ratings },
    tactic: analysis.predictedTactic,
    tacticLevel: analysis.predictedTacticLevel,
    setPiecesLevel: Math.round(ratings.indirectSetPiecesAtt),
  };
}
