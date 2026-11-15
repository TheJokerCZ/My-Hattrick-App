export type Specialty =
  | 'None'
  | 'Quick'
  | 'Head'
  | 'Technical'
  | 'Unpredictable'
  | 'Powerful'
  | 'Resilient';

export interface PlayerSkills {
  keeper: number;
  defending: number;
  playmaking: number;
  winger: number;
  passing: number;
  scoring: number;
  setPieces: number;
}

export interface Player {
  id: number;
  name: string;
  number: number;
  ageYears: number;
  ageDays: number;
  tsi: number;
  wage: number;
  /** 0 = zdravý, -1 = náplast (bruised), >0 = počet týdnů zranění */
  injuredWeeks: number;
  /** 0, 1, 2, 3 (3 = stopka na příští zápas) */
  cards: number;
  specialty: Specialty;
  /** Forma 1–8 */
  form: number;
  /** Kondice 1–9 */
  stamina: number;
  /** Zkušenosti 1–20 */
  experience: number;
  /** Vůdcovství 1–8 */
  leadership: number;
  /** Věrnost 1–20 */
  loyalty: number;
  /** Srdíčko mateřského klubu (+0.5 ke všem dovednostem) */
  motherClubBonus: boolean;
  skills: PlayerSkills;
  /** Vlastní poznámka uživatele */
  notes?: string;
  /** Národnost hráče (např. Italy, Lithuania, Czechia) */
  nationality?: string;
  /** Preferovaná pozice / NejP kód (např. KOd, SO, SZo, Únk, Br) */
  preferredPosition?: string;
  /** Preferovaný individuální pokyn (např. defensive, offensive, towards_wing) */
  preferredOrder?: PlayerOrder;
  /** Preferovaný taktický slot (např. RWB, CD, CIM, RW, CFW, GK) */
  preferredSlot?: SlotId;
}

export type SlotId =
  | 'GK'
  | 'RWB'
  | 'RCD'
  | 'CD'
  | 'LCD'
  | 'LWB'
  | 'RW'
  | 'RIM'
  | 'CIM'
  | 'LIM'
  | 'LW'
  | 'RFW'
  | 'CFW'
  | 'LFW';

export type RoleGroup = 'GK' | 'WB' | 'CD' | 'IM' | 'WI' | 'FW';

export type PlayerOrder =
  | 'normal'
  | 'offensive'
  | 'defensive'
  | 'towards_middle'
  | 'towards_wing';

export type FormationId =
  | '3-5-2'
  | '4-4-2'
  | '2-5-3'
  | '3-4-3'
  | '4-5-1'
  | '5-3-2'
  | '5-4-1'
  | '5-2-3'
  | '4-3-3';

export type TeamTactic =
  | 'normal'
  | 'aim'
  | 'aow'
  | 'ca'
  | 'pressing'
  | 'creative'
  | 'long_shots';

export type MatchAttitude = 'pic' | 'normal' | 'mots';
export type MatchVenue = 'home' | 'away' | 'derby';
export type WeatherType = 'rainy' | 'overcast' | 'partially_cloudy' | 'sunny';
export type CoachStyle = 'balanced' | 'defensive' | 'offensive';

export type TrainingType =
  | 'playmaking'
  | 'defending'
  | 'scoring'
  | 'winger'
  | 'short_passes'
  | 'through_passes'
  | 'goalkeeping'
  | 'set_pieces';

export interface SectorRatings {
  midfield: number;
  rightDef: number;
  centerDef: number;
  leftDef: number;
  rightAtt: number;
  centerAtt: number;
  leftAtt: number;
  indirectSetPiecesDef: number;
  indirectSetPiecesAtt: number;
}

export interface LineupAssignment {
  slotId: SlotId;
  playerId: number;
  order: PlayerOrder;
  starRating?: number;
}

export interface BenchPlan {
  gkId: number | null;
  defId: number | null;
  imId: number | null;
  wiId: number | null;
  fwId: number | null;
}

export interface SubstitutionPlan {
  minute: number;
  outPlayerId: number;
  outPlayerName: string;
  inPlayerId: number;
  inPlayerName: string;
  slotId: SlotId;
  reason: string;
}

export type OptimizerObjective =
  | 'win_probability'
  | 'hatstats'
  | 'midfield'
  | 'counter_attack';

export interface ClubSettings {
  teamName: string;
  /** 4 (slabý) až 8 (solidní/výborný) */
  coachLevel: number;
  coachStyle: CoachStyle;
  /** 0 až 10 (celková úroveň asistentů trenéra) */
  assistantsLevel: number;
  trainingType: TrainingType;
  trainingIntensity: number;
  staminaShare: number;
  /** Nálada v týmu 1–10 (klíčová pro zálohu) */
  teamSpirit: number;
  /** Sebevědomí 1–10 (klíčové pro útok) */
  confidence: number;
  /** Zkušenost s formací 1–10 */
  formationExperience: Record<FormationId, number>;
  /** Hráči vybraní k fixnímu tréninku v lize */
  trainingLockedPlayerIds: number[];
}

export interface MatchContext {
  venue: MatchVenue;
  attitude: MatchAttitude;
  weather: WeatherType;
  allowBruised: boolean;
}

export interface OpponentProfile {
  name: string;
  ratings: SectorRatings;
  tactic: TeamTactic;
  tacticLevel: number;
  setPiecesLevel: number;
}

export interface SectorDuelResult {
  sectorName: string;
  myAttack: number;
  oppDefense: number;
  myGoalProb: number;
  oppAttack: number;
  myDefense: number;
  oppGoalProb: number;
}

export interface MatchSimulationResult {
  possessionMy: number;
  possessionOpp: number;
  expectedRegularChancesMy: number;
  expectedRegularChancesOpp: number;
  expectedCounterChancesMy: number;
  expectedCounterChancesOpp: number;
  expectedSpecialEventsMy: number;
  expectedSpecialEventsOpp: number;
  xGMy: number;
  xGOpp: number;
  winProb: number;
  drawProb: number;
  lossProb: number;
  expectedPoints: number;
  sectorDuels: SectorDuelResult[];
  likelyScore: string;
}

export interface RecommendedLineup {
  formation: FormationId;
  assignments: LineupAssignment[];
  tactic: TeamTactic;
  tacticLevel: number;
  captainId: number | null;
  setPiecesTakerId: number | null;
  bench: BenchPlan;
  substitutions: SubstitutionPlan[];
  ratings: SectorRatings;
  hatStats: number;
  loddarStats: number;
  simulation: MatchSimulationResult;
  trainingSlotsUsed: number;
  trainingEfficiencyPct: number;
  objectiveScore: number;
  notes: string[];
}

export interface ProspectEvaluation {
  player: Player;
  prospectScore: number;
  ageFactor: number;
  bestTrainingType: TrainingType;
  recommendedRole: string;
  primarySkillName: string;
  primarySkillValue: number;
  secondarySkillSummary: string;
  weeksToNextSkillUp: number;
  marketPotentialLabel: string;
}

export interface TrainingRecommendation {
  trainingType: TrainingType;
  suitabilityScore: number;
  recommendedFormations: FormationId[];
  leagueSlots100: Player[];
  friendlySlots100: Player[];
  slots50: Player[];
  avgProspectScore: number;
  recommendedStaminaShare: number;
  weeksPerSkillUpAvg: number;
  reasoning: string;
}

export interface ChppCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  lastSyncAt?: string;
}

export interface AppState {
  players: Player[];
  club: ClubSettings;
  matchContext: MatchContext;
  opponent: OpponentProfile;
  currentLineup: RecommendedLineup | null;
  chpp: ChppCredentials;
}
