import { SLOT_META } from '../constants/skillsAndTerms';
import {
  ClubSettings,
  LineupAssignment,
  MatchContext,
  Player,
  PlayerOrder,
  PlayerSkills,
  RoleGroup,
  SectorRatings,
  SlotId,
  TeamTactic,
  WeatherType,
} from '../types/hattrick';

export interface EffectiveSkills extends PlayerSkills {
  experienceBonus: number;
  formFactor: number;
  staminaFactor: number;
  weatherFactor: number;
}

/**
 * Spočítá efektivní herní dovednosti hráče v zápase po započtení
 * věrnosti, mateřského klubu, zkušeností, formy, kondice, počasí a náplasti.
 */
export function getEffectiveSkills(
  player: Player,
  weather: WeatherType = 'partially_cloudy'
): EffectiveSkills {
  const loyaltyBonus = ((Math.max(1, Math.min(20, player.loyalty)) - 1) / 19) * 1.0;
  const motherBonus = player.motherClubBonus ? 0.5 : 0;
  const flatBonus = loyaltyBonus + motherBonus;

  // Vliv zkušeností (logaritmický růst)
  const experienceBonus = Math.log10(Math.max(1, player.experience)) * 1.33;

  // Vliv formy (1-8)
  const formFactor = Math.pow((Math.max(1, Math.min(8, player.form)) - 0.5) / 7, 0.45);

  // Průměrná efektivita kondice přes celý zápas (kondice 8+ ~ 1.0)
  const staminaFactor = Math.min(1.0, 0.60 + Math.max(1, Math.min(9, player.stamina)) * 0.05);

  // Vliv počasí na speciality
  let weatherFactor = 1.0;
  if (weather === 'sunny') {
    if (player.specialty === 'Technical') weatherFactor = 1.05;
    else if (player.specialty === 'Quick' || player.specialty === 'Powerful') weatherFactor = 0.95;
  } else if (weather === 'rainy') {
    if (player.specialty === 'Powerful') weatherFactor = 1.05;
    else if (player.specialty === 'Technical' || player.specialty === 'Quick') weatherFactor = 0.95;
  }

  // Lehké zranění (náplast) snižuje výkon o 5 %
  const injuryFactor = player.injuredWeeks === -1 ? 0.95 : player.injuredWeeks > 0 ? 0 : 1.0;

  const mult = formFactor * staminaFactor * weatherFactor * injuryFactor;
  const calc = (base: number) =>
    Math.max(0, (base + flatBonus + experienceBonus * 0.35) * mult);

  return {
    keeper: calc(player.skills.keeper),
    defending: calc(player.skills.defending),
    playmaking: calc(player.skills.playmaking),
    winger: calc(player.skills.winger),
    passing: calc(player.skills.passing),
    scoring: calc(player.skills.scoring),
    setPieces: calc(player.skills.setPieces),
    experienceBonus,
    formFactor,
    staminaFactor,
    weatherFactor,
  };
}

interface RawSectorContrib {
  midfield: number;
  rightDef: number;
  centerDef: number;
  leftDef: number;
  rightAtt: number;
  centerAtt: number;
  leftAtt: number;
}

/**
 * Vrátí surový příspěvek jednoho hráče na dané pozici s konkrétním pokynem
 * do všech 7 sektorů (před skupinovou penalizací za přeplnění středu).
 */
