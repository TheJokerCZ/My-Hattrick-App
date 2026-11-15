import { ClubSettings, Player, Specialty, TrainingType } from '../types/hattrick';

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const LEVEL_DICTIONARY: Array<{ keywords: string[]; level: number }> = [
  { keywords: ['neexistujici', 'non-existent', 'nonexistent'], level: 0 },
  { keywords: ['mizern', 'disastrous'], level: 1 },
  { keywords: ['uboh', 'wretched'], level: 2 },
  { keywords: ['spatn', 'poor'], level: 3 },
  { keywords: ['slab', 'weak'], level: 4 },
  { keywords: ['nedostatecn', 'inadequate'], level: 5 },
  { keywords: ['prijateln', 'passable'], level: 6 },
  { keywords: ['dobr', 'solid'], level: 7 },
  { keywords: ['solidni', 'excellent'], level: 8 },
  { keywords: ['vynikajici', 'formidable'], level: 9 },
  { keywords: ['skvel', 'outstanding'], level: 10 },
  { keywords: ['brilantni', 'brilliant'], level: 11 },
  { keywords: ['velkolep', 'magnificent'], level: 12 },
  { keywords: ['svetov', 'world class', 'world-class'], level: 13 },
  { keywords: ['nadprirozen', 'supernatural'], level: 14 },
  { keywords: ['titansk', 'titanic'], level: 15 },
  { keywords: ['mimozemsk', 'extra-terrestrial', 'extraterrestrial'], level: 16 },
  { keywords: ['mytick', 'mythical'], level: 17 },
  { keywords: ['magick', 'magical'], level: 18 },
  { keywords: ['utopick', 'utopian'], level: 19 },
  { keywords: ['bozsk', 'divine'], level: 20 },
];

export function parseSkillValue(fragment: string, fallback = 1): number {
  const clean = normalizeText(fragment);

  // Hledáme formát "10/20", "(10)" nebo samostatné číslo
  const slashMatch = clean.match(/\b(\d{1,2})\s*\/\s*20\b/);
  if (slashMatch) {
    const val = parseInt(slashMatch[1], 10);
    if (val >= 0 && val <= 20) return val;
  }

  const parenMatch = clean.match(/\((\d{1,2})\)/);
  if (parenMatch) {
    const val = parseInt(parenMatch[1], 10);
    if (val >= 0 && val <= 20) return val;
  }

  // Slovní popis: nejprve zkontrolujeme české "solidní" (8), aby nekolidovalo s anglickým "solid" (7)
  if (/\bsolidn[ií]?\b/.test(clean) || /\bexcellent\b/.test(clean)) {
    return 8;
  }

  for (const entry of LEVEL_DICTIONARY) {
    for (const kw of entry.keywords) {
      if (kw === 'solid' && /\bsolidn/.test(clean)) continue;
      if (clean.includes(kw)) {
        return entry.level;
      }
    }
  }

  const numMatch = clean.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val >= 0 && val <= 20) return val;
  }

  return fallback;
}

export function mapSpecialtyId(specId: number): Specialty {
  switch (specId) {
    case 1:
      return 'Technical';
    case 2:
      return 'Quick';
    case 3:
      return 'Powerful';
    case 4:
      return 'Unpredictable';
    case 5:
      return 'Head';
    case 6:
      return 'Resilient';
    default:
      return 'None';
  }
}

export function parseSpecialtyText(fragment: string): Specialty {
  const n = normalizeText(fragment);
  if (n.includes('rychl') || n.includes('quick')) return 'Quick';
  if (n.includes('hlav') || n.includes('head')) return 'Head';
  if (n.includes('tech') || n.includes('technical')) return 'Technical';
  if (n.includes('nevyzpyt') || n.includes('unpredict')) return 'Unpredictable';
  if (n.includes('duraz') || n.includes('power')) return 'Powerful';
  if (n.includes('odoln') || n.includes('resilient') || n.includes('regain')) return 'Resilient';
  return 'None';
}

/**
 * Parsuje oficiální Hattrick XML odpověď (soubor players.asp / CHPP players XML v2.x).
 */
