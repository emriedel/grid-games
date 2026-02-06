// Game configuration constants for Dabble
// These can be adjusted to tune gameplay

export const BOARD_SIZE = 9;

// Maximum number of turns before game ends
export const MAX_TURNS = 4;

// Board archetypes for variety in daily puzzles (4 distinct visual styles)
export const BOARD_ARCHETYPES = ['diamond', 'corridor', 'scattered', 'open'] as const;
export type BoardArchetype = typeof BOARD_ARCHETYPES[number];

// Standard Scrabble letter point values
export const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4,
  I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3,
  Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
  Y: 4, Z: 10,
};

// Letter distribution for the pool (based on Scrabble distribution)
// We'll draw from this pool to create each puzzle's letter set
export const LETTER_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2,
  I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2,
  Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1,
  Y: 2, Z: 1,
};

// How many letters to give the player each puzzle
export const PUZZLE_LETTER_COUNT = 14;

// Minimum number of vowels to ensure playability
export const MIN_VOWELS = 4;
export const VOWELS = ['A', 'E', 'I', 'O', 'U'];

// Difficult letters that need special handling
export const DIFFICULT_LETTERS = ['Q', 'X', 'Z', 'J', 'K'];

// Rules for difficult letters (which letters must accompany them)
export const DIFFICULT_LETTER_RULES: Record<string, { requires: string[] }> = {
  Q: { requires: ['U'] },  // Q must have U to be playable
  X: { requires: [] },
  Z: { requires: [] },
  J: { requires: [] },
  K: { requires: [] },
};

// Letter constraints for playability
export const LETTER_CONSTRAINTS = {
  totalLetters: 14,
  minVowels: 4,
  maxVowels: 6,
  minUniqueLetters: 10,       // At least 10 different letters
  maxDuplicatesPerLetter: 2,  // No letter more than twice
};

// Common 3-letter words for playability check (expanded list)
export const COMMON_3_LETTER_WORDS = [
  // High-frequency common words
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'ALL', 'CAN', 'HER', 'WAS',
  'ONE', 'OUT', 'DAY', 'HAD', 'HAS', 'HOW', 'NEW', 'NOW', 'OLD', 'SEE',
  'WAY', 'MAY', 'SAY', 'SHE', 'TWO', 'GET', 'HIM', 'HIS', 'OUR', 'TOO',
  'ANY', 'MAN', 'BIG', 'RUN', 'SET', 'PUT', 'END', 'FAR', 'TOP', 'TEN',
  // Additional common 3-letter words
  'ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'APE', 'ARC',
  'ARK', 'ARM', 'ART', 'ATE', 'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED',
  'BET', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUS', 'BUY', 'CAB',
  'CAP', 'CAR', 'CAT', 'COB', 'COD', 'COG', 'COP', 'COT', 'COW', 'CRY',
  'CUB', 'CUD', 'CUP', 'CUT', 'DAB', 'DAD', 'DAM', 'DEN', 'DEW', 'DID',
  'DIG', 'DIM', 'DIP', 'DOC', 'DOE', 'DOG', 'DOT', 'DRY', 'DUB', 'DUD',
  'DUE', 'DUG', 'DYE', 'EAR', 'EAT', 'EEL', 'EGG', 'ELF', 'ELM', 'ERA',
  'EVE', 'EWE', 'EYE', 'FAD', 'FAN', 'FAT', 'FAX', 'FED', 'FEE', 'FEW',
  'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOB', 'FOE', 'FOG', 'FOP', 'FOR',
  'FOX', 'FRY', 'FUN', 'FUR', 'GAB', 'GAG', 'GAP', 'GAS', 'GAY', 'GEL',
  'GEM', 'GOB', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM', 'HAM',
  'HAP', 'HAT', 'HAY', 'HEM', 'HEN', 'HEW', 'HID', 'HIP', 'HIT', 'HOB',
  'HOG', 'HOP', 'HOT', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT', 'ICE', 'ICY',
  'ILL', 'IMP', 'INK', 'INN', 'ION', 'IRE', 'IRK', 'ITS', 'IVY', 'JAB',
  'JAG', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT',
  'JOY', 'JUG', 'KEG', 'KEN', 'KEY', 'KID', 'KIN', 'KIT', 'LAB', 'LAC',
  'LAD', 'LAG', 'LAP', 'LAW', 'LAY', 'LEA', 'LED', 'LEG', 'LET', 'LID',
  'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'MAD', 'MAP', 'MAR', 'MAT',
  'MEN', 'MET', 'MIX', 'MOB', 'MOM', 'MOP', 'MOW', 'MUD', 'MUG', 'NAB',
  'NAG', 'NAP', 'NET', 'NIT', 'NOB', 'NOD', 'NOR', 'NUN', 'NUT', 'OAK',
  'OAR', 'OAT', 'ODD', 'ODE', 'OFF', 'OFT', 'OIL', 'OPT', 'ORB', 'ORE',
  'OWE', 'OWL', 'OWN', 'PAD', 'PAL', 'PAN', 'PAP', 'PAR', 'PAT', 'PAW',
  'PAY', 'PEA', 'PEG', 'PEN', 'PEP', 'PER', 'PET', 'PEW', 'PIE', 'PIG',
  'PIN', 'PIT', 'PLY', 'POD', 'POP', 'POT', 'POW', 'PRY', 'PUB', 'PUN',
  'PUP', 'PUS', 'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED',
  'REF', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROE', 'ROT',
  'ROW', 'RUB', 'RUG', 'RUM', 'RUT', 'RYE', 'SAC', 'SAD', 'SAG', 'SAP',
  'SAT', 'SAW', 'SEA', 'SIP', 'SIR', 'SIS', 'SIT', 'SIX', 'SKI', 'SKY',
  'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY',
  'STY', 'SUB', 'SUM', 'SUN', 'SUP', 'TAB', 'TAD', 'TAG', 'TAN', 'TAP',
  'TAR', 'TAT', 'TAX', 'TEA', 'TEN', 'THE', 'TIC', 'TIE', 'TIN', 'TIP',
  'TOE', 'TON', 'TOP', 'TOT', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'URN',
  'USE', 'VAN', 'VAT', 'VET', 'VIA', 'VIE', 'VOW', 'WAD', 'WAG', 'WAR',
  'WAX', 'WEB', 'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE',
  'WOK', 'WON', 'WOO', 'WOW', 'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YEN',
  'YEP', 'YES', 'YET', 'YEW', 'YIN', 'YIP', 'ZAP', 'ZEN', 'ZIP', 'ZIT',
];

