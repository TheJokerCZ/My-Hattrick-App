import { TRAINING_META } from '../constants/skillsAndTerms';
import {
  ClubSettings,
  Player,
  ProspectEvaluation,
  TrainingRecommendation,
  TrainingType,
} from '../types/hattrick';

/**
 * Spočítá odhadovaný počet týdnů do dalšího zvýšení trénované dovednosti
 * podle věku, úrovně dovednosti, úrovně trenéra, asistentů a podílu kondice.
 */
export function calculateWeeksToSkillUp(
  player: Player,
  trainingType: TrainingType,
  club: ClubSettings
): number {
  const meta = TRAINING_META[trainingType];
  const baseWeeks = meta.baseWeeksAt17PassableCoach;
  const currentSkill = player.skills[meta.skillKey];
  const exactAge = player.ageYears + player.ageDays / 112;

  // Věkový koeficient (~9 % zpomalení za každý rok nad 17)
  const ageMultiplier = Math.pow(1.09, Math.max(0, exactAge - 17));

  // Vyšší úroveň dovednosti roste pomaleji
  const skillMultiplier = 1 + Math.max(0, currentSkill - 6) * 0.085;

  // Vliv úrovně trenéra (6 = přijatelný je základ 1.0, 7 = dobrý ~0.92, 8 = solidní ~0.85)
  const coachTable: Record<number, number> = {
    4: 1.25,
    5: 1.12,
    6: 1.0,
    7: 0.92,
    8: 0.85,
  };
  const coachMultiplier = coachTable[Math.round(club.coachLevel)] ?? 1.0;

  // Vliv asistentů trenéra (0–10)
  const assistantsMultiplier = 1 + Math.max(0, 10 - club.assistantsLevel) * 0.032;

  // Vliv intenzity a kondice (referenční základ = 100 % intenzita a 12 % kondice -> 0.88)
  const effectiveShare = Math.max(
    0.2,
    (club.trainingIntensity / 100) * (1 - club.staminaShare / 100)
  );
  const intensityMultiplier = 0.88 / effectiveShare;

  const weeks =
    baseWeeks *
    ageMultiplier *
    skillMultiplier *
    coachMultiplier *
    assistantsMultiplier *
    intensityMultiplier;

  return Math.round(weeks * 10) / 10;
}

/**
 * Vyhodnotí všechny hráče v kádru z hlediska perspektivy (věk, multiskill, specialita)
 * a určí pro každého nejlepší tréninkové zaměření a odhad týdnů do skill-upu.
 */
