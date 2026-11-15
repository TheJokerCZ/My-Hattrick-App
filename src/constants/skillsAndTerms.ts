import {
  FormationId,
  PlayerOrder,
  RoleGroup,
  SlotId,
  Specialty,
  TeamTactic,
  TrainingType,
  WeatherType,
} from '../types/hattrick';

export const SKILL_NAMES_CS: string[] = [
  'neexistující', // 0
  'mizerná',      // 1
  'ubohá',        // 2
  'špatná',       // 3
  'slabá',        // 4
  'nedostatečná', // 5
  'přijatelná',   // 6
  'dobrá',        // 7
  'solidní',      // 8
  'vynikající',   // 9
  'skvělá',       // 10
  'brilantní',    // 11
  'velkolepá',    // 12
  'světová',      // 13
  'nadpřirozená', // 14
  'titánská',     // 15
  'mimozemská',   // 16
  'mýtická',      // 17
  'magická',      // 18
  'utopická',     // 19
  'božská',       // 20
];

export const SKILL_NAMES_EN: string[] = [
  'non-existent',
  'disastrous',
  'wretched',
  'poor',
  'weak',
  'inadequate',
  'passable',
  'solid',
  'excellent',
  'formidable',
  'outstanding',
  'brilliant',
  'magnificent',
  'world class',
  'supernatural',
  'titanic',
  'extra-terrestrial',
  'mythical',
  'magical',
  'utopian',
  'divine',
];

export function getSkillLabel(level: number): string {
  const clamped = Math.max(0, Math.min(20, Math.floor(level)));
  return SKILL_NAMES_CS[clamped] ?? `úroveň ${clamped}`;
}

export function getSubLevelLabel(rating: number): string {
  const whole = Math.max(1, Math.min(20, Math.floor(rating)));
  const frac = rating - Math.floor(rating);
  let sub = 'velmi nízká';
  if (frac >= 0.75) sub = 'velmi vysoká';
  else if (frac >= 0.5) sub = 'vysoká';
  else if (frac >= 0.25) sub = 'nízká';
  return `${SKILL_NAMES_CS[whole] ?? whole} (${sub})`;
}

export function getSkillBadgeColor(level: number): string {
  if (level >= 15) return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
  if (level >= 12) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (level >= 9) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  if (level >= 7) return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  if (level >= 5) return 'bg-slate-600/30 text-slate-200 border-slate-500/40';
  return 'bg-slate-800/60 text-slate-400 border-slate-700/50';
}

export const SPECIALTY_LABELS: Record<Specialty, { label: string; short: string; icon: string }> = {
  None: { label: 'Bez speciality', short: '—', icon: '' },
  Quick: { label: 'Rychlý', short: 'Rychlý', icon: '⚡' },
  Head: { label: 'Hlavičkář', short: 'Hlava', icon: '🎯' },
  Technical: { label: 'Technik', short: 'Tech', icon: '✨' },
  Unpredictable: { label: 'Nevyzpytatelný', short: 'Nevyzp.', icon: '🎲' },
  Powerful: { label: 'Důrazný', short: 'Důraz', icon: '💪' },
  Resilient: { label: 'Odolný', short: 'Odolný', icon: '🛡️' },
};

export const SLOT_META: Record<
  SlotId,
  {
    label: string;
    short: string;
    group: RoleGroup;
    side: 'center' | 'left' | 'right';
    allowedOrders: PlayerOrder[];
    row: number; // 0=GK, 1=DEF, 2=MID, 3=FW
    col: number; // 0..4 (RWB=0, RCD=1, CD=2, LCD=3, LWB=4 from team perspective)
  }