export function getSlotContribution(
  player: Player,
  slotId: SlotId,
  order: PlayerOrder,
  weather: WeatherType = 'partially_cloudy'
): RawSectorContrib {
  const s = getEffectiveSkills(player, weather);
  const meta = SLOT_META[slotId];
  const group: RoleGroup = meta.group;
  const side = meta.side;

  const res: RawSectorContrib = {
    midfield: 0,
    rightDef: 0,
    centerDef: 0,
    leftDef: 0,
    rightAtt: 0,
    centerAtt: 0,
    leftAtt: 0,
  };

  if (group === 'GK') {
    res.centerDef += 0.87 * s.keeper + 0.35 * s.defending;
    res.leftDef += 0.62 * s.keeper + 0.24 * s.defending;
    res.rightDef += 0.62 * s.keeper + 0.24 * s.defending;
    return res;
  }

  if (group === 'CD') {
    if (order === 'offensive') {
      res.centerDef += 0.73 * s.defending;
      res.midfield += 0.40 * s.playmaking;
      if (side === 'right') res.rightDef += 0.38 * s.defending;
      else if (side === 'left') res.leftDef += 0.38 * s.defending;
      else {
        res.leftDef += 0.26 * s.defending;
        res.rightDef += 0.26 * s.defending;
      }
    } else if (order === 'towards_wing' && side !== 'center') {
      res.centerDef += 0.67 * s.defending;
      res.midfield += 0.15 * s.playmaking;
      if (side === 'right') {
        res.rightDef += 0.81 * s.defending;
        res.rightAtt += 0.26 * s.winger;
      } else {
        res.leftDef += 0.81 * s.defending;
        res.leftAtt += 0.26 * s.winger;
      }
    } else {
      // normal
      res.centerDef += 1.0 * s.defending;
      res.midfield += 0.25 * s.playmaking;
      if (side === 'right') res.rightDef += 0.52 * s.defending;
      else if (side === 'left') res.leftDef += 0.52 * s.defending;
      else {
        res.leftDef += 0.28 * s.defending;
        res.rightDef += 0.28 * s.defending;
      }
    }
    return res;
  }

  if (group === 'WB') {
    const addSideDef = (val: number) => {
      if (side === 'right') res.rightDef += val;
      else res.leftDef += val;
    };
    const addSideAtt = (val: number) => {
      if (side === 'right') res.rightAtt += val;
      else res.leftAtt += val;
    };

    if (order === 'defensive') {
      addSideDef(1.0 * s.defending);
      res.centerDef += 0.43 * s.defending;
      res.midfield += 0.10 * s.playmaking;
      addSideAtt(0.45 * s.winger);
    } else if (order === 'offensive') {
      addSideDef(0.74 * s.defending);
      res.centerDef += 0.35 * s.defending;
      res.midfield += 0.20 * s.playmaking;
      addSideAtt(0.69 * s.winger);
    } else if (order === 'towards_middle') {
      addSideDef(0.75 * s.defending);
      res.centerDef += 0.70 * s.defending;
      res.midfield += 0.15 * s.playmaking;
      addSideAtt(0.35 * s.winger);
    } else {
      // normal
      addSideDef(0.92 * s.defending);
      res.centerDef += 0.43 * s.defending;
      res.midfield += 0.15 * s.playmaking;
      addSideAtt(0.59 * s.winger);
    }
    return res;
  }

  if (group === 'IM') {
    const addSideDef = (val: number) => {
      if (side === 'right') res.rightDef += val;
      else if (side === 'left') res.leftDef += val;
      else {
        res.rightDef += val * 0.55;
        res.leftDef += val * 0.55;
      }
    };
    const addSideAtt = (val: number) => {
      if (side === 'right') res.rightAtt += val;
      else if (side === 'left') res.leftAtt += val;
      else {
        res.rightAtt += val * 0.5;
        res.leftAtt += val * 0.5;
      }
    };

    if (order === 'offensive') {
      res.midfield += 0.95 * s.playmaking;
      res.centerDef += 0.16 * s.defending;
      addSideDef(0.09 * s.defending);
      res.centerAtt += 0.49 * s.passing + 0.31 * s.scoring;
      addSideAtt(0.36 * s.passing);
    } else if (order === 'defensive') {
      res.midfield += 0.95 * s.playmaking;
      res.centerDef += 0.58 * s.defending;
      addSideDef(0.27 * s.defending);
      res.centerAtt += 0.18 * s.passing + 0.13 * s.scoring;
      addSideAtt(0.14 * s.passing);
    } else if (order === 'towards_wing' && side !== 'center') {
      res.midfield += 0.80 * s.playmaking;
      res.centerDef += 0.33 * s.defending;
      addSideDef(0.30 * s.defending);
      res.centerAtt += 0.23 * s.passing;
      addSideAtt(0.59 * s.winger + 0.31 * s.passing);
    } else {
      // normal
      res.midfield += 1.0 * s.playmaking;
      res.centerDef += 0.40 * s.defending;
      addSideDef(0.19 * s.defending);
      res.centerAtt += 0.33 * s.passing + 0.22 * s.scoring;
      addSideAtt(0.26 * s.passing);
    }
    return res;
  }

  if (group === 'WI') {
    const addSideDef = (val: number) => {
      if (side === 'right') res.rightDef += val;
      else res.leftDef += val;
    };
    const addSideAtt = (val: number) => {
      if (side === 'right') res.rightAtt += val;
      else res.leftAtt += val;
    };

    if (order === 'offensive') {
      addSideAtt(1.0 * s.winger + 0.29 * s.passing);
      res.midfield += 0.30 * s.playmaking;
      addSideDef(0.22 * s.defending);
      res.centerDef += 0.13 * s.defending;
      res.centerAtt += 0.13 * s.passing;
    } else if (order === 'defensive') {
      addSideAtt(0.69 * s.winger + 0.21 * s.passing);
      res.midfield += 0.30 * s.playmaking;
      addSideDef(0.61 * s.defending);
      res.centerDef += 0.29 * s.defending;
      res.centerAtt += 0.08 * s.passing;
    } else if (order === 'towards_middle') {
      addSideAtt(0.74 * s.winger + 0.15 * s.passing);
      res.midfield += 0.55 * s.playmaking;
      addSideDef(0.29 * s.defending);
      res.centerDef += 0.25 * s.defending;
      res.centerAtt += 0.16 * s.passing;
    } else {
      // normal
      addSideAtt(0.86 * s.winger + 0.26 * s.passing);
      res.midfield += 0.45 * s.playmaking;
      addSideDef(0.35 * s.defending);
      res.centerDef += 0.20 * s.defending;
      res.centerAtt += 0.11 * s.passing;
    }
    return res;
  }

  // Forward (FW)
  if (order === 'defensive') {
    const isTech = player.specialty === 'Technical';
    const wingPassMult = isTech ? 0.41 : 0.31;
    res.centerAtt += 0.56 * s.scoring + 0.53 * s.passing;
    res.leftAtt += 0.13 * s.scoring + wingPassMult * s.passing + 0.20 * s.winger;
    res.rightAtt += 0.13 * s.scoring + wingPassMult * s.passing + 0.20 * s.winger;
    res.midfield += 0.42 * s.playmaking;
  } else if (order === 'towards_wing' && side !== 'center') {
    res.centerAtt += 0.66 * s.scoring + 0.23 * s.passing;
    if (side === 'right') {
      res.rightAtt += 0.51 * s.scoring + 0.21 * s.passing + 0.64 * s.winger;
      res.leftAtt += 0.19 * s.scoring + 0.06 * s.passing;
    } else {
      res.leftAtt += 0.51 * s.scoring + 0.21 * s.passing + 0.64 * s.winger;
      res.rightAtt += 0.19 * s.scoring + 0.06 * s.passing;
    }
    res.midfield += 0.18 * s.playmaking;
  } else {
    // normal
    res.centerAtt += 1.0 * s.scoring + 0.37 * s.passing;
    res.leftAtt += 0.27 * s.scoring + 0.14 * s.passing + 0.24 * s.winger;
    res.rightAtt += 0.27 * s.scoring + 0.14 * s.passing + 0.24 * s.winger;
    res.midfield += 0.25 * s.playmaking;
  }
  return res;
}