export function evaluateProspects(
  players: Player[],
  club: ClubSettings
): ProspectEvaluation[] {
  const results: ProspectEvaluation[] = [];

  for (const p of players) {
    const exactAge = p.ageYears + p.ageDays / 112;
    // Věkový faktor: 17 let = 1.0, 21 let = 0.48, 25+ let velmi nízký pro trénink
    const ageFactor = Math.max(
      0.08,
      Math.min(1.0, 1.05 - Math.max(0, exactAge - 17) * 0.14)
    );

    const s = p.skills;
    const isGK = s.keeper >= 5 && s.keeper >= Math.max(s.defending, s.playmaking, s.scoring, s.winger);

    let bestTrainingType: TrainingType = 'playmaking';
    let primarySkillName = 'Tvorba hry';
    let primarySkillValue = s.playmaking;
    let recommendedRole = 'Univerzál';
    let secondarySum = 0;

    if (isGK) {
      bestTrainingType = 'goalkeeping';
      primarySkillName = 'Brankář';
      primarySkillValue = s.keeper;
      recommendedRole = p.ageYears <= 21 ? 'Perspektivní brankář' : 'Jednička do brány';
      secondarySum = s.defending * 0.8 + s.setPieces * 0.5;
    } else {
      // Porovnáme potenciál pro jednotlivé tréninky v poli
      const pmFit = s.playmaking * 1.15 + s.passing * 0.45 + s.defending * 0.35 + s.winger * 0.2;
      const defFit = s.defending * 1.15 + s.playmaking * 0.35 + s.winger * 0.35 + s.passing * 0.25;
      const scoFit = s.scoring * 1.15 + s.passing * 0.45 + s.winger * 0.3 + s.playmaking * 0.25;
      const winFit = s.winger * 1.15 + s.playmaking * 0.4 + s.passing * 0.35 + s.defending * 0.25;

      const best = [
        { type: 'playmaking' as TrainingType, fit: pmFit, name: 'Tvorba hry', val: s.playmaking },
        { type: 'defending' as TrainingType, fit: defFit, name: 'Bránění', val: s.defending },
        { type: 'scoring' as TrainingType, fit: scoFit, name: 'Zakončování', val: s.scoring },
        { type: 'winger' as TrainingType, fit: winFit, name: 'Křídlo', val: s.winger },
      ].sort((a, b) => b.fit - a.fit)[0];

      bestTrainingType = best.type;
      primarySkillName = best.name;
      primarySkillValue = best.val;

      if (best.type === 'playmaking') {
        secondarySum = s.passing + s.defending * 0.8 + s.winger * 0.5;
        recommendedRole =
          p.ageYears <= 21
            ? 'Talentovaný střední záložník (IM)'
            : 'Hotový střední záložník';
      } else if (best.type === 'defending') {
        secondarySum = s.winger * 0.8 + s.playmaking * 0.7 + s.passing * 0.5;
        recommendedRole =
          s.winger >= 6
            ? 'Ofenzivní krajní obránce (WB)'
            : p.ageYears <= 21
              ? 'Talentovaný střední obránce (CD)'
              : 'Zkušený obránce';
      } else if (best.type === 'scoring') {
        secondarySum = s.passing + s.winger * 0.7 + s.playmaking * 0.6;
        recommendedRole =
          p.specialty === 'Technical' && s.playmaking >= 7
            ? 'Technický defenzivní útočník (TDF)'
            : p.ageYears <= 21
              ? 'Perspektivní střelec (FW)'
              : 'Kanonýr do základu';
      } else {
        secondarySum = s.playmaking * 0.9 + s.passing * 0.8 + s.defending * 0.4;
        recommendedRole =
          p.ageYears <= 21 ? 'Mladé dynamické křídlo (WI)' : 'Zkušené křídlo';
      }
    }

    const specBonus = !isGK && p.specialty !== 'None' ? 12 : 0;
    const motherBonus = p.motherClubBonus ? 4 : 0;

    // Skóre dovedností (ideálně mladík s 7–11 primární + slušné vedlejší dovednosti)
    const skillPotential = Math.min(55, primarySkillValue * 3.6 + secondarySum * 1.15);
    const rawScore = ageFactor * (32 + skillPotential) + specBonus + motherBonus;
    const prospectScore = Math.round(Math.max(1, Math.min(100, rawScore)));

    const weeksToNextSkillUp = calculateWeeksToSkillUp(p, bestTrainingType, club);

    const secondarySkillSummary = isGK
      ? `Obrana ${s.defending}, SP ${s.setPieces}`
      : `Přihr. ${s.passing} · Tvorba ${s.playmaking} · Obr. ${s.defending} · Křídlo ${s.winger} · Zak. ${s.scoring}`;

    let marketPotentialLabel = 'Do rotace / zkušenost';
    if (prospectScore >= 78) marketPotentialLabel = 'Elitní tréninkový klenot';
    else if (prospectScore >= 62) marketPotentialLabel = 'Vysoký potenciál růstu';
    else if (prospectScore >= 42) marketPotentialLabel = 'Solidní perspektiva';

    results.push({
      player: p,
      prospectScore,
      ageFactor,
      bestTrainingType,
      recommendedRole,
      primarySkillName,
      primarySkillValue,
      secondarySkillSummary,
      weeksToNextSkillUp,
      marketPotentialLabel,
    });
  }

  return results.sort((a, b) => b.prospectScore - a.prospectScore);
}

/**
 * Ohodnotí vhodnost konkrétního hráče jako tréninkového subjektu pro daný typ tréninku.
 */
function scorePlayerForTraining(player: Player, trainingType: TrainingType): number {
  const exactAge = player.ageYears + player.ageDays / 112;
  // Mladí hráči 17–21 let mají nejvyšší tréninkovou hodnotu
  const youthWeight =
    exactAge <= 20
      ? 1.0 - (exactAge - 17) * 0.08
      : exactAge <= 23
        ? 0.76 - (exactAge - 20) * 0.16
        : Math.max(0.05, 0.28 - (exactAge - 23) * 0.05);

  const s = player.skills;
  const specBonus = player.specialty !== 'None' ? 1.1 : 1.0;
  const healthyPenalty = player.injuredWeeks > 2 ? 0.5 : 1.0;

  let baseQuality = 0;
  switch (trainingType) {
    case 'playmaking':
      baseQuality = s.playmaking * 1.4 + s.passing * 0.55 + s.defending * 0.45 + s.winger * 0.25;
      break;
    case 'defending':
      baseQuality = s.defending * 1.4 + s.winger * 0.45 + s.playmaking * 0.4 + s.passing * 0.3;
      break;
    case 'scoring':
      baseQuality = s.scoring * 1.4 + s.passing * 0.55 + s.winger * 0.35 + s.playmaking * 0.3;
      break;
    case 'winger':
      baseQuality = s.winger * 1.4 + s.playmaking * 0.5 + s.passing * 0.45 + s.defending * 0.3;
      break;
    case 'short_passes':
      baseQuality =
        s.passing * 0.9 + Math.max(s.playmaking, s.scoring, s.winger) * 0.95;
      break;
    case 'through_passes':
      baseQuality =
        s.passing * 0.9 + Math.max(s.defending, s.playmaking, s.winger) * 0.9;
      break;
    case 'goalkeeping':
      baseQuality = s.keeper >= 5 ? s.keeper * 1.8 + s.defending * 0.4 : 0.5;
      break;
    case 'set_pieces':
      baseQuality = s.setPieces * 0.7 + Math.max(s.scoring, s.playmaking, s.defending) * 0.6;
      break;
  }

  return youthWeight * baseQuality * specBonus * healthyPenalty;
}