export function parseHattrickPlayersXml(xmlString: string): Player[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Neplatný formát XML souboru.');
  }

  const playerNodes = Array.from(doc.querySelectorAll('Player'));
  if (playerNodes.length === 0) {
    throw new Error('V XML nebyl nalezen žádný hráč (element <Player>).');
  }

  const num = (parent: Element, tag: string, def = 0): number => {
    const el = parent.querySelector(tag);
    if (!el || el.textContent == null) return def;
    const parsed = parseInt(el.textContent.trim(), 10);
    return Number.isNaN(parsed) ? def : parsed;
  };

  const str = (parent: Element, tag: string, def = ''): string => {
    const el = parent.querySelector(tag);
    return el?.textContent?.trim() ?? def;
  };

  return playerNodes.map((node, index) => {
    const firstName = str(node, 'FirstName');
    const lastName = str(node, 'LastName');
    const nickName = str(node, 'NickName');
    const fullName =
      [firstName, nickName ? `"${nickName}"` : '', lastName].filter(Boolean).join(' ') ||
      `Hráč #${index + 1}`;

    const motherClubRaw = str(node, 'MotherClubBonus').toLowerCase();
    const motherClubBonus = motherClubRaw === 'true' || motherClubRaw === '1';

    return {
      id: num(node, 'PlayerID', Date.now() + index),
      name: fullName,
      number: num(node, 'PlayerNumber', index + 1),
      ageYears: num(node, 'Age', 20),
      ageDays: num(node, 'AgeDays', 0),
      tsi: num(node, 'TSI', 1000),
      wage: num(node, 'Salary', 10000),
      injuredWeeks: num(node, 'InjuryLevel', 0),
      cards: num(node, 'Cards', 0),
      specialty: mapSpecialtyId(num(node, 'Specialty', 0)),
      form: Math.max(1, Math.min(8, num(node, 'PlayerForm', 6))),
      stamina: Math.max(1, Math.min(9, num(node, 'StaminaSkill', 7))),
      experience: Math.max(1, Math.min(20, num(node, 'Experience', 3))),
      leadership: Math.max(1, Math.min(8, num(node, 'Leadership', 4))),
      loyalty: Math.max(1, Math.min(20, num(node, 'Loyalty', 10))),
      motherClubBonus,
      skills: {
        keeper: num(node, 'KeeperSkill', 1),
        defending: num(node, 'DefenderSkill', 1),
        playmaking: num(node, 'PlaymakerSkill', 1),
        winger: num(node, 'WingerSkill', 1),
        passing: num(node, 'PassingSkill', 1),
        scoring: num(node, 'ScorerSkill', 1),
        setPieces: num(node, 'SetPiecesSkill', 1),
      },
    };
  });
}

/**
 * Chytrý parser textu zkopírovaného přímo ze stránky Hráči na Hattrick.org (CZ i EN)
 * nebo CSV / tabulkového výpisu.
 */