// Common 4-letter words for playability check
export const COMMON_4_LETTER_WORDS = [
  // High-frequency common words
  'ABLE', 'ALSO', 'AREA', 'BACK', 'BALL', 'BANK', 'BASE', 'BEAR', 'BEAT', 'BEEN',
  'BEST', 'BIRD', 'BLUE', 'BOAT', 'BODY', 'BOOK', 'BORN', 'BOTH', 'CALL', 'CAME',
  'CAMP', 'CARD', 'CARE', 'CASE', 'CAST', 'CITY', 'CLUB', 'COLD', 'COME', 'COOL',
  'COST', 'DARK', 'DATA', 'DATE', 'DEAL', 'DEEP', 'DOES', 'DONE', 'DOOR', 'DOWN',
  'DRAW', 'DROP', 'DRUG', 'EACH', 'EAST', 'EASY', 'EDGE', 'ELSE', 'EVEN', 'EVER',
  'FACE', 'FACT', 'FAIL', 'FAIR', 'FALL', 'FARM', 'FAST', 'FEAR', 'FEEL', 'FEET',
  'FELL', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIVE',
  'FOOD', 'FOOT', 'FORM', 'FOUR', 'FREE', 'FROM', 'FULL', 'FUND', 'GAME', 'GAVE',
  'GIRL', 'GIVE', 'GOAL', 'GOES', 'GOLD', 'GONE', 'GOOD', 'GREW', 'GROW', 'HAIR',
  'HALF', 'HALL', 'HAND', 'HANG', 'HARD', 'HATE', 'HAVE', 'HEAD', 'HEAR', 'HEAT',
  'HELD', 'HELP', 'HERE', 'HIGH', 'HILL', 'HOLD', 'HOME', 'HOPE', 'HOST', 'HOUR',
  'HUGE', 'IDEA', 'INTO', 'ITEM', 'JACK', 'JANE', 'JOHN', 'JOIN', 'JUMP', 'JUST',
  'KEEP', 'KEPT', 'KIND', 'KING', 'KNEW', 'KNOW', 'LACK', 'LADY', 'LAID', 'LAKE',
  'LAND', 'LANE', 'LAST', 'LATE', 'LEAD', 'LEFT', 'LESS', 'LIFE', 'LIFT', 'LIKE',
  'LINE', 'LIST', 'LIVE', 'LOAD', 'LOAN', 'LONG', 'LOOK', 'LOSE', 'LOSS', 'LOST',
  'LOTS', 'LOVE', 'LUCK', 'MADE', 'MAIL', 'MAIN', 'MAKE', 'MALE', 'MANY', 'MARK',
  'MASS', 'MEAL', 'MEAN', 'MEET', 'MIND', 'MISS', 'MODE', 'MOON', 'MORE', 'MOST',
  'MOVE', 'MUCH', 'MUST', 'NAME', 'NEAR', 'NECK', 'NEED', 'NEWS', 'NEXT', 'NICE',
  'NONE', 'NOTE', 'OKAY', 'ONCE', 'ONLY', 'ONTO', 'OPEN', 'OVER', 'PAGE', 'PAID',
  'PAIN', 'PAIR', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PICK', 'PLAN', 'PLAY',
  'PLUS', 'POEM', 'POOL', 'POOR', 'POST', 'PULL', 'PUSH', 'RACE', 'RAIN', 'RATE',
  'READ', 'REAL', 'REST', 'RICH', 'RIDE', 'RING', 'RISE', 'RISK', 'ROAD', 'ROCK',
  'ROLE', 'ROLL', 'ROOM', 'ROSE', 'RULE', 'SAFE', 'SAID', 'SAKE', 'SALE', 'SAME',
  'SAND', 'SAVE', 'SEAT', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEND', 'SENT',
  'SHIP', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SICK', 'SIDE', 'SIGN', 'SITE', 'SIZE',
  'SKIN', 'SLOW', 'SNOW', 'SOFT', 'SOIL', 'SOLD', 'SOME', 'SONG', 'SOON', 'SORT',
  'SOUL', 'SPOT', 'STAR', 'STAY', 'STEP', 'STOP', 'SUCH', 'SURE', 'TAIL', 'TAKE',
  'TALK', 'TALL', 'TEAM', 'TELL', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THEM',
  'THEN', 'THEY', 'THIN', 'THIS', 'THUS', 'TIME', 'TINY', 'TOLD', 'TONE', 'TOOK',
  'TOOL', 'TOWN', 'TREE', 'TRIP', 'TRUE', 'TURN', 'TYPE', 'UNIT', 'UPON', 'USED',
  'USER', 'VARY', 'VERY', 'VIEW', 'WAIT', 'WAKE', 'WALK', 'WALL', 'WANT', 'WARM',
  'WASH', 'WAVE', 'WEAK', 'WEAR', 'WEEK', 'WELL', 'WENT', 'WERE', 'WEST', 'WHAT',
  'WHEN', 'WIDE', 'WIFE', 'WILD', 'WILL', 'WIND', 'WINE', 'WING', 'WIRE', 'WISE',
  'WISH', 'WITH', 'WOKE', 'WOLF', 'WOOD', 'WORD', 'WORE', 'WORK', 'WORN', 'WRAP',
  'YARD', 'YEAR', 'ZERO', 'ZONE',
];

