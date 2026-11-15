import * as XLSX from 'xlsx';
import { ClubSettings, Player, PlayerOrder, SlotId, Specialty, TrainingType } from '../types/hattrick';

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
  if (n.includes('nevyzpyt') || n.includes('nepredvid') || n.includes('unpredict')) return 'Unpredictable';
  if (n.includes('duraz') || n.includes('silov') || n.includes('power')) return 'Powerful';
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
    const parsedFromTable = parseHattrickExcelText(text);
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

export function parseAgeField(raw: any): { ageYears: number; ageDays: number } {
  if (raw == null || raw === '') return { ageYears: 20, ageDays: 0 };

  // Pokud je předáno číslo (např. 18.45 nebo serial date z Excelu)
  if (typeof raw === 'number') {
    // Kontrola, zda Excel převedl věk na serial date kód (např. 46314)
    if (raw > 20000 && XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
      try {
        const parsedDate = XLSX.SSF.parse_date_code(raw);
        if (parsedDate && parsedDate.y >= 2020) {
          // V evropském Excelu se např. 19.10 převedlo na 19. října 2026
          // Den d (19) je věk v letech, měsíc m (10) jsou dny
          return { ageYears: parsedDate.d, ageDays: parsedDate.m };
        }
      } catch {
        // pokračujeme standardním rozkladem
      }
    }

    const str = raw.toString();
    const parts = str.split('.');
    const years = parseInt(parts[0], 10) || 20;
    if (parts.length > 1) {
      const decStr = parts[1];
      // V Hattricku notace 33.3 znamená 33 let a 30 dní, 33.9 znamená 33.90 (90 dní)
      const days =
        decStr.length === 1
          ? parseInt(decStr, 10) * 10
          : parseInt(decStr.slice(0, 3), 10);
      return { ageYears: years, ageDays: days };
    }
    return { ageYears: years, ageDays: 0 };
  }

  const str = String(raw).trim();

  // Datum ve formátu YYYY-MM-DD (např. 2026-10-19 nebo 2026-10-28 z Excelu)
  const dateIsoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateIsoMatch) {
    const d = parseInt(dateIsoMatch[3], 10);
    const m = parseInt(dateIsoMatch[2], 10);
    return { ageYears: d, ageDays: m };
  }

  // Datum ve formátu DD.MM.YYYY
  const dateCzMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateCzMatch) {
    const d = parseInt(dateCzMatch[1], 10);
    const m = parseInt(dateCzMatch[2], 10);
    return { ageYears: d, ageDays: m };
  }

  // Slovní formát: "21 let a 45 dní" nebo "21 years and 45 days"
  const textMatch = str.match(
    /(\d{2})\s*(?:let|years?)(?:\s*(?:a|and)\s*(\d{1,3})\s*(?:dni|dny|days?))?/i
  );
  if (textMatch) {
    return {
      ageYears: parseInt(textMatch[1], 10),
      ageDays: textMatch[2] ? parseInt(textMatch[2], 10) : 0,
    };
  }

  // Desetinné číslo v textu: "18.45" nebo "18,45" nebo "33.3"
  const decMatch = str.replace(',', '.').match(/^(\d{2})\.(\d{1,3})$/);
  if (decMatch) {
    const years = parseInt(decMatch[1], 10);
    const decStr = decMatch[2];
    const days =
      decStr.length === 1 ? parseInt(decStr, 10) * 10 : parseInt(decStr, 10);
    return { ageYears: years, ageDays: days };
  }

  const simpleNum = parseInt(str, 10);
  if (!Number.isNaN(simpleNum) && simpleNum >= 16 && simpleNum <= 50) {
    return { ageYears: simpleNum, ageDays: 0 };
  }

  return { ageYears: 20, ageDays: 0 };
}

export function parseStatusField(raw: any): { injuredWeeks: number; cards: number } {
  if (!raw) return { injuredWeeks: 0, cards: 0 };
  const s = String(raw).trim();
  const n = normalizeText(s);

  let cards = 0;
  if (
    n.includes('zkx3') ||
    n.includes('3 zk') ||
    n.includes('ck') ||
    n.includes('stop')
  ) {
    cards = 3;
  } else if (n.includes('zkx2') || n.includes('2 zk')) {
    cards = 2;
  } else if (
    n.includes('zkx1') ||
    n.includes('1 zk') ||
    n.includes('zk')
  ) {
    cards = 1;
  }

  let injuredWeeks = 0;
  if (n.includes('por') || n.includes('naplast') || n.includes('bruised')) {
    injuredWeeks = -1; // náplast
  } else {
    const m = n.match(/(?:zra|zranen|injur)[a-z]*\s*(\d+)/);
    if (m) {
      injuredWeeks = parseInt(m[1], 10);
    }
  }

  return { injuredWeeks, cards };
}