export function parseHattrickCopyPaste(rawText: string): Player[] {
  const text = rawText.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  // Rozdělíme text na bloky podle hráčů: hlavička mívá ID v závorce "(123456789)" nebo číslo dresu "1. Jméno"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Detekce CSV / tabulky oddělené tabulátorem nebo středníkem
  const tabLines = lines.filter((l) => l.split(/\t|;/).length >= 10);
  if (tabLines.length >= 2) {
    const parsedFromTable = parseTabularPlayers(tabLines);
    if (parsedFromTable.length > 0) return parsedFromTable;
  }

  // Standardní textové bloky z Hattrick stránky
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const headerPattern = /^(?:\d{1,2}\.\s+)?([^\d()]{2,50})\s*\((\d{6,11})\)/;
  const altHeaderPattern = /^(\d{1,2})\.\s+([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽa-záčďéěíňóřšťúůýž][^\n]{2,45})$/;

  for (const line of lines) {
    const isHeader =
      headerPattern.test(line) ||
      (altHeaderPattern.test(line) &&
        !normalizeText(line).startsWith('special') &&
        !normalizeText(line).includes('let a '));
    if (isHeader && currentBlock.length >= 3) {
      blocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const players: Player[] = [];

  blocks.forEach((blockLines, idx) => {
    const joined = blockLines.join('\n');
    const normJoined = normalizeText(joined);

    // Přeskočíme blok, pokud neobsahuje žádné dovednosti ani věk ani TSI
    const hasSkillSignal =
      normJoined.includes('brankar') ||
      normJoined.includes('keeper') ||
      normJoined.includes('braneni') ||
      normJoined.includes('defending') ||
      normJoined.includes('tvorba hry') ||
      normJoined.includes('playmaking') ||
      normJoined.includes('zakoncovani') ||
      normJoined.includes('scoring');
    if (!hasSkillSignal) return;

    const firstLine = blockLines[0] ?? '';
    let name = `Hráč ${idx + 1}`;
    let id = 900000 + idx + 1;
    let number = idx + 1;

    const m1 = firstLine.match(/^(?:(\d{1,2})\.\s+)?(.+?)\s*\((\d{6,11})\)/);
    if (m1) {
      if (m1[1]) number = parseInt(m1[1], 10);
      name = m1[2].trim();
      id = parseInt(m1[3], 10);
    } else {
      const m2 = firstLine.match(/^(?:(\d{1,2})\.\s+)?(.+)$/);
      if (m2) {
        if (m2[1]) number = parseInt(m2[1], 10);
        name = m2[2].replace(/\(\d+\)/g, '').trim();
      }
    }

    // Věk: "21 let a 45 dní" nebo "21 years and 45 days"
    let ageYears = 21;
    let ageDays = 0;
    const ageMatch = normJoined.match(/(\d{2})\s*(?:let|years)(?:\s*(?:a|and)\s*(\d{1,3})\s*(?:dni|dny|days))?/);
    if (ageMatch) {
      ageYears = parseInt(ageMatch[1], 10);
      if (ageMatch[2]) ageDays = parseInt(ageMatch[2], 10);
    }

    // TSI & Plat
    let tsi = 2000;
    const tsiMatch = joined.match(/TSI[:\s]+([\d\s.,]+)/i);
    if (tsiMatch) {
      const digits = tsiMatch[1].replace(/[^\d]/g, '');
      if (digits) tsi = parseInt(digits, 10);
    }

    let wage = 20000;
    const wageMatch = joined.match(/(?:Plat|Wage|Salary)[:\s]+([\d\s.,]+)/i);
    if (wageMatch) {
      const digits = wageMatch[1].replace(/[^\d]/g, '');
      if (digits) wage = parseInt(digits, 10);
    }

    // Forma & Kondice
    let form = 6;
    let stamina = 7;
    const formStamLine = blockLines.find((l) => {
      const n = normalizeText(l);
      return (n.includes('forme') || n.includes('form')) && (n.includes('kondic') || n.includes('stamina'));
    });
    if (formStamLine) {
      const parts = formStamLine.split(/[,;]/);
      if (parts[0]) form = Math.max(1, Math.min(8, parseSkillValue(parts[0], 6)));
      if (parts[1]) stamina = Math.max(1, Math.min(9, parseSkillValue(parts[1], 7)));
    } else {
      const formLine = blockLines.find((l) => normalizeText(l).startsWith('forma'));
      if (formLine) form = Math.max(1, Math.min(8, parseSkillValue(formLine, 6)));
      const stamLine = blockLines.find((l) => normalizeText(l).startsWith('kondice'));
      if (stamLine) stamina = Math.max(1, Math.min(9, parseSkillValue(stamLine, 7)));
    }

    // Zkušenosti & Vůdcovství
    let experience = 4;
    let leadership = 4;
    const expLine = blockLines.find((l) => {
      const n = normalizeText(l);
      return n.includes('zkusenost') || n.includes('experience');
    });
    if (expLine) {
      const parts = expLine.split(/\ba\b|\band\b|,/i);
      if (parts[0]) experience = Math.max(1, Math.min(20, parseSkillValue(parts[0], 4)));
      if (parts[1]) leadership = Math.max(1, Math.min(8, parseSkillValue(parts[1], 4)));
    }

    // Věrnost & Mateřský klub
    let loyalty = 12;
    let motherClubBonus = false;
    const loyLine = blockLines.find((l) => {
      const n = normalizeText(l);
      return n.includes('vernost') || n.includes('loyalty');
    });
    if (loyLine) {
      loyalty = Math.max(1, Math.min(20, parseSkillValue(loyLine, 12)));
      if (loyLine.includes('♥') || loyLine.includes('(+)') || normalizeText(loyLine).includes('matersk')) {
        motherClubBonus = true;
      }
    }

    // Specialita
    let specialty: Specialty = 'None';
    const specLine = blockLines.find((l) => {
      const n = normalizeText(l);
      return n.includes('special');
    });
    if (specLine) {
      specialty = parseSpecialtyText(specLine);
    }

    // Zranění & Karty
    let injuredWeeks = 0;
    if (normJoined.includes('naplast') || normJoined.includes('bruised')) injuredWeeks = -1;
    const injMatch = normJoined.match(/zranen[a-z]*[:\s]+(\d+)/);
    if (injMatch) injuredWeeks = parseInt(injMatch[1], 10);

    const findSkillLine = (keys: string[], def = 1): number => {
      const line = blockLines.find((l) => {
        const n = normalizeText(l);
        return keys.some((k) => n.startsWith(k) || n.includes(`${k}:`) || n.includes(`${k}\t`));
      });
      return line ? parseSkillValue(line, def) : def;
    };

    players.push({
      id,
      name,
      number,
      ageYears,
      ageDays,
      tsi,
      wage,
      injuredWeeks,
      cards: 0,
      specialty,
      form,
      stamina,
      experience,
      leadership,
      loyalty,
      motherClubBonus,
      skills: {
        keeper: findSkillLine(['brankar', 'keeper']),
        defending: findSkillLine(['braneni', 'defending']),
        playmaking: findSkillLine(['tvorba hry', 'zaloha', 'playmaking']),
        winger: findSkillLine(['kridlo', 'winger']),
        passing: findSkillLine(['prihravky', 'passing']),
        scoring: findSkillLine(['zakoncovani', 'utok', 'scoring']),
        setPieces: findSkillLine(['standardni situace', 'standardky', 'set pieces']),
      },
    });
  });

  return players;
}

function parseTabularPlayers(lines: string[]): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/\t|;/).map((c) => c.trim());
    if (cols.length < 10) continue;
    // Přeskočíme hlavičkový řádek
    if (normalizeText(cols[0]).includes('jmeno') || normalizeText(cols[0]).includes('name')) {
      continue;
    }
    const name = cols[0];
    const age = parseInt(cols[1], 10) || 20;
    const tsi = parseInt(cols[2].replace(/\D/g, ''), 10) || 1000;
    const form = parseSkillValue(cols[3] ?? '6', 6);
    const stamina = parseSkillValue(cols[4] ?? '7', 7);
    const keeper = parseSkillValue(cols[5] ?? '1', 1);
    const defending = parseSkillValue(cols[6] ?? '1', 1);
    const playmaking = parseSkillValue(cols[7] ?? '1', 1);
    const winger = parseSkillValue(cols[8] ?? '1', 1);
    const passing = parseSkillValue(cols[9] ?? '1', 1);
    const scoring = parseSkillValue(cols[10] ?? '1', 1);
    const setPieces = parseSkillValue(cols[11] ?? '1', 1);
    const specialty = cols[12] ? parseSpecialtyText(cols[12]) : 'None';

    players.push({
      id: 800000 + i + 1,
      name,
      number: i + 1,
      ageYears: age,
      ageDays: 0,
      tsi,
      wage: 20000,
      injuredWeeks: 0,
      cards: 0,
      specialty,
      form: Math.min(8, Math.max(1, form)),
      stamina: Math.min(9, Math.max(1, stamina)),
      experience: 4,
      leadership: 4,
      loyalty: 12,
      motherClubBonus: false,
      skills: {
        keeper,
        defending,
        playmaking,
        winger,
        passing,
        scoring,
        setPieces,
      },
    });
  }
  return players;
}

