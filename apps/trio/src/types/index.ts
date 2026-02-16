/**
 * Trio game types
 *
 * The game is based on Set, where cards have 4 attributes and a valid "trio"
 * has each attribute either ALL SAME or ALL DIFFERENT across the 3 cards.
 *
 * Sequential Draw Mode:
 * - 12 cards on board (4x3 grid)
 * - Each round has exactly 1 valid set
 * - After finding the set, 3 new cards are drawn
 * - 5 rounds total
 */

// Tuple representing a card's attribute values in GF(3)^4
// Each value is 0, 1, or 2
export type Tuple = [number, number, number, number];

// Shape identifiers (pool of available shapes)
export type ShapeId =
  | 'circle' | 'triangle' | 'square' | 'diamond' | 'pentagon'
  | 'hexagon' | 'star' | 'cross' | 'heart';

// Color identifiers (pool of available colors)
export type ColorId =
  | 'red' | 'green' | 'purple' | 'blue' | 'orange' | 'teal';

// Pattern identifiers (pool of available patterns)
export type PatternId =
  | 'solid' | 'outline' | 'striped';

// Count is always 1, 2, or 3
export type CardCount = 1 | 2 | 3;

// Visual mapping for a daily puzzle
export interface VisualMapping {
  shapes: [ShapeId, ShapeId, ShapeId];    // Tuple value 0,1,2 -> shape
  colors: [ColorId, ColorId, ColorId];     // Tuple value 0,1,2 -> color
  patterns: [PatternId, PatternId, PatternId]; // Tuple value 0,1,2 -> pattern
}

// A card in the game
export interface Card {
  id: string;        // Unique card ID
  tuple: Tuple;      // Underlying GF(3)^4 tuple
  shape: ShapeId;
  color: ColorId;
  pattern: PatternId;
  count: CardCount;
  // For animation: position in the current board (0-11)
  position?: number;
}

// A found set (trio)
export interface FoundSet {
  cardIds: [string, string, string];
  foundAt: number;   // Timestamp when found
  round: number;     // Which round this set was found in (1-5)
}

// A guess attempt (for duplicate detection)
export interface GuessAttempt {
  cardIds: [string, string, string];
  round: number;
  wasCorrect: boolean;
}

// Star rating thresholds (in seconds) - legacy, kept for puzzle files
export interface StarThresholds {
  threeStar: number;  // Under this = 3 stars
  twoStar: number;    // Under this = 2 stars
  // Completing the puzzle always gets 1 star
}

// A round in the sequential puzzle
export interface PuzzleRound {
  // Round 1: 12 initial tuples
  // Rounds 2-5: 3 replacement tuples that go into positions vacated by the previous set
  tuples: Tuple[];
  // Indices within the current board state (0-11) that form the valid set
  validSetIndices: [number, number, number];
}

// Sequential puzzle definition (pre-generated)
export interface SequentialPuzzle {
  id: string;                    // Unique puzzle ID
  puzzleNumber?: number;         // Assigned puzzle number
  visualMapping: VisualMapping;  // How tuples map to visuals
  rounds: PuzzleRound[];         // 5 rounds of gameplay
  thresholds: StarThresholds;    // Time thresholds for stars
}

// Alias for backwards compatibility in type exports
export type Puzzle = SequentialPuzzle;

// Game state for sequential mode
export interface GameState {
  phase: 'landing' | 'playing' | 'finished';
  puzzle: SequentialPuzzle | null;
  currentRound: number;           // 1-5
  cards: Card[];                  // Current 12 cards on the board
  selectedCardIds: string[];      // Currently selected (max 3)
  foundSets: FoundSet[];          // Sets found by player (1 per round)
  // Attempts system (replaces timer)
  incorrectGuesses: number;       // 0-4, game over at 4
  guessHistory: GuessAttempt[];   // For duplicate detection
  // Hint system
  hintsUsed: number;              // 0-3
  hintedCardIds: string[];        // Cards revealed by hints
  // Display
  lastFoundSet?: Card[];          // For bottom display
  // Win/loss state
  won: boolean;                   // True if completed all rounds
  // Animation state
  removingCardIds: string[];      // Cards being animated out
  addingCardIds: string[];        // Cards being animated in
}

// Game actions for reducer
export type GameAction =
  | { type: 'LOAD_PUZZLE'; puzzle: SequentialPuzzle; cards: Card[] }
  | { type: 'START_GAME' }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'DESELECT_CARD'; cardId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SUBMIT_SELECTION' }
  | { type: 'FOUND_SET'; set: FoundSet; lastFoundCards: Card[] }
  | { type: 'CLEAR_REMOVING' }
  | { type: 'CLEAR_ADDING' }
  | { type: 'INVALID_GUESS'; attempt: GuessAttempt }
  | { type: 'USE_HINT'; cardId: string }
  | { type: 'FINISH_GAME'; won: boolean }
  | { type: 'RESTORE_STATE'; savedState: Partial<GameState> };

// Storage state (for persistence)
export interface TrioPuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    currentRound: number;
    foundSets: FoundSet[];
    currentCardTuples: Tuple[];   // Current board state for restoration
    incorrectGuesses: number;
    guessHistory: GuessAttempt[];
    hintsUsed: number;
    hintedCardIds: string[];
    selectedCardIds?: string[];
    // Completion state
    won?: boolean;
  };
}

// Legacy types for backwards compatibility (not used in new puzzles)
export interface BaseConfig {
  id: string;
  tuples: Tuple[];   // 15 tuples
  sets: [number, number, number][]; // Indices of the 5 valid sets
}
