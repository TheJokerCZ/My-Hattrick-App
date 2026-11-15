import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLUB_SETTINGS,
  DEFAULT_MATCH_CONTEXT,
  DEFAULT_OPPONENT,
  SAMPLE_SQUAD,
} from '../constants/sampleSquad';
import { optimizeLineup } from '../engine/lineupOptimizer';
import { calculateSectorGoalProb, simulateMatch } from '../engine/matchSimulator';
import {
  parseHattrickCopyPaste,
  parseHattrickExcelText,
  parseHattrickPlayersXml,
  parseHattrickTableGrid,
} from '../engine/parsers';
import { calculateTeamRatings } from '../engine/ratingsEngine';
import {
  calculateWeeksToSkillUp,
  evaluateProspects,
  recommendTrainings,
} from '../engine/trainingAdvisor';
import {
  analyzeOpponentMatches,
  convertAnalysisToOpponentProfile,
  SAMPLE_SCOUTED_MATCHES_SLAVOJ,
} from '../engine/scoutEngine';
import { LineupAssignment } from '../types/hattrick';

describe('Hattrick Ratings Engine', () => {
  const playersById = new Map(SAMPLE_SQUAD.map((p) => [p.id, p]));

  const baseAssignments: LineupAssignment[] = [
    { slotId: 'GK', playerId: 101, order: 'normal' },
    { slotId: 'RWB', playerId: 105, order: 'normal' },
    { slotId: 'CD', playerId: 103, order: 'normal' },
    { slotId: 'LWB', playerId: 104, order: 'normal' },
    { slotId: 'RW', playerId: 113, order: 'normal' },
    { slotId: 'RIM', playerId: 109, order: 'normal' },
    { slotId: 'CIM', playerId: 112, order: 'normal' },
    { slotId: 'LIM', playerId: 107, order: 'normal' },
    { slotId: 'LW', playerId: 114, order: 'normal' },
    { slotId: 'RFW', playerId: 116, order: 'normal' },
    { slotId: 'LFW', playerId: 117, order: 'normal' },
  ];

  it('správně reaguje na změnu individuálního pokynu záložníka (ofenzivní vs defenzivní)', () => {
    const normalRes = calculateTeamRatings(
      baseAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      DEFAULT_MATCH_CONTEXT,
      'normal',
      9
    );

    const offensiveAssignments = baseAssignments.map((a) =>
      a.slotId === 'CIM' ? { ...a, order: 'offensive' as const } : a
    );
    const offensiveRes = calculateTeamRatings(
      offensiveAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      DEFAULT_MATCH_CONTEXT,
      'normal',
      9
    );

    const defensiveAssignments = baseAssignments.map((a) =>
      a.slotId === 'CIM' ? { ...a, order: 'defensive' as const } : a
    );
    const defensiveRes = calculateTeamRatings(
      defensiveAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      DEFAULT_MATCH_CONTEXT,
      'normal',
      9
    );

    expect(offensiveRes.ratings.centerAtt).toBeGreaterThan(normalRes.ratings.centerAtt);
    expect(offensiveRes.ratings.centerDef).toBeLessThan(normalRes.ratings.centerDef);

    expect(defensiveRes.ratings.centerDef).toBeGreaterThan(normalRes.ratings.centerDef);
    expect(defensiveRes.ratings.centerAtt).toBeLessThan(normalRes.ratings.centerAtt);
  });

  it('zohledňuje domácí prostředí a přístup MOTS v záloze', () => {
    const homeRes = calculateTeamRatings(
      baseAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      { ...DEFAULT_MATCH_CONTEXT, venue: 'home', attitude: 'normal' },
      'normal',
      9
    );
    const awayRes = calculateTeamRatings(
      baseAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      { ...DEFAULT_MATCH_CONTEXT, venue: 'away', attitude: 'normal' },
      'normal',
      9
    );
    const motsRes = calculateTeamRatings(
      baseAssignments,
      playersById,
      DEFAULT_CLUB_SETTINGS,
      { ...DEFAULT_MATCH_CONTEXT, venue: 'home', attitude: 'mots' },
      'normal',
      9
    );

    expect(homeRes.ratings.midfield).toBeGreaterThan(awayRes.ratings.midfield);
    expect(motsRes.ratings.midfield).toBeGreaterThan(homeRes.ratings.midfield);
    expect(homeRes.hatStats).toBeGreaterThan(200);
  });
});