function mapChppTrainingType(id: number): TrainingType | undefined {
  switch (id) {
    case 2:
    case 11:
      return 'set_pieces';
    case 3:
      return 'defending';
    case 4:
      return 'scoring';
    case 5:
      return 'winger';
    case 7:
      return 'short_passes';
    case 8:
      return 'playmaking';
    case 9:
      return 'goalkeeping';
    case 10:
      return 'through_passes';
    default:
      return undefined;
  }
}

/**
 * Volitelně vytáhne název týmu, morálku, sebevědomí a trénink z CHPP XML teamdetails/training.
 */
export function parseHattrickTrainingAndTeamXml(
  teamXml?: string,
  trainingXml?: string
): Partial<ClubSettings> {
  const result: Partial<ClubSettings> = {};
  const parser = new DOMParser();

  if (teamXml && teamXml.trim()) {
    const doc = parser.parseFromString(teamXml, 'application/xml');
    const teamName = doc.querySelector('Team > TeamName')?.textContent?.trim();
    if (teamName) result.teamName = teamName;
  }

  if (trainingXml && trainingXml.trim()) {
    const doc = parser.parseFromString(trainingXml, 'application/xml');
    const getInt = (tag: string) => {
      const t = doc.querySelector(tag)?.textContent?.trim();
      if (!t) return undefined;
      const v = parseInt(t, 10);
      return Number.isNaN(v) ? undefined : v;
    };

    const trTypeId = getInt('TrainingType');
    if (trTypeId !== undefined) {
      const mapped = mapChppTrainingType(trTypeId);
      if (mapped) result.trainingType = mapped;
    }
    const trLevel = getInt('TrainingLevel');
    if (trLevel !== undefined) result.trainingIntensity = Math.min(100, Math.max(50, trLevel));

    const staminaPart = getInt('StaminaTrainingPart');
    if (staminaPart !== undefined) result.staminaShare = Math.min(50, Math.max(5, staminaPart));

    const morale = getInt('Morale');
    if (morale !== undefined) result.teamSpirit = Math.min(10, Math.max(1, morale + 1));

    const confidence = getInt('SelfConfidence');
    if (confidence !== undefined) result.confidence = Math.min(10, Math.max(1, confidence + 1));
  }

  return result;
}
