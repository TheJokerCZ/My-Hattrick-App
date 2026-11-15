import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLUB_SETTINGS,
  DEFAULT_MATCH_CONTEXT,
  DEFAULT_OPPONENT,
  SAMPLE_SQUAD,
} from '../constants/sampleSquad';
import { optimizeLineup } from '../engine/lineupOptimizer';
import { calculateSectorGoalProb, simulateMatch } from '../engine/matchSimulator';
import { parseHattrickCopyPaste, parseHattrickPlayersXml } from '../engine/parsers';
import { calculateTeamRatings } from '../engine/ratingsEngine';
import {
  calculateWeeksToSkillUp,
  evaluateProspects,
  recommendTrainings,
} from '../engine/trainingAdvisor';
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
});
