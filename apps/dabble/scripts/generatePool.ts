/**
 * Dabble Pool Generation Script
 *
 * Generates a pool of puzzles for the archive system.
 * Each puzzle includes the board, letters, and debug info.
 *
 * Usage: npx tsx scripts/generatePool.ts [count]
 *   count: Number of puzzles to generate (default: 365)
 *
 * Output: public/puzzles/pool.json
 */

import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';

// Import game config constants
const BOARD_SIZE = 9;
const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const LETTER_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4,
  M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1,
  Y: 2, Z: 1,
};
const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
  Y: 4, Z: 10,
};
const BOARD_ARCHETYPES = ['classic', 'corridor', 'islands', 'diagonal', 'scattered', 'open'] as const;
type BoardArchetype = typeof BOARD_ARCHETYPES[number];
type BonusType = 'DL' | 'TL' | 'DW' | 'TW' | 'START' | null;

interface Cell {
  row: number;
  col: number;
  bonus: BonusType;
  isPlayable: boolean;
  letter: string | null;
  isLocked: boolean;
}

interface GameBoard {
  cells: Cell[][];
  size: number;
}

// Common word lists for validation
const COMMON_2_LETTER_WORDS = ['AN', 'AS', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE'];
const COMMON_3_LETTER_WORDS = ['ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARE', 'ARK', 'ARM', 'ART', 'ASK', 'ATE', 'AWE', 'AXE', 'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED', 'BIG', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUS', 'BUT', 'BUY', 'CAB', 'CAN', 'CAP', 'CAR', 'CAT', 'COW', 'CRY', 'CUP', 'CUT', 'DAD', 'DAM', 'DAY', 'DID', 'DIE', 'DIG', 'DOC', 'DOG', 'DOT', 'DRY', 'DUE', 'DUG', 'EAR', 'EAT', 'EGG', 'END', 'ERA', 'EVE', 'EYE', 'FAN', 'FAR', 'FAT', 'FED', 'FEE', 'FEW', 'FIG', 'FIN', 'FIT', 'FLY', 'FOG', 'FOR', 'FOX', 'FUN', 'FUR', 'GAP', 'GAS', 'GAY', 'GET', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'HAD', 'HAM', 'HAS', 'HAT', 'HER', 'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOG', 'HOP', 'HOT', 'HOW', 'HUG', 'ICE', 'ILL', 'INK', 'INN', 'JAM', 'JAR', 'JAW', 'JET', 'JOB', 'JOG', 'JOY', 'JUG', 'KID', 'KIT', 'LAB', 'LAP', 'LAW', 'LAY', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'MAD', 'MAN', 'MAP', 'MAT', 'MAY', 'MEN', 'MET', 'MIX', 'MOB', 'MOM', 'MUD', 'MUG', 'NAP', 'NET', 'NEW', 'NIT', 'NOD', 'NOR', 'NOT', 'NOW', 'NUN', 'NUT', 'OAK', 'OAR', 'OAT', 'ODD', 'OFF', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'ORE', 'OUR', 'OUT', 'OWE', 'OWL', 'OWN', 'PAD', 'PAN', 'PAT', 'PAW', 'PAY', 'PEA', 'PEN', 'PET', 'PIE', 'PIG', 'PIN', 'PIT', 'POP', 'POT', 'PUT', 'RAG', 'RAN', 'RAT', 'RAW', 'RAY', 'RED', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUN', 'RUT', 'SAD', 'SAP', 'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY', 'STY', 'SUB', 'SUM', 'SUN', 'TAB', 'TAG', 'TAN', 'TAP', 'TAR', 'TAX', 'TEA', 'TEN', 'THE', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'TWO', 'URN', 'USE', 'VAN', 'VAT', 'VET', 'VIA', 'VOW', 'WAD', 'WAR', 'WAS', 'WAX', 'WAY', 'WEB', 'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW', 'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YEW', 'YIN', 'YOU', 'ZAP', 'ZEN', 'ZIP', 'ZIT', 'ZOO'];
const COMMON_LONG_WORDS = ['ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ADAPT', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLEY', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMOR', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWAKE', 'AWARD', 'AWARE', 'BASIC', 'BASIN', 'BASIS', 'BEACH', 'BEAST', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BIBLE', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEND', 'BLESS', 'BLIND', 'BLOCK', 'BLOOD', 'BOARD', 'BONUS', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRICK', 'BRIDE', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BRUSH', 'BUILD', 'BUNCH', 'BURST', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CHUNK', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'CLOUD', 'COACH', 'COAST', 'COLOR', 'COUNT', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRASH', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CURVE', 'CYCLE', 'DAILY', 'DANCE', 'DEALT', 'DEATH', 'DELAY', 'DELTA', 'DEPTH', 'DIRTY', 'DOUBT', 'DOZEN', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'DROWN', 'DROVE', 'DYING', 'EAGER', 'EARLY', 'EARTH', 'EATEN', 'EATER', 'EIGHT', 'ELECT', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FANCY', 'FAULT', 'FAVOR', 'FEAST', 'FIBER', 'FIELD', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAME', 'FLASH', 'FLEET', 'FLESH', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR', 'FLOWN', 'FLUID', 'FOCUS', 'FORCE', 'FORGE', 'FORTH', 'FORTY', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FROST', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE', 'GLORY', 'GOING', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRASP', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GREET', 'GRIEF', 'GROUP', 'GROVE', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILT', 'HAPPY', 'HEARD', 'HEART', 'HEAVY', 'HELLO', 'HENCE', 'HORSE', 'HOTEL', 'HOURS', 'HOUSE', 'HUMAN', 'HUMOR', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'INTRO', 'ISSUE', 'JAPAN', 'JOINT', 'JUDGE', 'JUICE', 'KNIFE', 'KNOCK', 'KNOWN', 'LABEL', 'LABOR', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LEVER', 'LIGHT', 'LIMIT', 'LIVED', 'LIVER', 'LIVES', 'LOCAL', 'LODGE', 'LOGIC', 'LOOSE', 'LORRY', 'LOSES', 'LOTUS', 'LOVED', 'LOVER', 'LOWER', 'LOYAL', 'LUCKY', 'LUNCH', 'LYING', 'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MARRY', 'MATCH', 'MAYBE', 'MAYOR', 'MEANT', 'MEDAL', 'MEDIA', 'MERCY', 'MERGE', 'MERIT', 'MERRY', 'METAL', 'METER', 'MIGHT', 'MINOR', 'MINUS', 'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NAKED', 'NAVAL', 'NERVE', 'NEVER', 'NEWLY', 'NIGHT', 'NINTH', 'NOBLE', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN', 'OLIVE', 'ORDER', 'OTHER', 'OUGHT', 'OUTER', 'OWNER', 'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTA', 'PATCH', 'PAUSE', 'PEACE', 'PENNY', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PIZZA', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'POINT', 'POLAR', 'PORCH', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'PULSE', 'PUNCH', 'PUPIL', 'QUEEN', 'QUEST', 'QUICK', 'QUIET', 'QUITE', 'QUOTA', 'QUOTE', 'RADAR', 'RADIO', 'RAISE', 'RANCH', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'REACT', 'READY', 'REALM', 'REBEL', 'REFER', 'RELAX', 'REPLY', 'RIDER', 'RIDGE', 'RIFLE', 'RIGHT', 'RIGID', 'RISEN', 'RISKY', 'RIVAL', 'RIVER', 'ROBOT', 'ROCKY', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RUGBY', 'RULED', 'RULER', 'RURAL', 'SADLY', 'SAINT', 'SALAD', 'SALES', 'SANDY', 'SATIN', 'SAUCE', 'SAVED', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SCREW', 'SENSE', 'SERVE', 'SETUP', 'SEVEN', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHOOT', 'SHORE', 'SHORT', 'SHOUT', 'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SKULL', 'SLASH', 'SLATE', 'SLAVE', 'SLEEP', 'SLICE', 'SLIDE', 'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMOKE', 'SNAKE', 'SOLAR', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPEAK', 'SPEED', 'SPELL', 'SPEND', 'SPENT', 'SPITE', 'SPLIT', 'SPOKE', 'SPORT', 'SPOTS', 'SPRAY', 'SQUAD', 'STACK', 'STAFF', 'STAGE', 'STAKE', 'STAMP', 'STAND', 'STARK', 'START', 'STATE', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUPER', 'SWEET', 'SWEPT', 'SWING', 'SWORD', 'TABLE', 'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'TEMPO', 'TENDS', 'TENTH', 'TERMS', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THIEF', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGHT', 'TIRED', 'TITLE', 'TODAY', 'TOKEN', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWER', 'TRACE', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRASH', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TUMOR', 'TWICE', 'TWIST', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'URBAN', 'URGED', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRAL', 'VIRUS', 'VISIT', 'VITAL', 'VOCAL', 'VOICE', 'VOTED', 'VOTER', 'WAGON', 'WAIST', 'WATCH', 'WATER', 'WEIGH', 'WEIRD', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WIDER', 'WIDOW', 'WIDTH', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOURS', 'YOUTH'];
const DIFFICULT_LETTERS = ['Q', 'X', 'Z', 'J', 'K'];
const DIFFICULT_LETTER_RULES: Record<string, { requires: string[] }> = {
  Q: { requires: ['U'] },
};

const BOARD_CONFIG = {
  minPlayablePercent: 0.55,
  maxPlayablePercent: 0.75,
  bonusCounts: { TW: 2, DW: 4, TL: 4, DL: 6 },
};

const LETTER_CONSTRAINTS = {
  totalLetters: 12,
  minVowels: 3,
  maxVowels: 5,
  minUniqueLetters: 8,
  maxDuplicatesPerLetter: 2,
};

const BOARD_SYMMETRY = {
  centerProtectionRadius: 2,
};

const BONUS_PLACEMENT: Record<string, { minDistFromCenter: number; edgePreference: number; allowAdjacent: boolean }> = {
  TW: { minDistFromCenter: 4, edgePreference: 0.9, allowAdjacent: false },
  DW: { minDistFromCenter: 2, edgePreference: 0.6, allowAdjacent: false },
  TL: { minDistFromCenter: 3, edgePreference: 0.7, allowAdjacent: true },
  DL: { minDistFromCenter: 1, edgePreference: 0.3, allowAdjacent: true },
};

interface DabblePoolPuzzle {
  id: string;
  board: GameBoard;
  letters: string[];
  archetype: BoardArchetype;
  debug: {
    letterDistribution: { vowels: number; consonants: number };
    boardArchetype: BoardArchetype;
    highValueLetters: string[];
    estimatedDifficulty: 'easy' | 'medium' | 'hard';
    playableCells: number;
    totalBonuses: number;
  };
}

interface PoolFile {
  generatedAt: string;
  puzzles: DabblePoolPuzzle[];
}

// Helper functions
function createRng(seed: string): () => number {
  return seedrandom(seed);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(rng: () => number, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function getNeighbors(row: number, col: number, size: number): [number, number][] {
  const neighbors: [number, number][] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc, size)) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

function getRotatedPosition(r: number, c: number, size: number): [number, number] {
  return [size - 1 - r, size - 1 - c];
}

function isInFirstHalf(r: number, c: number, size: number): boolean {
  const center = Math.floor(size / 2);
  return r < center || (r === center && c < center);
}

function distFromCenter(r: number, c: number, size: number): number {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  return Math.abs(r - centerR) + Math.abs(c - centerC);
}

function ensureConnectivity(playable: boolean[][], size: number): void {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  const visited: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  const queue: [number, number][] = [[centerR, centerC]];
  visited[centerR][centerC] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (playable[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (playable[r][c] && !visited[r][c]) {
        playable[r][c] = false;
        const [mr, mc] = getRotatedPosition(r, c, size);
        if (mr !== r || mc !== c) {
          playable[mr][mc] = false;
        }
      }
    }
  }
}

// Board generation (simplified - using classic pattern)
function generateBoardShape(rng: () => number, size: number): { playable: boolean[][]; archetype: BoardArchetype } {
  const archetypeIndex = Math.floor(rng() * BOARD_ARCHETYPES.length);
  const archetype = BOARD_ARCHETYPES[archetypeIndex];

  const playable: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(true));
  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;

  // Simple corner cutoffs for all archetypes
  const cornerSize = randInt(rng, 1, 2);
  for (let r = 0; r < cornerSize; r++) {
    for (let c = 0; c < cornerSize - r; c++) {
      playable[r][c] = false;
      playable[r][size - 1 - c] = false;
      playable[size - 1 - r][c] = false;
      playable[size - 1 - r][size - 1 - c] = false;
    }
  }

  // Add some random dead spaces based on archetype
  const numDead = archetype === 'open' ? 0 : randInt(rng, 2, 6);
  const candidates: [number, number][] = [];
  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      if (isInFirstHalf(r, c, size) && distFromCenter(r, c, size) >= protectionRadius && playable[r][c]) {
        candidates.push([r, c]);
      }
    }
  }

  const shuffled = shuffle(rng, candidates);
  for (let i = 0; i < Math.min(numDead, shuffled.length); i++) {
    const [r, c] = shuffled[i];
    if (playable[r][c]) {
      playable[r][c] = false;
      const [mr, mc] = getRotatedPosition(r, c, size);
      if (mr !== r || mc !== c) {
        playable[mr][mc] = false;
      }
    }
  }

  ensureConnectivity(playable, size);
  return { playable, archetype };
}