// Common 5-7 letter words for playability validation
// Ensures at least one longer word can be formed with drawn letters
export const COMMON_LONG_WORDS = [
  // 5-letter words
  'ABOUT', 'AFTER', 'AGAIN', 'ALONG', 'AMONG', 'BEGAN', 'BEING', 'BELOW',
  'BOARD', 'BRAIN', 'BREAD', 'BREAK', 'BRING', 'BROAD', 'BROWN', 'BUILD',
  'CARRY', 'CATCH', 'CAUSE', 'CHAIR', 'CHEAP', 'CHECK', 'CHIEF', 'CHILD',
  'CLAIM', 'CLEAN', 'CLEAR', 'CLIMB', 'CLOSE', 'CLOTH', 'COAST', 'COUNT',
  'COVER', 'CRAFT', 'CREAM', 'CROWD', 'DANCE', 'DEATH', 'DOING', 'DOUBT',
  'DRAFT', 'DRAIN', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'DROWN', 'EARTH',
  'EIGHT', 'EMPTY', 'ENJOY', 'ENTER', 'EQUAL', 'EVENT', 'EVERY', 'EXTRA',
  'FAITH', 'FALSE', 'FAVOR', 'FIELD', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST',
  'FLOOR', 'FORCE', 'FORTH', 'FOUND', 'FRAME', 'FRESH', 'FRONT', 'FRUIT',
  'GLASS', 'GRACE', 'GRAIN', 'GRAND', 'GRANT', 'GRASS', 'GREAT', 'GREEN',
  'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUIDE', 'HAPPY', 'HEARD',
  'HEART', 'HEAVY', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'IMAGE', 'INDEX',
  'INNER', 'JUDGE', 'KNOWN', 'LABOR', 'LARGE', 'LATER', 'LAUGH', 'LAYER',
  'LEARN', 'LEAST', 'LEAVE', 'LEVEL', 'LIGHT', 'LIMIT', 'LOCAL', 'LOOSE',
  'LOWER', 'LUCKY', 'LUNCH', 'MAJOR', 'MARCH', 'MATCH', 'MAYBE', 'MAYOR',
  'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MODEL', 'MONEY', 'MONTH',
  'MORAL', 'MOTOR', 'MOUNT', 'MOUTH', 'MOVIE', 'MUSIC', 'NAMED', 'NEEDS',
  'NEVER', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCEAN',
  'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PAPER', 'PARTY',
  'PEACE', 'PHONE', 'PHOTO', 'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN',
  'PLANE', 'PLANT', 'PLATE', 'PLAY', 'POINT', 'POUND', 'POWER', 'PRESS',
  'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD',
  'PROVE', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID',
  'REACH', 'READY', 'REFER', 'RIGHT', 'RIVER', 'ROUGH', 'ROUND', 'ROUTE',
  'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE',
  'SEVEN', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL',
  'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHORE', 'SHORT', 'SHOUT', 'SHOWN',
  'SIGHT', 'SINCE', 'SIXTH', 'SKILL', 'SLEEP', 'SLIDE', 'SLOPE', 'SMALL',
  'SMART', 'SMELL', 'SMILE', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND',
  'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEND', 'SPENT', 'SPITE', 'SPLIT',
  'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM',
  'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM',
  'STORY', 'STRIP', 'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER',
  'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TEACH', 'TEETH', 'TERMS', 'THANK',
  'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE',
  'THREE', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOTAL',
  'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TRASH', 'TREAT',
  'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TRUCK', 'TRULY', 'TRUST',
  'TRUTH', 'TWICE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET',
  'URBAN', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL',
  'VOICE', 'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE',
  'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE',
  'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD',
  'YOUNG', 'YOUTH',
  // 6-letter words
  'ACCEPT', 'ACCESS', 'ACROSS', 'ACTION', 'ACTUAL', 'ADVICE', 'AFFECT', 'AFFORD',
  'AFRAID', 'ALMOST', 'ALWAYS', 'AMOUNT', 'ANIMAL', 'ANNUAL', 'ANSWER', 'ANYONE',
  'APPEAR', 'ARTIST', 'ATTACK', 'ATTEND', 'AUGUST', 'AUTHOR', 'BATTLE', 'BEAUTY',
  'BECAME', 'BECOME', 'BEFORE', 'BEHIND', 'BELIEF', 'BELONG', 'BETTER', 'BEYOND',
  'BORDER', 'BOTHER', 'BOTTOM', 'BOUGHT', 'BRANCH', 'BRIDGE', 'BRIGHT', 'BROKEN',
  'BUDGET', 'BURDEN', 'CANCER', 'CARBON', 'CAREER', 'CASTLE', 'CAUGHT', 'CENTER',
  'CHANCE', 'CHANGE', 'CHARGE', 'CHOICE', 'CHOOSE', 'CHOSEN', 'CHURCH', 'CIRCLE',
  'CLIENT', 'CLOSED', 'COFFEE', 'COLUMN', 'COMBAT', 'COMING', 'COMMON', 'CORNER',
  'COTTON', 'COUNTY', 'COUPLE', 'COURSE', 'COVERS', 'CREATE', 'CREDIT', 'CRISIS',
  'CUSTOM', 'DAMAGE', 'DANGER', 'DEALER', 'DEBATE', 'DECADE', 'DECIDE', 'DEFEAT',
  'DEFEND', 'DEFINE', 'DEGREE', 'DEMAND', 'DEPEND', 'DESERT', 'DESIGN', 'DESIRE',
  'DETAIL', 'DETECT', 'DEVICE', 'DIFFER', 'DINNER', 'DIRECT', 'DOCTOR', 'DOLLAR',
  'DOMAIN', 'DOUBLE', 'DRIVEN', 'DRIVER', 'DURING', 'EARNED', 'EASIER', 'EATING',
  'EDITOR', 'EFFECT', 'EFFORT', 'EIGHTH', 'EITHER', 'EMERGE', 'EMPLOY', 'ENABLE',
  'ENDING', 'ENERGY', 'ENGAGE', 'ENGINE', 'ENOUGH', 'ENSURE', 'ENTIRE', 'ENTITY',
  'EQUALS', 'ESCAPE', 'ESTATE', 'ETHNIC', 'EUROPE', 'EXPAND', 'EXPECT', 'EXPERT',
  'EXPORT', 'EXTEND', 'EXTENT', 'FABRIC', 'FACING', 'FACTOR', 'FAILED', 'FAIRLY',
  'FALLEN', 'FAMILY', 'FAMOUS', 'FARMER', 'FASTER', 'FATHER', 'FAULTS', 'FELLOW',
  'FEMALE', 'FIGURE', 'FILLED', 'FILTER', 'FINALE', 'FINGER', 'FINISH', 'FISCAL',
  'FLIGHT', 'FLOWER', 'FLYING', 'FOLLOW', 'FORCED', 'FOREST', 'FORGET', 'FORMAL',
  'FORMAT', 'FORMED', 'FORMER', 'FOUGHT', 'FOURTH', 'FRAMES', 'FRENCH', 'FRIEND',
  'FROZEN', 'FUTURE', 'GAINED', 'GARDEN', 'GATHER', 'GENDER', 'GLOBAL', 'GOLDEN',
  'GOTTEN', 'GOVERN', 'GROUND', 'GROWTH', 'GUILTY', 'HANDLE', 'HAPPEN', 'HARDLY',
  'HEADED', 'HEALTH', 'HEIGHT', 'HELPED', 'HIDDEN', 'HOLDER', 'HONEST', 'HOPING',
  'IMPACT', 'IMPORT', 'INCOME', 'INDEED', 'INDIAN', 'INJURY', 'INSIDE', 'INSIST',
  'INTEND', 'INVEST', 'ISLAND', 'ITSELF', 'JUNIOR', 'KILLED', 'KNIGHT', 'KOREAN',
  'LATEST', 'LATTER', 'LAUNCH', 'LAWYER', 'LEADER', 'LEAGUE', 'LEAVES', 'LENGTH',
  'LESSON', 'LETTER', 'LIGHTS', 'LIKELY', 'LIMITS', 'LINEAR', 'LIQUID', 'LISTEN',
  'LITTLE', 'LIVING', 'LOSING', 'MAKING', 'MANAGE', 'MANNER', 'MANUAL', 'MARKED',
  'MARKET', 'MARTIN', 'MASTER', 'MATTER', 'MATURE', 'MEDIUM', 'MEMBER', 'MEMORY',
  'MENTAL', 'MERELY', 'METHOD', 'MIDDLE', 'MILLER', 'MINING', 'MINUTE', 'MIRROR',
  'MOBILE', 'MODERN', 'MODEST', 'MOMENT', 'MOSTLY', 'MOTHER', 'MOTION', 'MOVING',
  'MURDER', 'MUSEUM', 'MYSELF', 'NATION', 'NATIVE', 'NATURE', 'NEARBY', 'NEARLY',
  'NIGHTS', 'NOBODY', 'NORMAL', 'NOTICE', 'NOTION', 'NUMBER', 'OBTAIN', 'OFFICE',
  'OLDEST', 'ONLINE', 'OPENED', 'OPTION', 'ORANGE', 'ORDERS', 'ORIGIN', 'OUTPUT',
  'PACING', 'PALACE', 'PANELS', 'PARENT', 'PARTLY', 'PASSED', 'PATENT', 'PAYING',
  'PEOPLE', 'PERIOD', 'PERMIT', 'PERSON', 'PICKED', 'PLACES', 'PLACED', 'PLANET',
  'PLAYER', 'PLEASE', 'PLENTY', 'POCKET', 'POINTS', 'POLICE', 'POLICY', 'POSTED',
  'POUNDS', 'POWERS', 'PREFER', 'PRETTY', 'PRIEST', 'PRINCE', 'PRISON', 'PROFIT',
  'PROPER', 'PROVEN', 'PUBLIC', 'PUSHED', 'RACIAL', 'RAISED', 'RANDOM', 'RATHER',
  'RATING', 'READER', 'REALLY', 'REASON', 'RECALL', 'RECENT', 'RECORD', 'REDUCE',
  'REFORM', 'REFUSE', 'REGARD', 'REGION', 'RELATE', 'RELIEF', 'REMAIN', 'REMOTE',
  'REMOVE', 'RENTAL', 'REPAIR', 'REPEAT', 'REPORT', 'RESCUE', 'RESIST', 'RESORT',
  'RESULT', 'RETAIL', 'RETAIN', 'RETIRE', 'RETURN', 'REVEAL', 'REVIEW', 'REWARD',
  'RIDING', 'RIGHTS', 'RISING', 'ROBUST', 'ROLLED', 'ROUTER', 'RULING', 'RUNNER',
  'SAFETY', 'SALARY', 'SAMPLE', 'SAYING', 'SCHEME', 'SCHOOL', 'SCORED', 'SCREEN',
  'SCRIPT', 'SEARCH', 'SEASON', 'SECOND', 'SECRET', 'SECTOR', 'SECURE', 'SEEING',
  'SEEMED', 'SELECT', 'SELLER', 'SENATE', 'SENIOR', 'SEQUEL', 'SERIAL', 'SERIES',
  'SERVED', 'SERVER', 'SETTLE', 'SEVERE', 'SEXUAL', 'SHADOW', 'SHAPED', 'SHARED',
  'SHOULD', 'SHOWED', 'SHOWER', 'SIGNAL', 'SIGNED', 'SILENT', 'SILVER', 'SIMPLE',
  'SIMPLY', 'SINGLE', 'SISTER', 'SLIGHT', 'SLOWLY', 'SMOOTH', 'SOCIAL', 'SOLELY',
  'SOLVED', 'SOUGHT', 'SOUNDS', 'SOURCE', 'SPEECH', 'SPIRIT', 'SPOKEN', 'SPREAD',
  'SPRING', 'SQUARE', 'STABLE', 'STAGES', 'STANDS', 'STARTS', 'STATED', 'STATES',
  'STATUS', 'STAYED', 'STEADY', 'STOLEN', 'STORED', 'STRAIN', 'STRAND', 'STREET',
  'STRESS', 'STRICT', 'STRIKE', 'STRING', 'STRONG', 'STRUCK', 'STUDIO', 'SUBMIT',
  'SUDDEN', 'SUFFER', 'SUMMER', 'SUMMIT', 'SUPPLY', 'SURELY', 'SURVEY', 'SWITCH',
  'SYMBOL', 'SYSTEM', 'TABLES', 'TACKLE', 'TAKING', 'TALENT', 'TARGET', 'TAUGHT',
  'TEMPLE', 'TENANT', 'TENDER', 'TENNIS', 'TERROR', 'THANKS', 'THEIRS', 'THEORY',
  'THIRTY', 'THOUGH', 'THREAT', 'THROWN', 'TICKET', 'TIMING', 'TISSUE', 'TITLED',
  'TITLES', 'TONGUE', 'TOPICS', 'TOWARD', 'TRADER', 'TRAVEL', 'TREATY', 'TRIBAL',
  'TRICKY', 'TROOPS', 'TRUCKS', 'TUNNEL', 'TURNED', 'TWELVE', 'TWENTY', 'UNABLE',
  'UNIQUE', 'UNITED', 'UNLESS', 'UNLIKE', 'UPDATE', 'USEFUL', 'VALLEY', 'VALUES',
  'VARIED', 'VENDOR', 'VERSUS', 'VICTIM', 'VIEWED', 'VIEWER', 'VISION', 'VISUAL',
  'VOLUME', 'WAITED', 'WALKER', 'WALKED', 'WANDER', 'WANTED', 'WARMTH', 'WARNED',
  'WEALTH', 'WEAPON', 'WEEKLY', 'WEIGHT', 'WIDELY', 'WINDOW', 'WINNER', 'WINTER',
  'WITHIN', 'WONDER', 'WOODEN', 'WORKER', 'WOUNDS', 'WRITER', 'YELLOW', 'YIELDS',
  // 7-letter words
  'ABANDON', 'ABILITY', 'ABSENCE', 'ACCOUNT', 'ACHIEVE', 'ACQUIRE', 'ADDRESS', 'ADVANCE',
  'ADVISER', 'AGAINST', 'AIRLINE', 'AIRPORT', 'ALCOHOL', 'ANCIENT', 'ANOTHER', 'ANXIETY',
  'APPLIED', 'ARRANGE', 'ARRIVAL', 'ARTICLE', 'ASSAULT', 'ASSUME', 'ATHLETE', 'ATTEMPT',
  'ATTRACT', 'AUCTION', 'AVERAGE', 'BACKING', 'BALANCE', 'BANKING', 'BARRIER', 'BATTERY',
  'BEARING', 'BEATING', 'BECAUSE', 'BEDROOM', 'BELIEVE', 'BENEATH', 'BENEFIT', 'BESIDES',
  'BETWEEN', 'BILLION', 'BINDING', 'BIZARRE', 'BLANKET', 'BLOCKED', 'BOOKING', 'BOROUGH',
  'BROTHER', 'BROUGHT', 'BUILDER', 'BURNING', 'CABINET', 'CALLING', 'CAMPING', 'CAPABLE',
  'CAPITAL', 'CAPTAIN', 'CAPTURE', 'CAREFUL', 'CARRIER', 'CARRIED', 'CATALOG', 'CAUTION',
  'CEILING', 'CENTRAL', 'CENTURY', 'CERTAIN', 'CHAPTER', 'CHARITY', 'CHARTER', 'CHEAPER',
  'CHICKEN', 'CHRONIC', 'CIRCUIT', 'CLASSIC', 'CLIMATE', 'CLOSING', 'CLOTHES', 'CLUSTER',
  'COASTAL', 'COATING', 'COLLEGE', 'COMBINE', 'COMFORT', 'COMMAND', 'COMMENT', 'COMPACT',
  'COMPANY', 'COMPARE', 'COMPETE', 'COMPILE', 'COMPLEX', 'CONCEPT', 'CONCERN', 'CONDUCT',
  'CONFIRM', 'CONNECT', 'CONSENT', 'CONSIST', 'CONSULT', 'CONTAIN', 'CONTENT', 'CONTEST',
  'CONTEXT', 'CONTROL', 'CONVERT', 'CORRECT', 'COUNCIL', 'COUNSEL', 'COUNTER', 'COUNTRY',
  'COVERED', 'CREATED', 'CREATOR', 'CREDITS', 'CRICKET', 'CRITICS', 'CRUCIAL', 'CRYSTAL',
  'CULTURE', 'CURRENT', 'CURTAIN', 'DEALING', 'DECLINE', 'DEFAULT', 'DEFENCE', 'DEFICIT',
  'DELIVER', 'DEPOSIT', 'DERIVED', 'DESKTOP', 'DESPITE', 'DESTROY', 'DEVELOP', 'DIAMOND',
  'DIGITAL', 'DISABLE', 'DISEASE', 'DISPLAY', 'DISPUTE', 'DISTANT', 'DIVERSE', 'DIVIDED',
  'DRIVING', 'DROPPED', 'DYNAMIC', 'EARLIER', 'EARNING', 'EASTERN', 'EDITION', 'ELDERLY',
  'ELEMENT', 'EMBASSY', 'EMOTION', 'ENDLESS', 'ENHANCE', 'ESSENCE', 'EVENING', 'EVIDENT',
  'EXACTLY', 'EXAMINE', 'EXAMPLE', 'EXCITED', 'EXCLUDE', 'EXECUTE', 'EXHIBIT', 'EXPENSE',
  'EXPLAIN', 'EXPLORE', 'EXPRESS', 'EXTRACT', 'EXTREME', 'FACTORY', 'FACULTY', 'FAILURE',
  'FALLING', 'FASHION', 'FASTEST', 'FATIGUE', 'FEATURE', 'FEDERAL', 'FEELING', 'FICTION',
  'FIFTEEN', 'FIGHTER', 'FILLING', 'FINALLY', 'FINANCE', 'FINDING', 'FISHING', 'FITNESS',
  'FOREIGN', 'FOREVER', 'FORMULA', 'FORTUNE', 'FORWARD', 'FOUNDED', 'FOUNDER', 'FREEDOM',
  'FREIGHT', 'FURTHER', 'GALLERY', 'GATEWAY', 'GENERAL', 'GENERIC', 'GENESIS', 'GENETIC',
  'GENUINE', 'GETTING', 'GLASSES', 'GLIMPSE', 'GRABBED', 'GRANTED', 'GRAPHIC', 'GREATER',
  'GREATLY', 'GROCERY', 'GROWING', 'HABITAT', 'HANGING', 'HAPPIER', 'HARBOUR', 'HEADING',
  'HEALING', 'HEALTHY', 'HEARING', 'HELPFUL', 'HELPING', 'HERSELF', 'HIGHWAY', 'HIMSELF',
  'HISTORY', 'HITTING', 'HOLDING', 'HOLIDAY', 'HOUSING', 'HOWEVER', 'HUNDRED', 'HUNTING',
  'ILLNESS', 'IMAGINE', 'IMPACTS', 'IMPLIES', 'IMPORTS', 'IMPOSED', 'IMPROVE', 'INCLUDE',
  'INCOMES', 'INDEXED', 'INDICES', 'INDUCED', 'INITIAL', 'INQUIRY', 'INSIGHT', 'INSTALL',
  'INSTANT', 'INSTEAD', 'INTENSE', 'INTERIM', 'INVITED', 'INWARDS', 'IRELAND', 'ISLANDS',
  'ITALIAN', 'JOINTLY', 'JOURNAL', 'JOURNEY', 'KEEPING', 'KILLING', 'KINGDOM', 'KITCHEN',
  'KNOCKED', 'KNOWING', 'LANDING', 'LARGELY', 'LASTING', 'LEADING', 'LEARNED', 'LEATHER',
  'LEAVING', 'LEISURE', 'LENDING', 'LENGTHY', 'LIBERAL', 'LIBERTY', 'LICENSE', 'LIGHTER',
  'LIMITED', 'LINKING', 'LISTING', 'LITERAL', 'LOADING', 'LOCALLY', 'LOCATED', 'LOOKING',
  'LOOPING', 'MACHINE', 'MAGICAL', 'MAILING', 'MANAGER', 'MANDATE', 'MANKIND', 'MAPPING',
  'MARGINS', 'MARINES', 'MARKING', 'MARRIED', 'MASSIVE', 'MASTERS', 'MATCHED', 'MAXIMUM',
  'MEASURE', 'MEDICAL', 'MEETING', 'MENTION', 'MESSAGE', 'MILLION', 'MINERAL', 'MINIMUM',
  'MISSING', 'MISSION', 'MISTAKE', 'MIXTURE', 'MODULAR', 'MONITOR', 'MONSTER', 'MONTHLY',
  'MORNING', 'MOUNTED', 'MUSICAL', 'MYSTERY', 'NATIONS', 'NATURAL', 'NEAREST', 'NEITHER',
  'NERVOUS', 'NETWORK', 'NEUTRAL', 'NOMINAL', 'NOTHING', 'NOTICED', 'NUCLEAR', 'NURSING',
  'OAKLAND', 'OBJECTS', 'OBSERVE', 'OBVIOUS', 'OPINION', 'OPTIMAL', 'OPTIONS', 'ORGANIC',
  'ORIGINS', 'OUTDOOR', 'OUTLINE', 'OUTLOOK', 'OUTPUTS', 'OVERALL', 'OVERLAP', 'OVERSEE',
  'PACKAGE', 'PAINFUL', 'PAINTED', 'PAINTER', 'PARTIAL', 'PARTNER', 'PASSAGE', 'PASSING',
  'PASSION', 'PASSIVE', 'PATIENT', 'PATTERN', 'PAYMENT', 'PENDING', 'PENSION', 'PERCENT',
  'PERFECT', 'PERFORM', 'PERHAPS', 'PERIODS', 'PERMITS', 'PICKING', 'PICTURE', 'PIONEER',
  'PITCHED', 'PLACING', 'PLANNED', 'PLANNER', 'PLASTIC', 'PLAYERS', 'PLAYING', 'PLEASED',
  'POINTED', 'POPULAR', 'PORTION', 'POSTING', 'POVERTY', 'POWERED', 'PRAISED', 'PRECISE',
  'PREDICT', 'PREMIER', 'PREMIUM', 'PREPARE', 'PRESENT', 'PRESSED', 'PREVENT', 'PRIMARY',
  'PRINTED', 'PRINTER', 'PRIVACY', 'PRIVATE', 'PROBLEM', 'PROCEED', 'PROCESS', 'PRODUCE',
  'PRODUCT', 'PROFILE', 'PROFITS', 'PROGRAM', 'PROJECT', 'PROMISE', 'PROMOTE', 'PROPOSE',
  'PROTECT', 'PROTEIN', 'PROTEST', 'PROVIDE', 'PUBLISH', 'PULLING', 'PUMPING', 'PUSHING',
  'PUTTING', 'QUALIFY', 'QUALITY', 'QUARTER', 'QUICKLY', 'RADICAL', 'RAISING', 'RANGING',
  'RANKING', 'RAPIDLY', 'REACHED', 'READERS', 'READING', 'REALITY', 'REALIZE', 'RECEIPT',
  'RECEIVE', 'RECOVER', 'REDUCED', 'REFLECT', 'REFORMS', 'REFUSED', 'REGARDS', 'REGIONS',
  'REGULAR', 'RELATED', 'RELEASE', 'REMAINS', 'REMARKS', 'REMOVED', 'RENEWED', 'REPAIRS',
  'REPLACE', 'REPORTS', 'REQUEST', 'REQUIRE', 'RESCUED', 'RESERVE', 'RESOLVE', 'RESPECT',
  'RESPOND', 'RESTORE', 'RESULTS', 'RESUMED', 'RETIRED', 'RETURNS', 'REUNION', 'REUNION',
  'REVENUE', 'REVERSE', 'REVISED', 'REVIVAL', 'RHYTHM', 'ROUGHLY', 'ROUTINE', 'RUNNING',
  'SAILING', 'SAVINGS', 'SCALING', 'SCANDAL', 'SCATTER', 'SCHOLAR', 'SCIENCE', 'SCRATCH',
  'SEASONS', 'SECTION', 'SEEKING', 'SEGMENT', 'SELLING', 'SEMINAR', 'SENATOR', 'SENDING',
  'SENIORS', 'SENSORY', 'SERIOUS', 'SERPENT', 'SERVANT', 'SERVICE', 'SESSION', 'SETTING',
  'SETTLED', 'SEVENTH', 'SEVERAL', 'SHELTER', 'SHERIFF', 'SHIFTED', 'SHIPPED', 'SHOCKED',
  'SHORTER', 'SHORTLY', 'SHOWING', 'SHUFFLE', 'SIMILAR', 'SITTING', 'SIXTEEN', 'SKILLED',
  'SLAVERY', 'SMOKING', 'SNOWDEN', 'SOCIETY', 'SOLDIER', 'SOMEHOW', 'SOMEONE', 'SORTING',
  'SPEAKER', 'SPECIAL', 'SPECIES', 'SPECIFY', 'SPIRITS', 'SPONSOR', 'SPOTTED', 'SPRINGS',
  'STADIUM', 'STAFFED', 'STAGING', 'STAMPED', 'STARTED', 'STARTER', 'STATING', 'STATION',
  'STATUTE', 'STAYING', 'STORAGE', 'STRANGE', 'STREETS', 'STRETCH', 'STRINGS', 'STUDIED',
  'STUDIES', 'SUBJECT', 'SUCCEED', 'SUCCESS', 'SUGGEST', 'SUICIDE', 'SUMMARY', 'SUNRISE',
  'SUPPORT', 'SUPPOSE', 'SUPREME', 'SURFACE', 'SURPLUS', 'SURNAME', 'SURPLUS', 'SURVIVE',
  'SUSPECT', 'SUSPEND', 'SWEATER', 'SYMBOLS', 'SYSTEMS', 'TABLOID', 'TACTICS', 'TARGETS',
  'TEACHER', 'TEENAGE', 'TELLING', 'TEMPLES', 'TENSION', 'TERRIBLE', 'TESTING', 'TEXTILE',
  'THEATRE', 'THERAPY', 'THEREBY', 'THERMAL', 'THOUGHT', 'THREATS', 'THROUGH', 'THUNDER',
  'TONIGHT', 'TOOLBAR', 'TOURISM', 'TOURIST', 'TOWARDS', 'TRACKER', 'TRADING', 'TRAFFIC',
  'TRAINED', 'TRAINER', 'TRANSIT', 'TRAPPED', 'TRAVELS', 'TREATED', 'TRIGGER', 'TRIUMPH',
  'TROUBLE', 'TURNING', 'TWELFTH', 'TYPICAL', 'UKRAINE', 'UNABLE', 'UNIFORM', 'UNKNOWN',
  'UNUSUAL', 'UPGRADE', 'UPWARDS', 'UTILITY', 'VACANCY', 'VALIANT', 'VARIANT', 'VARIETY',
  'VARIOUS', 'VEHICLE', 'VENTURE', 'VERSION', 'VETERAN', 'VICTIMS', 'VICTORY', 'VIEWING',
  'VILLAGE', 'VIOLENT', 'VIRTUAL', 'VISIBLE', 'VISITED', 'VISITOR', 'VOLUMES', 'WAITING',
  'WARNING', 'WARRANT', 'WEATHER', 'WEBSITE', 'WEDDING', 'WEEKEND', 'WELFARE', 'WESTERN',
  'WHEREAS', 'WHETHER', 'WILLING', 'WINNING', 'WITHOUT', 'WITNESS', 'WORKING', 'WORKOUT',
  'WORSHIP', 'WORTHY', 'WOUNDED', 'WRAPPED', 'WRITING', 'WRITTEN', 'YOUNGER',
];