> = {
  GK: {
    label: 'Brankář',
    short: 'GK',
    group: 'GK',
    side: 'center',
    allowedOrders: ['normal'],
    row: 0,
    col: 2,
  },
  RWB: {
    label: 'Pravý krajní obránce',
    short: 'PKO',
    group: 'WB',
    side: 'right',
    allowedOrders: ['normal', 'defensive', 'offensive', 'towards_middle'],
    row: 1,
    col: 0,
  },
  RCD: {
    label: 'Pravý střední obránce',
    short: 'PSO',
    group: 'CD',
    side: 'right',
    allowedOrders: ['normal', 'offensive', 'towards_wing'],
    row: 1,
    col: 1,
  },
  CD: {
    label: 'Střední obránce',
    short: 'SO',
    group: 'CD',
    side: 'center',
    allowedOrders: ['normal', 'offensive'],
    row: 1,
    col: 2,
  },
  LCD: {
    label: 'Levý střední obránce',
    short: 'LSO',
    group: 'CD',
    side: 'left',
    allowedOrders: ['normal', 'offensive', 'towards_wing'],
    row: 1,
    col: 3,
  },
  LWB: {
    label: 'Levý krajní obránce',
    short: 'LKO',
    group: 'WB',
    side: 'left',
    allowedOrders: ['normal', 'defensive', 'offensive', 'towards_middle'],
    row: 1,
    col: 4,
  },
  RW: {
    label: 'Pravé křídlo',
    short: 'PK',
    group: 'WI',
    side: 'right',
    allowedOrders: ['normal', 'offensive', 'defensive', 'towards_middle'],
    row: 2,
    col: 0,
  },
  RIM: {
    label: 'Pravý záložník',
    short: 'PZ',
    group: 'IM',
    side: 'right',
    allowedOrders: ['normal', 'offensive', 'defensive', 'towards_wing'],
    row: 2,
    col: 1,
  },
  CIM: {
    label: 'Střední záložník',
    short: 'SZ',
    group: 'IM',
    side: 'center',
    allowedOrders: ['normal', 'offensive', 'defensive'],
    row: 2,
    col: 2,
  },
  LIM: {
    label: 'Levý záložník',
    short: 'LZ',
    group: 'IM',
    side: 'left',
    allowedOrders: ['normal', 'offensive', 'defensive', 'towards_wing'],
    row: 2,
    col: 3,
  },
  LW: {
    label: 'Levé křídlo',
    short: 'LK',
    group: 'WI',
    side: 'left',
    allowedOrders: ['normal', 'offensive', 'defensive', 'towards_middle'],
    row: 2,
    col: 4,
  },
  RFW: {
    label: 'Pravý útočník',
    short: 'PÚ',
    group: 'FW',
    side: 'right',
    allowedOrders: ['normal', 'defensive', 'towards_wing'],
    row: 3,
    col: 1,
  },
  CFW: {
    label: 'Střední útočník',
    short: 'SÚ',
    group: 'FW',
    side: 'center',
    allowedOrders: ['normal', 'defensive'],
    row: 3,
    col: 2,
  },
  LFW: {
    label: 'Levý útočník',
    short: 'LÚ',
    group: 'FW',
    side: 'left',
    allowedOrders: ['normal', 'defensive', 'towards_wing'],
    row: 3,
    col: 3,
  },
};

export const ORDER_LABELS: Record<PlayerOrder, { label: string; short: string; arrow: string }> = {
  normal: { label: 'Normální', short: 'Norm', arrow: '•' },
  offensive: { label: 'Ofenzivní', short: 'Ofenz.', arrow: '↑' },
  defensive: { label: 'Defenzivní', short: 'Def.', arrow: '↓' },
  towards_middle: { label: 'Doprostřed', short: 'Střed', arrow: '→←' },
  towards_wing: { label: 'K lajně', short: 'Kraj', arrow: '←→' },
};

export const FORMATIONS: Record<
  FormationId,
  {
    id: FormationId;
    label: string;
    slots: SlotId[];
    altLayouts?: SlotId[][];
    description: string;
  }