/**
 * Odhad hvězdičkového výkonu hráče na daném postu pro vizuální přehlednost na hřišti.
 */
export function estimatePlayerStarRating(
  player: Player,
  slotId: SlotId,
  order: PlayerOrder,
  weather: WeatherType = 'partially_cloudy'
): number {
  const c = getSlotContribution(player, slotId, order, weather);
  const sum =
    c.midfield * 1.15 +
    c.centerDef * 0.95 +
    (c.leftDef + c.rightDef) * 0.75 +
    c.centerAtt * 0.95 +
    (c.leftAtt + c.rightAtt) * 0.75;
  return Math.round(Math.max(1, Math.min(15, sum * 0.38)) * 2) / 2;
}

/**
 * Vypočítá 7 sektorových ratingů týmu + HatStats + LoddarStats ze sestavy,
 * nastavení klubu, nálady v týmu, sebevědomí, taktiky a kontextu zápasu.
 */
export function calculateTeamRatings(
  assignments: LineupAssignment[],
  playersById: Map<number, Player>,
  club: ClubSettings,
  context: MatchContext,
  tactic: TeamTactic,
  formationExperienceLevel = 9
): {
  ratings: SectorRatings;
  hatStats: number;
  loddarStats: number;
  tacticLevel: number;
} {
  let cdCount = 0;
  let imCount = 0;
  let fwCount = 0;

  for (const a of assignments) {
    const grp = SLOT_META[a.slotId].group;
    if (grp === 'CD') cdCount++;
    else if (grp === 'IM') imCount++;
    else if (grp === 'FW') fwCount++;
  }

  // Penalizace za přeplnění středu v Hattricku
  const cdPenalty = cdCount >= 3 ? 0.9 : cdCount === 2 ? 0.964 : 1.0;
  const imPenalty = imCount >= 3 ? 0.825 : imCount === 2 ? 0.935 : 1.0;
  const fwPenalty = fwCount >= 3 ? 0.865 : fwCount === 2 ? 0.945 : 1.0;

  const raw: RawSectorContrib = {
    midfield: 0,
    rightDef: 0,
    centerDef: 0,
    leftDef: 0,
    rightAtt: 0,
    centerAtt: 0,
    leftAtt: 0,
  };

  let teamSpSum = 0;
  let teamDefPassSum = 0;
  let teamScoringSum = 0;
  let teamPassSum = 0;
  let teamStaminaDefSum = 0;
  let outfieldCount = 0;

  for (const a of assignments) {
    const p = playersById.get(a.playerId);
    if (!p) continue;

    const grp = SLOT_META[a.slotId].group;
    const c = getSlotContribution(p, a.slotId, a.order, context.weather);

    let mult = 1.0;
    if (grp === 'CD') mult = cdPenalty;
    else if (grp === 'IM') mult = imPenalty;
    else if (grp === 'FW') mult = fwPenalty;

    raw.midfield += c.midfield * mult;
    raw.rightDef += c.rightDef * mult;
    raw.centerDef += c.centerDef * mult;
    raw.leftDef += c.leftDef * mult;
    raw.rightAtt += c.rightAtt * mult;
    raw.centerAtt += c.centerAtt * mult;
    raw.leftAtt += c.leftAtt * mult;

    const eff = getEffectiveSkills(p, context.weather);
    teamSpSum += eff.setPieces;
    if (grp !== 'GK') {
      outfieldCount++;
      teamPassSum += eff.passing;
      teamScoringSum += eff.scoring;
      teamStaminaDefSum += eff.defending + p.stamina;
      if (grp === 'CD' || grp === 'WB' || grp === 'IM') {
        teamDefPassSum += eff.defending + eff.passing;
      }
    }
  }

  // Zkušenost s formací (zmatení pod úrovní 8)
  const confusionFactor =
    formationExperienceLevel >= 8
      ? 1.0
      : Math.max(0.72, 1.0 - (8 - formationExperienceLevel) * 0.04);

  // Modifikátor zálohy: Team Spirit + PIC/MOTS + Domácí prostředí
  const spiritFactor = 0.7 + Math.max(1, Math.min(10, club.teamSpirit)) * 0.05;
  const attitudeFactor =
    context.attitude === 'pic' ? 0.84 : context.attitude === 'mots' ? 1.12 : 1.0;
  const venueFactor =
    context.venue === 'home' ? 1.198 : context.venue === 'derby' ? 1.114 : 1.0;

  // Modifikátor sebevědomí (pro útok) a stylu trenéra
  const confidenceFactor = 0.8 + Math.max(1, Math.min(10, club.confidence)) * 0.035;
  const coachDefFactor =
    club.coachStyle === 'defensive' ? 1.08 : club.coachStyle === 'offensive' ? 0.95 : 1.0;
  const coachAttFactor =
    club.coachStyle === 'offensive' ? 1.08 : club.coachStyle === 'defensive' ? 0.95 : 1.0;

  // Taktické modifikátory
  const tacticMidFactor = tactic === 'ca' ? 0.93 : 1.0;
  const tacticSideDefFactor = tactic === 'aim' ? 0.92 : tactic === 'creative' ? 0.93 : 1.0;
  const tacticCenterDefFactor = tactic === 'aow' ? 0.92 : tactic === 'creative' ? 0.93 : 1.0;

  const clampRating = (val: number) =>
    Math.round(Math.max(1.0, Math.min(20.99, val)) * 100) / 100;

  const midfield = clampRating(
    (1.0 + raw.midfield * 0.21) *
      spiritFactor *
      attitudeFactor *
      venueFactor *
      tacticMidFactor *
      confusionFactor
  );
  const centerDef = clampRating(
    (1.0 + raw.centerDef * 0.21) * coachDefFactor * tacticCenterDefFactor * confusionFactor
  );
  const leftDef = clampRating(
    (1.0 + raw.leftDef * 0.33) * coachDefFactor * tacticSideDefFactor * confusionFactor
  );
  const rightDef = clampRating(
    (1.0 + raw.rightDef * 0.33) * coachDefFactor * tacticSideDefFactor * confusionFactor
  );
  const centerAtt = clampRating(
    (1.0 + raw.centerAtt * 0.23) * confidenceFactor * coachAttFactor * confusionFactor
  );
  const leftAtt = clampRating(
    (1.0 + raw.leftAtt * 0.27) * confidenceFactor * coachAttFactor * confusionFactor
  );
  const rightAtt = clampRating(
    (1.0 + raw.rightAtt * 0.27) * confidenceFactor * coachAttFactor * confusionFactor
  );

  const avgOutfieldPass = outfieldCount > 0 ? teamPassSum / outfieldCount : 4;
  const indirectSetPiecesDef = clampRating(
    (centerDef * 0.45 + (teamSpSum / Math.max(1, assignments.length)) * 0.55)
  );
  const indirectSetPiecesAtt = clampRating(
    (centerAtt * 0.45 + (teamSpSum / Math.max(1, assignments.length)) * 0.55)
  );

  const ratings: SectorRatings = {
    midfield,
    rightDef,
    centerDef,
    leftDef,
    rightAtt,
    centerAtt,
    leftAtt,
    indirectSetPiecesDef,
    indirectSetPiecesAtt,
  };

  // Výpočet očekávané úrovně taktiky (1-20)
  let tacticLevel = 8;
  if (tactic === 'aim' || tactic === 'aow') {
    tacticLevel = Math.round(Math.min(20, Math.max(3, 2 + avgOutfieldPass * 1.45)));
  } else if (tactic === 'ca') {
    tacticLevel = Math.round(Math.min(20, Math.max(3, 2 + teamDefPassSum * 0.18)));
  } else if (tactic === 'pressing') {
    tacticLevel = Math.round(Math.min(20, Math.max(3, 1 + teamStaminaDefSum * 0.12)));
  } else if (tactic === 'long_shots') {
    tacticLevel = Math.round(
      Math.min(20, Math.max(3, 1 + (teamScoringSum + teamSpSum) * 0.11))
    );
  } else if (tactic === 'creative') {
    tacticLevel = Math.round(Math.min(20, Math.max(3, 3 + avgOutfieldPass * 1.1)));
  }

  // HatStats & LoddarStats
  const hatStats = Math.round(
    4 * (3 * midfield + leftDef + centerDef + rightDef + leftAtt + centerAtt + rightAtt)
  );

  const totalDefWeighted = 0.46 * centerDef + 0.27 * (leftDef + rightDef);
  const totalAttWeighted = 0.46 * centerAtt + 0.27 * (leftAtt + rightAtt);
  const midLoddar = 0.37 + (0.63 * midfield) / 14;
  const loddarStats =
    Math.round(midLoddar * (0.47 * totalAttWeighted + 0.53 * totalDefWeighted) * 100) / 100;

  return {
    ratings,
    hatStats,
    loddarStats,
    tacticLevel,
  };
}