function hasAdjacentBonus(r: number, c: number, bonuses: BonusType[][], size: number): boolean {
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (bonuses[nr][nc] !== null) return true;
  }
  return false;
}

function placeBonuses(rng: () => number, playable: boolean[][], size: number): BonusType[][] {
  const bonuses: BonusType[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  bonuses[centerR][centerC] = 'START';

  const bonusTypes: ('TW' | 'DW' | 'TL' | 'DL')[] = ['TW', 'DW', 'TL', 'DL'];

  for (const bonusType of bonusTypes) {
    const config = BONUS_PLACEMENT[bonusType];
    const count = BOARD_CONFIG.bonusCounts[bonusType];

    const candidates: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!playable[r][c]) continue;
        if (r === centerR && c === centerC) continue;
        if (bonuses[r][c] !== null) continue;
        if (distFromCenter(r, c, size) < config.minDistFromCenter) continue;
        if (!config.allowAdjacent && hasAdjacentBonus(r, c, bonuses, size)) continue;
        candidates.push([r, c]);
      }
    }

    const shuffled = shuffle(rng, candidates);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      const [r, c] = shuffled[i];
      bonuses[r][c] = bonusType;
    }
  }

  return bonuses;
}

function sortLetters(letters: string[]): string[] {
  const vowels = letters.filter(l => VOWELS.includes(l)).sort();
  const consonants = letters.filter(l => !VOWELS.includes(l)).sort();
  return [...vowels, ...consonants];
}