> = {
  '3-5-2': {
    id: '3-5-2',
    label: '3-5-2',
    slots: ['GK', 'RWB', 'CD', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'LFW'],
    altLayouts: [
      ['GK', 'RWB', 'CD', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'LFW'],
      ['GK', 'RCD', 'CD', 'LCD', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'LFW'],
      ['GK', 'RWB', 'RCD', 'LCD', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'LFW'],
    ],
    description: 'Královská formace pro dominanci v záloze a trénink tvorby hry.',
  },
  '4-4-2': {
    id: '4-4-2',
    label: '4-4-2',
    slots: ['GK', 'RWB', 'RCD', 'LCD', 'LWB', 'RW', 'RIM', 'LIM', 'LW', 'RFW', 'LFW'],
    description: 'Vyvážená klasika bez zmatení a s pevnou čtyřčlennou obranou.',
  },
  '2-5-3': {
    id: '2-5-3',
    label: '2-5-3',
    slots: ['GK', 'RCD', 'LCD', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
    altLayouts: [
      ['GK', 'RCD', 'LCD', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
      ['GK', 'RWB', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
    ],
    description: 'Maximální záloha a drtivý útok na úkor obrany. Skvělé pro trénink útoku či zálohy.',
  },
  '3-4-3': {
    id: '3-4-3',
    label: '3-4-3',
    slots: ['GK', 'RWB', 'CD', 'LWB', 'RW', 'RIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
    altLayouts: [
      ['GK', 'RWB', 'CD', 'LWB', 'RW', 'RIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
      ['GK', 'RCD', 'CD', 'LCD', 'RW', 'RIM', 'CIM', 'LIM', 'RFW', 'CFW', 'LFW'],
    ],
    description: 'Tříútočníková síla vhodná pro trénink zakončování se solidní zálohou.',
  },
  '4-5-1': {
    id: '4-5-1',
    label: '4-5-1',
    slots: ['GK', 'RWB', 'RCD', 'LCD', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'CFW'],
    description: 'Silná kontrola středu hřiště a pevná obrana, často s jediným hrotem.',
  },
  '5-3-2': {
    id: '5-3-2',
    label: '5-3-2',
    slots: ['GK', 'RWB', 'RCD', 'CD', 'LCD', 'LWB', 'RIM', 'CIM', 'LIM', 'RFW', 'LFW'],
    description: 'Ideální pro protiútoky (CA) a maximální využití 10 slotů tréninku obrany.',
  },
  '5-4-1': {
    id: '5-4-1',
    label: '5-4-1',
    slots: ['GK', 'RWB', 'RCD', 'CD', 'LCD', 'LWB', 'RW', 'RIM', 'LIM', 'LW', 'CFW'],
    description: 'Defenzivní pevnost pro trénink obrany a blokování silnějšího soupeře.',
  },
  '5-2-3': {
    id: '5-2-3',
    label: '5-2-3',
    slots: ['GK', 'RWB', 'RCD', 'CD', 'LCD', 'LWB', 'RIM', 'LIM', 'RFW', 'CFW', 'LFW'],
    description: 'Čisté protiútoky (CA) s neprostupnou obranou a třemi útočníky.',
  },
  '4-3-3': {
    id: '4-3-3',
    label: '4-3-3',
    slots: ['GK', 'RWB', 'RCD', 'LCD', 'LWB', 'RIM', 'CIM', 'LIM', 'RFW', 'CFW', 'LFW'],
    description: 'Tři útočníci za pevnou čtyřčlennou obranou, vhodné i pro protiútoky.',
  },
};

export const TACTIC_LABELS: Record<TeamTactic, { label: string; short: string; description: string }> = {
  normal: {
    label: 'Normální',
    short: 'Normál',
    description: 'Bez taktické úpravy, vyrovnaná distribuce šancí bez postihů.',
  },
  aim: {
    label: 'Útok středem (AIM)',
    short: 'AIM',
    description: 'Přesouvá část šancí z křídel do středu (mírně oslabuje kraje obrany).',
  },
  aow: {
    label: 'Útok po křídlech (AOW)',
    short: 'AOW',
    description: 'Přesouvá část šancí ze středu na křídla (mírně oslabuje střední obranu).',
  },
  ca: {
    label: 'Protiútoky (CA)',
    short: 'Protiútoky',
    description: 'Při slabší záloze mění ubráněné šance soupeře na rychlé brejky (-7 % záloha).',
  },
  pressing: {
    label: 'Presink',
    short: 'Presink',
    description: 'Snižuje celkový počet šancí v zápase pro oba týmy.',
  },
  creative: {
    label: 'Kreativní hra',
    short: 'Kreativní',
    description: 'Zvyšuje pravděpodobnost speciálních událostí (SE), mírně snižuje obranu.',
  },
  long_shots: {
    label: 'Střelba z dálky',
    short: 'Dálky',
    description: 'Část šancí se řeší střelou z dálky (závisí na zakončování a standardkách).',
  },
};

export const TRAINING_META: Record<
  TrainingType,
  {
    label: string;
    skillKey: keyof import('../types/hattrick').PlayerSkills;
    slots100PerMatch: number;
    slots50PerMatch: number;
    baseWeeksAt17PassableCoach: number;
    description: string;
    bestFormations: FormationId[];
    slotLabels100: SlotId[];
    slotLabels50: SlotId[];
  }
> = {
  playmaking: {
    label: 'Tvorba hry (Záloha)',
    skillKey: 'playmaking',
    slots100PerMatch: 3,
    slots50PerMatch: 2,
    baseWeeksAt17PassableCoach: 4.5,
    description: 'Trénuje 3 střední záložníky na 100 % a 2 křídla na 50 % (celkem 6+4 sloty týdně).',
    bestFormations: ['3-5-2', '2-5-3', '4-5-1'],
    slotLabels100: ['RIM', 'CIM', 'LIM'],
    slotLabels50: ['RW', 'LW'],
  },
  defending: {
    label: 'Bránění (Obrana)',
    skillKey: 'defending',
    slots100PerMatch: 5,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 5.2,
    description: 'Trénuje až 5 obránců v každém zápase na 100 % (celkem 10 plných slotů týdně!).',
    bestFormations: ['5-3-2', '5-4-1', '5-2-3'],
    slotLabels100: ['RWB', 'RCD', 'CD', 'LCD', 'LWB'],
    slotLabels50: [],
  },
  scoring: {
    label: 'Zakončování (Útok)',
    skillKey: 'scoring',
    slots100PerMatch: 3,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 4.7,
    description: 'Trénuje 3 útočníky v každém zápase na 100 % (celkem 6 plných slotů týdně).',
    bestFormations: ['2-5-3', '3-4-3', '4-3-3', '5-2-3'],
    slotLabels100: ['RFW', 'CFW', 'LFW'],
    slotLabels50: [],
  },
  winger: {
    label: 'Křídlo',
    skillKey: 'winger',
    slots100PerMatch: 2,
    slots50PerMatch: 2,
    baseWeeksAt17PassableCoach: 3.6,
    description: 'Nejrychlejší trénink v poli: 2 křídla na 100 % a 2 krajní obránci na 50 %.',
    bestFormations: ['3-5-2', '4-4-2', '4-5-1'],
    slotLabels100: ['RW', 'LW'],
    slotLabels50: ['RWB', 'LWB'],
  },
  short_passes: {
    label: 'Krátké přihrávky',
    skillKey: 'passing',
    slots100PerMatch: 8,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 4.1,
    description: 'Trénuje všechny záložníky, křídla i útočníky na 100 % (až 16 hráčů týdně).',
    bestFormations: ['2-5-3', '3-5-2', '3-4-3'],
    slotLabels100: ['RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
    slotLabels50: [],
  },
  through_passes: {
    label: 'Průnikové přihrávky',
    skillKey: 'passing',
    slots100PerMatch: 10,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 4.6,
    description: 'Trénuje obránce, křídla a střední záložníky (až 20 slotů týdně).',
    bestFormations: ['4-5-1', '5-4-1', '3-5-2'],
    slotLabels100: ['RWB', 'RCD', 'CD', 'LCD', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW'],
    slotLabels50: [],
  },
  goalkeeping: {
    label: 'Brankář',
    skillKey: 'keeper',
    slots100PerMatch: 1,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 3.1,
    description: 'Extrémně rychlý trénink pro 2 brankáře (1 v lize, 1 v přáteláku), neomezuje formaci.',
    bestFormations: ['3-5-2', '4-4-2', '2-5-3'],
    slotLabels100: ['GK'],
    slotLabels50: [],
  },
  set_pieces: {
    label: 'Standardní situace',
    skillKey: 'setPieces',
    slots100PerMatch: 11,
    slots50PerMatch: 0,
    baseWeeksAt17PassableCoach: 2.0,
    description: 'Trénuje všech 11 hráčů v zápase (+25 % pro exekutora standardek).',
    bestFormations: ['3-5-2', '4-4-2'],
    slotLabels100: ['GK', 'RWB', 'RCD', 'CD', 'LCD', 'LWB', 'RW', 'RIM', 'CIM', 'LIM', 'LW', 'RFW', 'CFW', 'LFW'],
    slotLabels50: [],
  },
};

export const WEATHER_LABELS: Record<WeatherType, { label: string; icon: string; effect: string }> = {
  rainy: {
    label: 'Déšť',
    icon: '🌧️',
    effect: 'Důrazní +5 %, Technici a Rychlí -5 %',
  },
  overcast: {
    label: 'Zataženo',
    icon: '☁️',
    effect: 'Neutrální počasí bez bonusů a postihů',
  },
  partially_cloudy: {
    label: 'Polojasno',
    icon: '⛅',
    effect: 'Neutrální počasí bez bonusů a postihů',
  },
  sunny: {
    label: 'Slunečno',
    icon: '☀️',
    effect: 'Technici +5 %, Rychlí a Důrazní -5 %',
  },
};