/**
 * Doporučí optimální podíl kondice (Stamina Share %) podle věkového průměru kádru.
 */
export function recommendStaminaShare(players: Player[]): number {
  const top14 = [...players]
    .sort((a, b) => b.tsi - a.tsi)
    .slice(0, 14);
  if (top14.length === 0) return 12;

  const avgAge = top14.reduce((sum, p) => sum + p.ageYears, 0) / top14.length;
  if (avgAge <= 20.5) return 10;
  if (avgAge <= 23.0) return 12;
  if (avgAge <= 26.0) return 15;
  return 18;
}

/**
 * Analyzuje celý kádr a seřadí všechny typy tréninku v Hattricku od nejvhodnějšího
 * včetně konkrétního rozdělení hráčů do ligových (100 %) a přátelských (100 % / 50 %) slotů.
 */
export function recommendTrainings(
  players: Player[],
  club: ClubSettings
): TrainingRecommendation[] {
  const trainingTypes: TrainingType[] = [
    'playmaking',
    'defending',
    'scoring',
    'winger',
    'short_passes',
    'through_passes',
    'goalkeeping',
    'set_pieces',
  ];

  const recStamina = recommendStaminaShare(players);
  const prospects = evaluateProspects(players, club);
  const prospectMap = new Map(prospects.map((pr) => [pr.player.id, pr]));

  const recs: TrainingRecommendation[] = trainingTypes.map((type) => {
    const meta = TRAINING_META[type];

    // Seřadíme hráče podle vhodnosti pro tento konkrétní trénink
    const scored = players
      .map((p) => ({
        player: p,
        fit: scorePlayerForTraining(p, type),
      }))
      .sort((a, b) => b.fit - a.fit);

    const n100 = meta.slots100PerMatch;
    const n50 = meta.slots50PerMatch;

    // Rozdělíme na ligu a přátelák tak, aby každý mladík hrál max 1x týdně (90 min)
    // Priorita pro Ligu: nejlepší součet tréninkové hodnoty + aktuální síly (TSI)
    const pool = scored.filter((item) => item.player.injuredWeeks <= 3);
    const total100Needed = Math.min(pool.length, n100 * 2);

    const topTrainees = pool.slice(0, total100Needed).map((s) => s.player);

    // Do ligy dáme ty ze skupiny topTrainees, kteří mají nejvyšší aktuální TSI/výkonnost
    const sortedForLeague = [...topTrainees].sort(
      (a, b) =>
        b.skills[meta.skillKey] * 2 + b.tsi / 4000 - (a.skills[meta.skillKey] * 2 + a.tsi / 4000)
    );

    const leagueSlots100 = sortedForLeague.slice(0, n100);
    const leagueIds = new Set(leagueSlots100.map((p) => p.id));

    const friendlySlots100 = topTrainees
      .filter((p) => !leagueIds.has(p.id))
      .slice(0, n100);
    const usedIds = new Set([...leagueSlots100, ...friendlySlots100].map((p) => p.id));

    const slots50 =
      n50 > 0
        ? pool
            .filter((s) => !usedIds.has(s.player.id))
            .slice(0, n50 * 2)
            .map((s) => s.player)
        : [];

    const mainTrainees = [...leagueSlots100, ...friendlySlots100];
    const youngTraineesCount = mainTrainees.filter((p) => p.ageYears <= 21).length;

    const avgProspectScore =
      mainTrainees.length > 0
        ? Math.round(
            mainTrainees.reduce(
              (acc, p) => acc + (prospectMap.get(p.id)?.prospectScore ?? 30),
              0
            ) / mainTrainees.length
          )
        : 0;

    // Celkové skóre vhodnosti tréninku pro aktuální tým (0-100)
    const capacityTarget = Math.min(10, n100 * 2);
    const youngCoverage =
      capacityTarget > 0 ? Math.min(1, youngTraineesCount / Math.max(2, capacityTarget * 0.65)) : 0;

    const avgTopFit =
      mainTrainees.length > 0
        ? scored
            .slice(0, mainTrainees.length)
            .reduce((sum, item) => sum + item.fit, 0) / mainTrainees.length
        : 0;

    // Penalizace příliš úzkých nebo okrajových tréninků (např. Standardky jako hlavní dlouhodobý trénink)
    const strategicMultiplier =
      type === 'set_pieces'
        ? 0.55
        : type === 'through_passes'
          ? 0.85
          : type === 'short_passes'
            ? 0.9
            : 1.0;

    const rawSuitability =
      (avgTopFit * 4.1 + avgProspectScore * 0.35 + youngCoverage * 22) * strategicMultiplier;

    const suitabilityScore = Math.round(Math.max(10, Math.min(99, rawSuitability)));

    const weeksPerSkillUpAvg =
      mainTrainees.length > 0
        ? Math.round(
            (mainTrainees.reduce((sum, p) => sum + calculateWeeksToSkillUp(p, type, club), 0) /
              mainTrainees.length) *
              10
          ) / 10
        : meta.baseWeeksAt17PassableCoach;

    let reasoning = '';
    if (type === 'playmaking') {
      reasoning =
        youngTraineesCount >= 4
          ? `V kádru máte ${youngTraineesCount} perspektivních hráčů do 21 let se silnými předpoklady pro zálohu. Ve formaci 3-5-2 nebo 2-5-3 využijete naplno všech 6 plných + 4 poloviční sloty.`
          : `Trénink zálohy nabízí vysokou flexibilitu v rozestavení (3-5-2, 2-5-3), ale vyžaduje alespoň 4–6 mladých záložníků.`;
    } else if (type === 'defending') {
      reasoning =
        youngTraineesCount >= 5
          ? `Máte ${youngTraineesCount} mladých hráčů vhodných do obrany. Bránění trénuje až 10 hráčů týdně na 100 % (např. v 5-3-2) a buduje pevnou základnu.`
          : `Obrana má nejvíce 100% slotů (až 10), ale vyžaduje mít v kádru dostatek mladých talentů s potenciálem do obrany (${youngTraineesCount} vhodných nalezeno).`;
    } else if (type === 'scoring') {
      reasoning =
        youngTraineesCount >= 3
          ? `Ideální pro vaše mladé útočníky (${youngTraineesCount} perspektivních kandidátů). Formace 2-5-3 nebo 3-4-3 maximalizuje ofenzivní sílu i růst ceny hráčů.`
          : `V kádru je méně mladých útočníků do 21 let (${youngTraineesCount}), útočné opory už jsou spíše v produktivním věku.`;
    } else if (type === 'winger') {
      reasoning = `Nejrychlejší polní trénink (cca ${weeksPerSkillUpAvg} týdnů na úroveň). Skvělé pro 4 čistokrevná křídla + 4 krajní obránce na 50 % sloty.`;
    } else if (type === 'goalkeeping') {
      const youngGks = mainTrainees.filter((p) => p.skills.keeper >= 6 && p.ageYears <= 21);
      reasoning =
        youngGks.length >= 1
          ? `Máte mladého brankáře (${youngGks.map((g) => g.name).join(', ')}). Rychlý růst (${weeksPerSkillUpAvg} týdne) bez jakéhokoliv omezení ligové formace.`
          : `Pro efektivní trénink brankářů potřebujete alespoň 2 mladé gólmany (17–20 let) se základem chytání 6+.`;
    } else if (type === 'short_passes') {
      reasoning = `Skvělý sekundární trénink pro zvednutí přihrávek až 16 záložníkům a útočníkům najednou. Výrazně zvyšuje hodnotu multiskillových hráčů i taktiky AIM/AOW.`;
    } else if (type === 'through_passes') {
      reasoning = `Doplňkový trénink přihrávek pro obránce, křídla a střední záložníky (vhodné pro týmy hrající na protiútoky CA).`;
    } else {
      reasoning = `Rychlý doplňkový trénink (cca ${weeksPerSkillUpAvg} týdnů), vhodný pouze krátkodobě před prodejem nebo na dotažení exekutora.`;
    }

    return {
      trainingType: type,
      suitabilityScore,
      recommendedFormations: meta.bestFormations,
      leagueSlots100,
      friendlySlots100,
      slots50,
      avgProspectScore,
      recommendedStaminaShare: recStamina,
      weeksPerSkillUpAvg,
      reasoning,
    };
  });

  return recs.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