export function mapRoleCode(rawCode: any): {
  positionLabel: string;
  order: PlayerOrder;
  slot?: SlotId;
  rawCode: string;
} {
  const code = String(rawCode ?? '').trim();
  const c = normalizeText(code).toLowerCase();

  if (c === 'kod') {
    return {
      positionLabel: 'Krajní obránce (defenzivní)',
      order: 'defensive',
      slot: 'RWB',
      rawCode: code,
    };
  }
  if (c === 'koo' || code === 'Ko') {
    return {
      positionLabel: 'Krajní obránce (ofenzivní)',
      order: 'offensive',
      slot: 'RWB',
      rawCode: code,
    };
  }
  if (c === 'ko' || c === 'po' || c === 'lo' || c === 'wb') {
    return {
      positionLabel: 'Krajní obránce',
      order: 'normal',
      slot: 'RWB',
      rawCode: code,
    };
  }
  if (c === 'kos' || c === 'kodovnitr') {
    return {
      positionLabel: 'Krajní obránce (doprostřed)',
      order: 'towards_middle',
      slot: 'RWB',
      rawCode: code,
    };
  }

  if (c === 'so' || c === 'cd' || c === 'cb') {
    return {
      positionLabel: 'Střední obránce',
      order: 'normal',
      slot: 'CD',
      rawCode: code,
    };
  }
  if (c === 'soo') {
    return {
      positionLabel: 'Střední obránce (ofenzivní)',
      order: 'offensive',
      slot: 'CD',
      rawCode: code,
    };
  }
  if (c === 'sok' || c === 'sokl') {
    return {
      positionLabel: 'Střední obránce (k lajně)',
      order: 'towards_wing',
      slot: 'RCD',
      rawCode: code,
    };
  }

  if (c === 'sz' || c === 'im' || c === 'cm') {
    return {
      positionLabel: 'Střední záložník',
      order: 'normal',
      slot: 'CIM',
      rawCode: code,
    };
  }
  if (c === 'szo') {
    return {
      positionLabel: 'Střední záložník (ofenzivní)',
      order: 'offensive',
      slot: 'CIM',
      rawCode: code,
    };
  }
  if (c === 'szd') {
    return {
      positionLabel: 'Střední záložník (defenzivní)',
      order: 'defensive',
      slot: 'CIM',
      rawCode: code,
    };
  }
  if (c === 'szk') {
    return {
      positionLabel: 'Střední záložník (k lajně)',
      order: 'towards_wing',
      slot: 'RIM',
      rawCode: code,
    };
  }

  if (c === 'kz' || c === 'w' || c === 'wi' || c === 'k') {
    return {
      positionLabel: 'Křídlo (normální)',
      order: 'normal',
      slot: 'RW',
      rawCode: code,
    };
  }
  if (c === 'kzo') {
    return {
      positionLabel: 'Křídlo (ofenzivní)',
      order: 'offensive',
      slot: 'RW',
      rawCode: code,
    };
  }
  if (c === 'kzd') {
    return {
      positionLabel: 'Křídlo (defenzivní)',
      order: 'defensive',
      slot: 'RW',
      rawCode: code,
    };
  }
  if (c === 'kzs') {
    return {
      positionLabel: 'Křídlo (doprostřed)',
      order: 'towards_middle',
      slot: 'RW',
      rawCode: code,
    };
  }

  if (c === 'u' || c === 'ú' || c === 'fw' || c === 'cf') {
    return {
      positionLabel: 'Útočník (normální)',
      order: 'normal',
      slot: 'CFW',
      rawCode: code,
    };
  }
  if (c === 'ud' || c === 'úd') {
    return {
      positionLabel: 'Útočník (defenzivní)',
      order: 'defensive',
      slot: 'CFW',
      rawCode: code,
    };
  }
  if (c === 'unk' || c === 'uk' || c === 'úk') {
    return {
      positionLabel: 'Útočník (k lajně)',
      order: 'towards_wing',
      slot: 'RFW',
      rawCode: code,
    };
  }

  if (c === 'b' || c === 'br' || c === 'gk') {
    return {
      positionLabel: 'Brankář',
      order: 'normal',
      slot: 'GK',
      rawCode: code,
    };
  }

  return { positionLabel: code, order: 'normal', rawCode: code };
}