// Board generation parameters
export const BOARD_CONFIG = {
  // Percentage of cells that should be playable (not dead spaces)
  minPlayablePercent: 0.65,
  maxPlayablePercent: 0.85,

  // Bonus square counts for a 9x9 board (asymmetric placement allowed)
  bonusCounts: {
    DL: 4,  // Double Letter
    TL: 4,  // Triple Letter
    DW: 3,  // Double Word
    TW: 2,  // Triple Word
  },
};

// Board symmetry configuration
export const BOARD_SYMMETRY = {
  type: '180' as const,       // 180-degree rotational symmetry
  centerProtectionRadius: 2,  // Cells within 2 of center always playable
};

// Bonus placement configuration - strategic placement rules
// Bonuses are placed with quadrant balancing to ensure spread across the board
export const BONUS_PLACEMENT = {
  TW: { edgePreference: 0.8, minDistFromCenter: 3, allowAdjacent: false },  // Edges only
  DW: { edgePreference: 0.5, minDistFromCenter: 2, allowAdjacent: false },  // Mid-range spread
  TL: { edgePreference: 0.6, minDistFromCenter: 2, allowAdjacent: false },  // Mid-range spread
  DL: { edgePreference: 0.5, minDistFromCenter: 1, allowAdjacent: true },   // Balanced spread
};