describe('Hattrick Match Simulator', () => {
  it('kubický vzorec při shodném útoku a obraně vrací ~42.5 %', () => {
    const p = calculateSectorGoalProb(8.0, 8.0);
    expect(p).toBeCloseTo(0.4253, 3);
    expect(calculateSectorGoalProb(12.0, 8.0)).toBeGreaterThan(0.7);
    expect(calculateSectorGoalProb(6.0, 10.0)).toBeLessThan(0.2);
  });

  it('součet pravděpodobností Výhra + Remíza + Prohra je 100 %', () => {
    const sim = simulateMatch({
      myRatings: DEFAULT_OPPONENT.ratings,
      myTactic: 'normal',
      myTacticLevel: 8,
      mySetPiecesAvg: 7,
      myPlayers: SAMPLE_SQUAD.slice(0, 11),
      opponent: DEFAULT_OPPONENT,
    });

    expect(sim.possessionMy).toBeCloseTo(50, 1);
    const total = sim.winProb + sim.drawProb + sim.lossProb;
    expect(total).toBeCloseTo(100, 0);
    expect(sim.expectedPoints).toBeGreaterThan(0);
    expect(sim.expectedPoints).toBeLessThanOrEqual(3);
  });
});

describe('Training Advisor & Prospect Engine', () => {
  it('identifikuje mladé talenty s vyšším Prospect Score než zkušené veterány', () => {
    const prospects = evaluateProspects(SAMPLE_SQUAD, DEFAULT_CLUB_SETTINGS);
    const youngTop = prospects.find((p) => p.player.id === 107); // 18 let Karabec
    const veteran = prospects.find((p) => p.player.id === 112); // 29 let Kuchta

    expect(youngTop).toBeDefined();
    expect(veteran).toBeDefined();
    expect(youngTop!.prospectScore).toBeGreaterThan(veteran!.prospectScore);
  });

  it('správně rozdělí ligové a přátelské sloty bez duplicit a respektuje věk u rychlosti tréninku', () => {
    const recs = recommendTrainings(SAMPLE_SQUAD, DEFAULT_CLUB_SETTINGS);
    expect(recs.length).toBeGreaterThanOrEqual(7);

    const pmRec = recs.find((r) => r.trainingType === 'playmaking')!;
    const leagueIds = new Set(pmRec.leagueSlots100.map((p) => p.id));
    const overlap = pmRec.friendlySlots100.filter((p) => leagueIds.has(p.id));
    expect(overlap.length).toBe(0);

    const young = SAMPLE_SQUAD.find((p) => p.id === 108)!; // 17 let
    const older = SAMPLE_SQUAD.find((p) => p.id === 112)!; // 29 let
    expect(
      calculateWeeksToSkillUp(young, 'playmaking', DEFAULT_CLUB_SETTINGS)
    ).toBeLessThan(
      calculateWeeksToSkillUp(older, 'playmaking', DEFAULT_CLUB_SETTINGS)
    );
  });
});