/**
 * Parsuje tabulkovou mřížku (2D pole řádků) z Excelu, CSV či Foxtrick exportu.
 */
export function parseHattrickTableGrid(grid: any[][]): Player[] {
  if (!grid || grid.length === 0) return [];

  let headerIdx = -1;
  const colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;
    const norm = row.map((cell) => normalizeText(String(cell)));
    const hasPlayer = norm.some(
      (c) => c === 'hrac' || c === 'player' || c === 'jmeno' || c === 'name'
    );
    const hasSkills = norm.some(
      (c) =>
        c === 'th' ||
        c === 'br' ||
        c === 'za' ||
        c === 'ch' ||
        c === 'tvorba' ||
        c === 'braneni'
    );
    if (hasPlayer && hasSkills) {
      headerIdx = r;
      norm.forEach((col, idx) => {
        if (col === 'hrac' || col === 'player' || col === 'jmeno' || col === 'name')
          colMap.name = idx;
        else if (col === 'id') colMap.id = idx;
        else if (col === 'nar' || col === 'country' || col === 'nationality')
          colMap.nat = idx;
        else if (col === 'sp' || col === 'specialita' || col === 'specialty')
          colMap.sp = idx;
        else if (col === 'stav' || col === 'status') colMap.status = idx;
        else if (col === 'vek' || col === 'age') colMap.age = idx;
        else if (col === 'tsi') colMap.tsi = idx;
        else if (col === 'vud' || col === 'leadership') colMap.vud = idx;
        else if (col === 'zk' || col === 'experience') colMap.zk = idx;
        else if (col === 'fo' || col === 'form' || col === 'forma') colMap.fo = idx;
        else if (col === 'kon' || col === 'stamina' || col === 'kondice')
          colMap.kon = idx;
        else if (col === 'odd' || col === 'loyalty' || col === 'vernost')
          colMap.odd = idx;
        else if (col === 'odch' || col === 'mother' || col === 'mc')
          colMap.odch = idx;
        else if ((col === 'ch' || col === 'brankar' || col === 'keeper') && colMap.ch === undefined)
          colMap.ch = idx;
        else if ((col === 'br' || col === 'braneni' || col === 'defending') && colMap.br === undefined)
          colMap.br = idx;
        else if ((col === 'th' || col === 'zaloha' || col === 'playmaking') && colMap.th === undefined)
          colMap.th = idx;
        else if ((col === 'kr' || col === 'kridlo' || col === 'winger') && colMap.kr === undefined)
          colMap.kr = idx;
        else if ((col === 'pr' || col === 'prihravky' || col === 'passing') && colMap.pr === undefined)
          colMap.pr = idx;
        else if ((col === 'za' || col === 'utok' || col === 'scoring') && colMap.za === undefined)
          colMap.za = idx;
        else if ((col === 'st' || col === 'standardky' || col === 'setpieces') && colMap.st === undefined)
          colMap.st = idx;
        else if (col === 'plat' || col === 'wage' || col === 'salary')
          colMap.plat = idx;
        else if (col === 'poz' || col === 'position') colMap.poz = idx;
        else if (col === 'nejp' || col === 'bestpos') colMap.nejp = idx;
      });
      break;
    }
  }

  // Fallback: Foxtrick 45-sloupcový export (pokud hlavička nebyla detekována podle názvů)
  if (headerIdx === -1) {
    for (let r = 0; r < Math.min(5, grid.length); r++) {
      const row = grid[r];
      if (Array.isArray(row) && row.length >= 20) {
        const cell = String(row[2] ?? '');
        if (/\d{6,11}/.test(cell)) {
          headerIdx = r - 1;
          colMap.nat = 1;
          colMap.name = 2;
          colMap.sp = 3;
          colMap.status = 4;
          colMap.age = 5;
          colMap.tsi = 7;
          colMap.vud = 8;
          colMap.zk = 9;
          colMap.fo = 10;
          colMap.kon = 11;
          colMap.odd = 12;
          colMap.odch = 13;
          colMap.ch = 14;
          colMap.br = 15;
          colMap.th = 16;
          colMap.kr = 17;
          colMap.pr = 18;
          colMap.za = 19;
          colMap.st = 20;
          colMap.poz = 25;
          colMap.plat = 26;
          colMap.nejp = row.length > 44 ? 44 : row.length - 1;
          break;
        }
      }
    }
  }

  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  const players: Player[] = [];

  for (let r = startIdx; r < grid.length; r++) {
    const row = grid[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rowStr = row.map((c) => String(c)).join(' ');
    if (
      normalizeText(rowStr).includes('kliknete pro vice') ||
      normalizeText(rowStr).includes('click for more')
    ) {
      continue;
    }

    const nameCell = String(row[colMap.name ?? 2] ?? '').trim();
    if (!nameCell || nameCell === '-' || nameCell === '–') continue;

    let name = nameCell;
    let id = 900000 + r + 1;
    const leadingIdMatch = nameCell.match(/^(\d{6,11})\s+(.*)$/);
    const trailingIdMatch = nameCell.match(/^(.*?)\s*\((\d{6,11})\)$/);
    if (leadingIdMatch) {
      id = parseInt(leadingIdMatch[1], 10);
      name = leadingIdMatch[2].trim();
    } else if (trailingIdMatch) {
      name = trailingIdMatch[1].trim();
      id = parseInt(trailingIdMatch[2], 10);
    } else if (colMap.id !== undefined && row[colMap.id]) {
      const parsedId = parseInt(String(row[colMap.id]), 10);
      if (!Number.isNaN(parsedId)) id = parsedId;
    }

    const ageRaw = row[colMap.age ?? 5];
    const { ageYears, ageDays } = parseAgeField(ageRaw);

    const nationality =
      colMap.nat !== undefined && row[colMap.nat]
        ? String(row[colMap.nat]).trim()
        : undefined;

    const spRaw = colMap.sp !== undefined ? row[colMap.sp] : '';
    const specialty = parseSpecialtyText(String(spRaw ?? ''));

    const statusRaw = colMap.status !== undefined ? row[colMap.status] : '';
    const { injuredWeeks, cards } = parseStatusField(statusRaw);

    const tsiRaw = colMap.tsi !== undefined ? row[colMap.tsi] : 1000;
    const tsi =
      typeof tsiRaw === 'number'
        ? Math.round(tsiRaw)
        : parseInt(String(tsiRaw).replace(/\D/g, ''), 10) || 1000;

    const platRaw = colMap.plat !== undefined ? row[colMap.plat] : 20000;
    let wage =
      typeof platRaw === 'number'
        ? Math.round(platRaw)
        : parseInt(String(platRaw).replace(/\D/g, ''), 10) || 20000;

    let chIdx = colMap.ch ?? 14;
    let brIdx = colMap.br ?? 15;
    let thIdx = colMap.th ?? 16;
    let krIdx = colMap.kr ?? 17;
    let prIdx = colMap.pr ?? 18;
    let zaIdx = colMap.za ?? 19;
    let stIdx = colMap.st ?? 20;

    // Pokud je ve sloupci pro chytání (Ch) text s měnou (Kč/týden, €/week...),
    // znamená to, že mezi Odch a Ch byl vložen sloupec se mzdou!
    const chCellStr = String(row[chIdx] ?? '');
    if (
      chCellStr.includes('Kč') ||
      chCellStr.includes('/týden') ||
      chCellStr.includes('€') ||
      chCellStr.includes('$') ||
      chCellStr.includes('kr/week')
    ) {
      const parsedWageFromCh = parseInt(chCellStr.replace(/\D/g, ''), 10);
      if (!Number.isNaN(parsedWageFromCh) && parsedWageFromCh > 0) {
        wage = parsedWageFromCh;
      }
      chIdx++;
      brIdx++;
      thIdx++;
      krIdx++;
      prIdx++;
      zaIdx++;
      stIdx++;
    }

    const getVal = (colKey: string, def = 5) => {
      const idx = colMap[colKey];
      if (idx === undefined || row[idx] == null || row[idx] === '') return def;
      return parseSkillValue(String(row[idx]), def);
    };

    const getSkillAt = (idx: number, def = 1) => {
      if (idx === undefined || row[idx] == null || row[idx] === '') return def;
      return parseSkillValue(String(row[idx]), def);
    };

    const leadership = Math.max(1, Math.min(8, getVal('vud', 4)));
    const experience = Math.max(1, Math.min(20, getVal('zk', 3)));
    const form = Math.max(1, Math.min(8, getVal('fo', 6)));
    const stamina = Math.max(1, Math.min(9, getVal('kon', 6)));
    const loyalty = Math.max(1, Math.min(20, getVal('odd', 12)));

    const odchCell =
      colMap.odch !== undefined ? String(row[colMap.odch] ?? '').trim() : '';
    const motherClubBonus =
      odchCell === '✔' ||
      odchCell === '✓' ||
      odchCell.toLowerCase() === 'ano' ||
      odchCell === '1';

    const keeper = Math.max(0, Math.min(20, getSkillAt(chIdx, 1)));
    const defending = Math.max(0, Math.min(20, getSkillAt(brIdx, 1)));
    const playmaking = Math.max(0, Math.min(20, getSkillAt(thIdx, 1)));
    const winger = Math.max(0, Math.min(20, getSkillAt(krIdx, 1)));
    const passing = Math.max(0, Math.min(20, getSkillAt(prIdx, 1)));
    const scoring = Math.max(0, Math.min(20, getSkillAt(zaIdx, 1)));
    const setPieces = Math.max(0, Math.min(20, getSkillAt(stIdx, 1)));

    let bestPosCell =
      colMap.nejp !== undefined && row[colMap.nejp]
        ? String(row[colMap.nejp]).trim()
        : '';

    // Pokud hodnota v nejP je číslo (např. 5.2 z hodnocení Útd) nebo je prázdná,
    // ale poslední sloupec v řádku obsahuje textový kód pozice, použijeme poslední sloupec
    if ((!bestPosCell || /^\d+(\.\d+)?$/.test(bestPosCell)) && row.length > 0) {
      const lastCell = String(row[row.length - 1] ?? '').trim();
      if (lastCell && !/^\d+(\.\d+)?$/.test(lastCell)) {
        bestPosCell = lastCell;
      }
    }
    const posCell =
      colMap.poz !== undefined && row[colMap.poz]
        ? String(row[colMap.poz]).trim()
        : '';
    const roleMapping = mapRoleCode(bestPosCell || posCell);

    const noteParts: string[] = [];
    if (nationality) noteParts.push(nationality);
    if (bestPosCell)
      noteParts.push(`NejP: ${bestPosCell} (${roleMapping.positionLabel})`);
    else if (posCell) noteParts.push(`Poz: ${posCell}`);

    players.push({
      id,
      name,
      number: players.length + 1,
      ageYears,
      ageDays,
      tsi,
      wage,
      injuredWeeks,
      cards,
      specialty,
      form,
      stamina,
      experience,
      leadership,
      loyalty,
      motherClubBonus,
      skills: {
        keeper,
        defending,
        playmaking,
        winger,
        passing,
        scoring,
        setPieces,
      },
      nationality,
      preferredPosition: bestPosCell || posCell || roleMapping.positionLabel,
      preferredOrder: roleMapping.order,
      preferredSlot: roleMapping.slot,
      notes: noteParts.join(' • '),
    });
  }

  return players;
}

/**
 * Parsuje textový CSV/TSV obsah (např. zkopírovaný z Excelu či Foxtricku).
 */
export function parseHattrickExcelText(text: string): Player[] {
  if (!text || !text.trim()) return [];
  try {
    const workbook = XLSX.read(text, { type: 'string' });
    if (workbook.SheetNames.length > 0) {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const grid: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });
      const players = parseHattrickTableGrid(grid);
      if (players.length > 0) return players;
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * Parsuje binární soubor Excelu (.xlsx, .xls, .csv, .ods, .tsv).
 */
export async function parseHattrickExcelFile(file: File): Promise<Player[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel soubor neobsahuje žádný list.');
  }

  // Projdeme listy a vezmeme první, který vrátí hráče
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    });
    const players = parseHattrickTableGrid(grid);
    if (players.length > 0) return players;
  }

  throw new Error(
    'V souboru nebyla nalezena data hráčů. Zkontroluj, zda obsahuje sloupce Hráč, Věk, TSI a dovednosti.'
  );
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