// Bonus multipliers
export const BONUS_MULTIPLIERS = {
  DL: { letter: 2, word: 1 },
  TL: { letter: 3, word: 1 },
  DW: { letter: 1, word: 2 },
  TW: { letter: 1, word: 3 },
  START: { letter: 1, word: 2 }, // Start square acts as double word
};

// Scoring bonuses - easily tunable
export const SCORING_CONFIG = {
  // Letter usage bonuses: rewards using more of your letters
  // Key is number of letters used, value is bonus points
  letterUsageBonus: {
    12: 10,  // 12 letters: +10 bonus
    13: 20,  // 13 letters: +20 bonus
    14: 50,  // 14 letters (all): +50 bonus
  } as Record<number, number>,
};

// Helper to calculate letter usage bonus (returns bonus for current usage, not cumulative)
export function getLetterUsageBonus(lettersUsed: number): number {
  return SCORING_CONFIG.letterUsageBonus[lettersUsed] || 0;
}

// Visual styling for bonus squares
export const BONUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DL: { bg: 'bg-sky-600', text: 'text-sky-100', label: 'DL' },
  TL: { bg: 'bg-blue-700', text: 'text-blue-100', label: 'TL' },
  DW: { bg: 'bg-rose-600', text: 'text-rose-100', label: 'DW' },
  TW: { bg: 'bg-orange-600', text: 'text-orange-100', label: 'TW' },
  START: { bg: 'bg-amber-500', text: 'text-amber-900', label: '★' },
};