describe('Lineup Optimizer', () => {
  it('navrhne platné rozestavení s 11 unikátními zdravými hráči a respektuje tréninkový zámek', () => {
    const results = optimizeLineup({
      players: SAMPLE_SQUAD,
      club: DEFAULT_CLUB_SETTINGS, // trainingType = playmaking, locked = [107, 108, 109]
      context: DEFAULT_MATCH_CONTEXT,
      opponent: DEFAULT_OPPONENT,
      objective: 'win_probability',
      respectTraining: true,
    });

    expect(results.length).toBeGreaterThan(0);
    const best = results[0];
    expect(best.assignments.length).toBe(11);

    const uniqueIds = new Set(best.assignments.map((a) => a.playerId));
    expect(uniqueIds.size).toBe(11);

    // Zraněný hráč (id 122, injuredWeeks: 2) nesmí být v sestavě
    expect(uniqueIds.has(122)).toBe(false);

    // Kapitán a exekutor SP musí být mezi vybranými 11 hráči
    expect(uniqueIds.has(best.captainId!)).toBe(true);
    expect(uniqueIds.has(best.setPiecesTakerId!)).toBe(true);

    // Při tréninku Tvorby hry a zámku [107, 108, 109] musí být tito 3 hráči na postech RIM/CIM/LIM
    const imSlots = best.assignments
      .filter((a) => a.slotId === 'RIM' || a.slotId === 'CIM' || a.slotId === 'LIM')
      .map((a) => a.playerId);
    expect(imSlots).toContain(107);
    expect(imSlots).toContain(108);
    expect(imSlots).toContain(109);
  });
});