function canFormWord(letters: string[], word: string): boolean {
  const available = [...letters];
  for (const char of word) {
    const idx = available.indexOf(char);
    if (idx === -1) return false;
    available.splice(idx, 1);
  }
  return true;
}

function countFormableWords(letters: string[], wordList: string[]): number {
  return wordList.filter(word => canFormWord(letters, word)).length;
}

function isPlayable(letters: string[]): boolean {
  const twoLetterCount = countFormableWords(letters, COMMON_2_LETTER_WORDS);
  const threeLetterCount = countFormableWords(letters, COMMON_3_LETTER_WORDS);
  return twoLetterCount >= 3 && threeLetterCount >= 2;
}

function canFormAnyLongWord(letters: string[]): boolean {
  return COMMON_LONG_WORDS.some(word => canFormWord(letters, word));
}

function meetsDifficultLetterRules(letters: string[]): boolean {
  const difficultCount = letters.filter(l => DIFFICULT_LETTERS.includes(l)).length;
  if (difficultCount > 1) return false;

  for (const letter of letters) {
    const rules = DIFFICULT_LETTER_RULES[letter];
    if (rules && rules.requires.length > 0) {
      for (const required of rules.requires) {
        if (!letters.includes(required)) {
          return false;
        }
      }
    }
  }

  return true;
}