describe('Hattrick Parsers (Copy-Paste & XML)', () => {
  it('správně parsuje český copy-paste včetně rozdílu dobrý (7) vs solidní (8)', () => {
    const czSample = `
10. Adam Karabec (44556677)
18 let a 24 dní
Ve formě dobrá, v kondici dobrá
Zkušenosti má špatné a vůdcovské schopnosti slabé.
Věrnost je nadpřirozená (14) (+).
Specialita: Technik
TSI: 5 800
Brankář: 1/20 mizerný
Bránění: 5/20 nedostatečný
Tvorba hry: vynikající
Křídlo: nedostatečný
Přihrávky: solidní
Zakončování: slabý
Standardní situace: nedostatečný
`;
    const players = parseHattrickCopyPaste(czSample);
    expect(players.length).toBe(1);
    const p = players[0];
    expect(p.id).toBe(44556677);
    expect(p.name).toBe('Adam Karabec');
    expect(p.ageYears).toBe(18);
    expect(p.ageDays).toBe(24);
    expect(p.specialty).toBe('Technical');
    expect(p.motherClubBonus).toBe(true);
    expect(p.form).toBe(7); // dobrá
    expect(p.stamina).toBe(7); // dobrá
    expect(p.skills.playmaking).toBe(9); // vynikající
    expect(p.skills.passing).toBe(8); // solidní (CZ = 8, nikoliv EN solid = 7!)
  });

  it('správně parsuje oficiální Hattrick XML', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<HattrickData>
  <Team>
    <PlayerList>
      <Player>
        <PlayerID>777888</PlayerID>
        <FirstName>Petr</FirstName>
        <LastName>Čech</LastName>
        <PlayerNumber>1</PlayerNumber>
        <Age>19</Age>
        <AgeDays>15</AgeDays>
        <TSI>4500</TSI>
        <Salary>22000</Salary>
        <PlayerForm>7</PlayerForm>
        <StaminaSkill>8</StaminaSkill>
        <Experience>3</Experience>
        <Leadership>5</Leadership>
        <Loyalty>15</Loyalty>
        <MotherClubBonus>True</MotherClubBonus>
        <Specialty>5</Specialty>
        <InjuryLevel>-1</InjuryLevel>
        <Cards>0</Cards>
        <KeeperSkill>9</KeeperSkill>
        <DefenderSkill>4</DefenderSkill>
        <PlaymakerSkill>1</PlaymakerSkill>
        <WingerSkill>1</WingerSkill>
        <PassingSkill>2</PassingSkill>
        <ScorerSkill>1</ScorerSkill>
        <SetPiecesSkill>7</SetPiecesSkill>
      </Player>
    </PlayerList>
  </Team>
</HattrickData>`;

    const players = parseHattrickPlayersXml(xml);
    expect(players.length).toBe(1);
    expect(players[0].id).toBe(777888);
    expect(players[0].name).toBe('Petr Čech');
    expect(players[0].specialty).toBe('Head');
    expect(players[0].motherClubBonus).toBe(true);
    expect(players[0].injuredWeeks).toBe(-1);
    expect(players[0].skills.keeper).toBe(9);
  });

  it('správně parsuje Foxtrick Excel export (45 sloupců včetně NejP, věku s daty a specialit)', () => {
    const csv = `-,Nár,Hráč,Sp,Stav,Věk,Přišel,TSI,Vůd,Zk,Fo,Kon,Odd,Odch,Ch,Br,TH,Kř,Př,Za,St,Psico,PsicoW,Posl,Hv,Poz,Plat,Z. plat,W++,MC,GL,GPo,GC,G,HT,Por,HV,Br,KO,SO,KZ,SZ,Ú,Útd,NejP
,Česko,"484196163 Petr Janda",,,2026-10-19,30.08.2025,"2 040",chabý (2),neexistující (0),dobrá (7),přijatelná (6),božská (20),ne,"18 840 Kč/týden",katastrofální (1),solidní (8),chabý (2),slabé (4),slabé (4),chabý (2),nedostatečné (4),0,0,0,0,SZ,"18 840 Kč",,"393 000 Kč",,383,23.9,0.3,1.4,19.3,2,6.5,,5.7,5.5,6.1,6.5,5.1,5.2,SZ
,Česko,"483664797 Vojtěch Hrstka",,,2026-10-28,09.08.2025,"1 180",slabý (3),neexistující (0),dobrá (7),nedostatečná (5),božská (20),ne,"14 040 Kč/týden",katastrofální (1),solidní (8),chabý (2),chabý (2),nedostatečné (5),chabý (2),katastrofální (1),0,0,0,0,SO,"14 040 Kč",,"145 000 Kč",,344,24.6,0.3,1.6,20.4,1,6.3,,5.6,6.3,5.6,5.6,4.6,5.4,SO
,Česko,"460481191 Stanislav Šilhavý",Silový,ŽK×1,33.3,17.06.2023,"1 400",slabý (3),přijatelná (6),solidní (8),nedostatečná (5),božská (20),ne,"28 320 Kč/týden",katastrofální (1),přijatelné (6),chabý (2),chabý (2),solidní (8),slabé (4),katastrofální (1),0,0,0,0,KO,"28 320 Kč",,"16 000 Kč",,375,25.0,0.5,1.7,21.6,3,6.0,,6.0,5.7,5.7,5.4,4.7,5.3,KOd
,Česko,"478988636 Petr Krob",Rychlý,Por,20.94,22.06.2024,"3 280",nedostatečný (4),bídná (1),solidní (8),přijatelná (6),božská (20),ne,"22 560 Kč/týden",katastrofální (1),nedostatečné (5),nedostatečné (5),přijatelné (6),přijatelné (6),přijatelné (6),katastrofální (1),0,0,0,0,KZ,"22 560 Kč",,"318 000 Kč",,404,23.8,0.7,2.2,21.0,4,6.2,,5.8,5.4,6.2,5.9,5.7,5.7,Ko
,Česko,"467978253 Michal Jůza",Nepředvídatelný,,26.96,18.05.2024,"1 090",nedostatečný (4),nedostatečné (4),dobrá (7),přijatelná (6),božská (20),ne,"16 440 Kč/týden",katastrofální (1),slabé (4),chabý (2),chabý (2),chabý (2),výborné (9),chabý (2),0,0,0,0,Ú,"16 440 Kč",,"117 000 Kč",,332,23.7,0.4,1.8,21.9,1,5.6,,4.1,4.4,4.2,4.4,5.6,5.3,Únk
,,,Klikněte pro více informací,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;

    const players = parseHattrickExcelText(csv);
    expect(players.length).toBe(5);

    // 1. Petr Janda
    expect(players[0].id).toBe(484196163);
    expect(players[0].name).toBe('Petr Janda');
    expect(players[0].nationality).toBe('Česko');
    expect(players[0].ageYears).toBe(19);
    expect(players[0].ageDays).toBe(10);
    expect(players[0].tsi).toBe(2040);
    expect(players[0].skills.defending).toBe(8);
    expect(players[0].preferredPosition).toBe('SZ');
    expect(players[0].preferredSlot).toBe('CIM');

    // 2. Vojtěch Hrstka
    expect(players[1].id).toBe(483664797);
    expect(players[1].name).toBe('Vojtěch Hrstka');
    expect(players[1].ageYears).toBe(28);
    expect(players[1].ageDays).toBe(10);
    expect(players[1].skills.defending).toBe(8);
    expect(players[1].skills.passing).toBe(5);
    expect(players[1].preferredPosition).toBe('SO');
    expect(players[1].preferredSlot).toBe('CD');

    // 3. Stanislav Šilhavý
    expect(players[2].id).toBe(460481191);
    expect(players[2].name).toBe('Stanislav Šilhavý');
    expect(players[2].specialty).toBe('Powerful');
    expect(players[2].cards).toBe(1);
    expect(players[2].ageYears).toBe(33);
    expect(players[2].ageDays).toBe(30);
    expect(players[2].skills.passing).toBe(8);
    expect(players[2].preferredPosition).toBe('KOd');
    expect(players[2].preferredSlot).toBe('RWB');
    expect(players[2].preferredOrder).toBe('defensive');

    // 4. Petr Krob (zraněný - náplast)
    expect(players[3].id).toBe(478988636);
    expect(players[3].name).toBe('Petr Krob');
    expect(players[3].specialty).toBe('Quick');
    expect(players[3].injuredWeeks).toBe(-1);
    expect(players[3].preferredPosition).toBe('Ko');
    expect(players[3].preferredSlot).toBe('RWB');
    expect(players[3].preferredOrder).toBe('offensive');

    // 5. Michal Jůza (Nepředvídatelný, Únk)
    expect(players[4].id).toBe(467978253);
    expect(players[4].name).toBe('Michal Jůza');
    expect(players[4].specialty).toBe('Unpredictable');
    expect(players[4].skills.scoring).toBe(9);
    expect(players[4].preferredPosition).toBe('Únk');
    expect(players[4].preferredSlot).toBe('RFW');
    expect(players[4].preferredOrder).toBe('towards_wing');
  });

  it('správně parsuje strukturu z Excel souboru soupiska_15.11.26.xlsx včetně serial date věku', () => {
    const grid = [
      [
        '-', 'Nár', 'Hráč', 'Sp', 'Stav', 'Věk', 'Přišel', 'TSI',
        'Vůd', 'Zk', 'Fo', 'Kon', 'Odd', 'Odch', 'Ch', 'Br',
        'TH', 'Kř', 'Př', 'Za', 'St', 'Psico', 'PsicoW', 'Posl',
        'Hv', 'Poz', 'Plat', 'Z. plat', 'W++', 'MC', 'GL', 'GPo',
        'GC', 'G', 'HT', 'Por', 'HV', 'Br', 'KO', 'SO',
        'KZ', 'SZ', 'Ú', 'Útd', 'NejP'
      ],
      [
        '–', 'Italy', 'Diego Rengo (513516658)', 'Technický', null, '18.45',
        '1 s 1 týd. 6 d', 5050, 3, 2, 4, 6, 12, null, 1, 8,
        5, 8, 6, 3, 1, 878, null, 46337, 46145, 'SO', 33120, 27600,
        '✔', 15, 0, 0, 2, 2, 0, -513516658, -513516658, 24504, 19115,
        44682, 30042, 45017, 28550, 46146, 'KOd'
      ],
      [
        '–', 'Lithuania', 'Aleksys Liubšys (511482584)', null, null, 46314,
        '1 s 2 týd. 5 d', 2760, 4, 1, 4, 5, 12, null, 1, 9,
        6, 3, 5, 2, 1, 638, null, 46337, 46271, 'SO', 27840, 23200,
        '✔', 15, 0, 0, 2, 2, 0, -511482584, -511482584, 21858, 17056,
        45048, 26978, 44747, 25488, 46272, 'SO'
      ]
    ];

    const players = parseHattrickTableGrid(grid);
    expect(players.length).toBe(2);

    // Diego Rengo
    const p1 = players[0];
    expect(p1.id).toBe(513516658);
    expect(p1.name).toBe('Diego Rengo');
    expect(p1.nationality).toBe('Italy');
    expect(p1.specialty).toBe('Technical');
    expect(p1.ageYears).toBe(18);
    expect(p1.ageDays).toBe(45);
    expect(p1.tsi).toBe(5050);
    expect(p1.skills.keeper).toBe(1);
    expect(p1.skills.defending).toBe(8);
    expect(p1.skills.playmaking).toBe(5);
    expect(p1.skills.winger).toBe(8);
    expect(p1.skills.passing).toBe(6);
    expect(p1.skills.scoring).toBe(3);
    expect(p1.skills.setPieces).toBe(1);
    expect(p1.preferredPosition).toBe('KOd');
    expect(p1.preferredSlot).toBe('RWB');
    expect(p1.preferredOrder).toBe('defensive');

    // Aleksys Liubšys (Excel serial 46314 -> 19.10 -> 19 let, 10 dní)
    const p2 = players[1];
    expect(p2.id).toBe(511482584);
    expect(p2.name).toBe('Aleksys Liubšys');
    expect(p2.nationality).toBe('Lithuania');
    expect(p2.ageYears).toBe(19);
    expect(p2.ageDays).toBe(10);
    expect(p2.skills.defending).toBe(9);
    expect(p2.skills.playmaking).toBe(6);
    expect(p2.preferredPosition).toBe('SO');
    expect(p2.preferredSlot).toBe('CD');
    expect(p2.preferredOrder).toBe('normal');
  });

  it('správně analyzuje zápasy soupeře, detekuje slabiny na krajích a sestaví OpponentProfile', () => {
    const analysis = analyzeOpponentMatches(
      SAMPLE_SCOUTED_MATCHES_SLAVOJ,
      'FC Slavoj Pelhřimov'
    );

    expect(analysis.teamName).toBe('FC Slavoj Pelhřimov');
    expect(analysis.matches.length).toBe(5);
    expect(analysis.predictedFormation).toBe('3-5-2');
    expect(analysis.predictedTactic).toBe('aim');
    expect(analysis.weaknesses.length).toBeGreaterThan(0);
    expect(analysis.tacticalAdvice.length).toBeGreaterThan(0);

    // Ověříme, že analýza identifikovala děravé kraje obrany (Pravá obrana kolem 5.x vs Střed 8.8+)
    const flankWeakness = analysis.weaknesses.some((w) =>
      w.toLowerCase().includes('kraje obrany')
    );
    expect(flankWeakness).toBe(true);

    // Ověříme pokles zálohy venku
    expect(analysis.avgRatingsHome.midfield).toBeGreaterThan(
      analysis.avgRatingsAway.midfield
    );

    // Převod na OpponentProfile
    const profileWhenWePlayHome = convertAnalysisToOpponentProfile(analysis, true);
    expect(profileWhenWePlayHome.name).toBe('FC Slavoj Pelhřimov');
    expect(profileWhenWePlayHome.tactic).toBe('aim');
    // Když hrajeme my doma, soupeř hraje venku (použijí se avgRatingsAway)
    expect(profileWhenWePlayHome.ratings.midfield).toBe(analysis.avgRatingsAway.midfield);
  });
});