function meetsConstraints(letters: string[]): boolean {
  const { minVowels, maxVowels, minUniqueLetters, maxDuplicatesPerLetter, totalLetters } = LETTER_CONSTRAINTS;

  if (letters.length !== totalLetters) return false;

  const vowelCount = letters.filter(l => VOWELS.includes(l)).length;
  if (vowelCount < minVowels || vowelCount > maxVowels) return false;

  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < minUniqueLetters) return false;

  const letterCounts = new Map<string, number>();
  for (const letter of letters) {
    const count = (letterCounts.get(letter) || 0) + 1;
    if (count > maxDuplicatesPerLetter) return false;
    letterCounts.set(letter, count);
  }

  return true;
}

function generateLetters(rng: () => number): string[] {
  const { totalLetters, minVowels, maxVowels, maxDuplicatesPerLetter } = LETTER_CONSTRAINTS;

  const vowelPool: string[] = [];
  const consonantPool: string[] = [];

  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    const pool = VOWELS.includes(letter) ? vowelPool : consonantPool;
    for (let i = 0; i < count; i++) {
      pool.push(letter);
    }
  }

  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledVowels = shuffle(rng, [...vowelPool]);
    const shuffledConsonants = shuffle(rng, [...consonantPool]);

    const drawn: string[] = [];
    const letterCounts = new Map<string, number>();

    const targetVowels = randInt(rng, minVowels, maxVowels);
    const targetConsonants = totalLetters - targetVowels;

    let vowelIdx = 0;
    while (drawn.filter(l => VOWELS.includes(l)).length < targetVowels && vowelIdx < shuffledVowels.length) {
      const letter = shuffledVowels[vowelIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    let consonantIdx = 0;
    while (drawn.filter(l => !VOWELS.includes(l)).length < targetConsonants && consonantIdx < shuffledConsonants.length) {
      const letter = shuffledConsonants[consonantIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    const allRemaining = shuffle(rng, [...shuffledVowels.slice(vowelIdx), ...shuffledConsonants.slice(consonantIdx)]);
    let remainingIdx = 0;
    while (drawn.length < totalLetters && remainingIdx < allRemaining.length) {
      const letter = allRemaining[remainingIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    if (!meetsConstraints(drawn)) continue;
    if (!meetsDifficultLetterRules(drawn)) continue;
    if (!isPlayable(drawn)) continue;
    if (!canFormAnyLongWord(drawn)) continue;

    return sortLetters(drawn);
  }

  // Fallback
  const fallbackSets = [
    ['A', 'E', 'I', 'O', 'B', 'C', 'D', 'G', 'L', 'N', 'R', 'T'],
    ['A', 'E', 'I', 'O', 'C', 'D', 'F', 'H', 'L', 'N', 'R', 'T'],
    ['A', 'E', 'I', 'U', 'B', 'D', 'G', 'L', 'M', 'N', 'R', 'T'],
  ];
  const fallbackIdx = Math.floor(rng() * fallbackSets.length);
  return sortLetters(shuffle(rng, fallbackSets[fallbackIdx]));
}

function generateBoard(rng: () => number): { board: GameBoard; archetype: BoardArchetype } {
  const { playable, archetype } = generateBoardShape(rng, BOARD_SIZE);
  const bonuses = placeBonuses(rng, playable, BOARD_SIZE);

  const cells: Cell[][] = Array(BOARD_SIZE).fill(null).map((_, row) =>
    Array(BOARD_SIZE).fill(null).map((_, col) => ({
      row,
      col,
      bonus: bonuses[row][col],
      isPlayable: playable[row][col],
      letter: null,
      isLocked: false,
    }))
  );

  return { board: { cells, size: BOARD_SIZE }, archetype };
}

function generatePuzzleId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generatePuzzle(seed: string): DabblePoolPuzzle {
  const rng = createRng(seed);
  const { board, archetype } = generateBoard(rng);
  const letters = generateLetters(rng);

  // Calculate debug info
  const vowelCount = letters.filter(l => VOWELS.includes(l)).length;
  const consonantCount = letters.length - vowelCount;
  const highValueLetters = letters.filter(l => LETTER_POINTS[l] >= 4);

  let playableCells = 0;
  let totalBonuses = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.isPlayable) playableCells++;
      if (cell.bonus && cell.bonus !== 'START') totalBonuses++;
    }
  }

  // Estimate difficulty based on letter composition
  const hasHighValue = highValueLetters.length > 0;
  const hasManyVowels = vowelCount >= 5;
  const difficulty: 'easy' | 'medium' | 'hard' =
    hasHighValue && !hasManyVowels ? 'hard' :
    hasManyVowels ? 'easy' : 'medium';

  return {
    id: generatePuzzleId(),
    board,
    letters,
    archetype,
    debug: {
      letterDistribution: { vowels: vowelCount, consonants: consonantCount },
      boardArchetype: archetype,
      highValueLetters,
      estimatedDifficulty: difficulty,
      playableCells,
      totalBonuses,
    },
  };
}

async function main() {
  const count = parseInt(process.argv[2] || '365', 10);
  console.log(`Generating ${count} Dabble puzzles...`);

  const puzzles: DabblePoolPuzzle[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    const seed = `dabble-pool-${Date.now()}-${i}-${Math.random()}`;
    const puzzle = generatePuzzle(seed);

    // Ensure unique IDs
    while (usedIds.has(puzzle.id)) {
      puzzle.id = generatePuzzleId();
    }
    usedIds.add(puzzle.id);

    puzzles.push(puzzle);

    if ((i + 1) % 50 === 0) {
      console.log(`  Generated ${i + 1}/${count} puzzles...`);
    }
  }

  const poolFile: PoolFile = {
    generatedAt: new Date().toISOString(),
    puzzles,
  };

  const outputPath = path.join(__dirname, '../public/puzzles/pool.json');
  fs.writeFileSync(outputPath, JSON.stringify(poolFile, null, 2));

  console.log(`\nGenerated ${puzzles.length} puzzles to ${outputPath}`);

  // Print summary stats
  const archetypeCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  for (const p of puzzles) {
    archetypeCounts[p.archetype] = (archetypeCounts[p.archetype] || 0) + 1;
    difficultyCounts[p.debug.estimatedDifficulty] = (difficultyCounts[p.debug.estimatedDifficulty] || 0) + 1;
  }

  console.log('\nArchetype distribution:');
  for (const [arch, count] of Object.entries(archetypeCounts)) {
    console.log(`  ${arch}: ${count}`);
  }

  console.log('\nDifficulty distribution:');
  for (const [diff, count] of Object.entries(difficultyCounts)) {
    console.log(`  ${diff}: ${count}`);
  }
}

main().catch(console.error);
