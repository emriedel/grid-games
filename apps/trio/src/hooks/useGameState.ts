'use client';

import { useReducer, useCallback } from 'react';
import type { GameState, GameAction, SequentialPuzzle, Card, FoundSet, GuessAttempt } from '@/types';
import { isValidSet } from '@/lib/setLogic';
import { GAME_CONFIG } from '@/constants';
import { getReplacementCards } from '@/lib/puzzleLoader';

const initialState: GameState = {
  phase: 'landing',
  puzzle: null,
  currentRound: 1,
  cards: [],
  selectedCardIds: [],
  foundSets: [],
  incorrectGuesses: 0,
  guessHistory: [],
  hintsUsed: 0,
  hintedCardIds: [],
  lastFoundSet: undefined,
  won: false,
  removingCardIds: [],
  addingCardIds: [],
};

/**
 * Check if a guess is a duplicate within the current round.
 */
function isDuplicateGuess(
  cardIds: [string, string, string],
  round: number,
  guessHistory: GuessAttempt[]
): boolean {
  const sortedIds = [...cardIds].sort();
  return guessHistory.some(attempt => {
    if (attempt.round !== round) return false;
    const sortedAttempt = [...attempt.cardIds].sort();
    return sortedIds.every((id, i) => id === sortedAttempt[i]);
  });
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PUZZLE':
      return {
        ...state,
        puzzle: action.puzzle,
        cards: action.cards,
        currentRound: 1,
        selectedCardIds: [],
        foundSets: [],
        incorrectGuesses: 0,
        guessHistory: [],
        hintsUsed: 0,
        hintedCardIds: [],
        lastFoundSet: undefined,
        won: false,
        removingCardIds: [],
        addingCardIds: [],
      };

    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
      };

    case 'SELECT_CARD': {
      // Can't select if already have 3 cards
      if (state.selectedCardIds.length >= 3) {
        return state;
      }
      // Can't select already selected card
      if (state.selectedCardIds.includes(action.cardId)) {
        return state;
      }
      // Can't select card being removed
      if (state.removingCardIds.includes(action.cardId)) {
        return state;
      }
      return {
        ...state,
        selectedCardIds: [...state.selectedCardIds, action.cardId],
      };
    }

    case 'DESELECT_CARD':
      return {
        ...state,
        selectedCardIds: state.selectedCardIds.filter(id => id !== action.cardId),
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedCardIds: [],
      };

    case 'SUBMIT_SELECTION':
      // This is handled in the hook - reducer doesn't process this
      return state;

    case 'FOUND_SET': {
      const newFoundSets = [...state.foundSets, action.set];
      const newRound = state.currentRound + 1;
      const isComplete = newRound > GAME_CONFIG.ROUND_COUNT;

      // Mark found cards as removing
      const removingCardIds = action.set.cardIds;

      // Record the guess as correct
      const newGuessHistory: GuessAttempt[] = [...state.guessHistory, {
        cardIds: action.set.cardIds,
        round: state.currentRound,
        wasCorrect: true,
      }];

      return {
        ...state,
        foundSets: newFoundSets,
        selectedCardIds: [],
        removingCardIds,
        guessHistory: newGuessHistory,
        lastFoundSet: action.lastFoundCards,
        // Clear hints for new round (hinted cards were just found)
        hintedCardIds: [],
        phase: isComplete ? 'finished' : state.phase,
        won: isComplete ? true : state.won,
      };
    }

    case 'CLEAR_REMOVING': {
      // After remove animation, update the board with new cards
      if (state.removingCardIds.length === 0) return state;

      const nextRound = state.currentRound + 1;

      if (nextRound > GAME_CONFIG.ROUND_COUNT || !state.puzzle) {
        // Game is complete, just clear removing
        return {
          ...state,
          removingCardIds: [],
          cards: state.cards.filter(c => !state.removingCardIds.includes(c.id)),
        };
      }

      // Get positions of removed cards
      const removedPositions = state.cards
        .filter(c => state.removingCardIds.includes(c.id))
        .map(c => c.position!)
        .sort((a, b) => a - b) as [number, number, number];

      // Get replacement cards
      const newCards = getReplacementCards(state.puzzle, nextRound, removedPositions);
      if (!newCards) {
        console.error('Failed to get replacement cards');
        return state;
      }

      // Build new board: keep cards not being removed, add new cards
      const remainingCards = state.cards.filter(c => !state.removingCardIds.includes(c.id));
      const updatedCards = [...remainingCards, ...newCards];

      return {
        ...state,
        currentRound: nextRound,
        cards: updatedCards,
        removingCardIds: [],
        addingCardIds: newCards.map(c => c.id),
      };
    }

    case 'CLEAR_ADDING':
      return {
        ...state,
        addingCardIds: [],
      };

    case 'INVALID_GUESS': {
      const newIncorrectGuesses = state.incorrectGuesses + 1;
      const isGameOver = newIncorrectGuesses >= GAME_CONFIG.MAX_INCORRECT_GUESSES;

      return {
        ...state,
        incorrectGuesses: newIncorrectGuesses,
        guessHistory: [...state.guessHistory, action.attempt],
        selectedCardIds: [],
        phase: isGameOver ? 'finished' : state.phase,
        won: isGameOver ? false : state.won,
      };
    }

    case 'USE_HINT': {
      if (state.hintsUsed >= GAME_CONFIG.MAX_HINTS) {
        return state;
      }
      return {
        ...state,
        hintsUsed: state.hintsUsed + 1,
        hintedCardIds: [...state.hintedCardIds, action.cardId],
      };
    }

    case 'FINISH_GAME':
      return {
        ...state,
        phase: 'finished',
        won: action.won,
      };

    case 'RESTORE_STATE': {
      const { savedState } = action;
      return {
        ...state,
        currentRound: savedState.currentRound ?? state.currentRound,
        foundSets: savedState.foundSets ?? state.foundSets,
        incorrectGuesses: savedState.incorrectGuesses ?? state.incorrectGuesses,
        guessHistory: savedState.guessHistory ?? state.guessHistory,
        hintsUsed: savedState.hintsUsed ?? state.hintsUsed,
        hintedCardIds: savedState.hintedCardIds ?? state.hintedCardIds,
        cards: savedState.cards ?? state.cards,
        won: savedState.won ?? state.won,
        phase: savedState.phase ?? state.phase,
      };
    }

    default:
      return state;
  }
}

interface UseGameStateReturn {
  state: GameState;
  loadPuzzle: (puzzle: SequentialPuzzle, cards: Card[]) => void;
  startGame: () => void;
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  clearSelection: () => void;
  handleCardClick: (cardId: string) => void;
  submitSelection: () => 'valid' | 'invalid' | 'duplicate' | null;
  revealHint: () => string | null;
  clearRemoving: () => void;
  clearAdding: () => void;
  restoreState: (savedState: Partial<GameState>) => void;
}

/**
 * Game state management hook for Trio Sequential Mode.
 */
export function useGameState(): UseGameStateReturn {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const loadPuzzle = useCallback((puzzle: SequentialPuzzle, cards: Card[]) => {
    dispatch({ type: 'LOAD_PUZZLE', puzzle, cards });
  }, []);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const selectCard = useCallback((cardId: string) => {
    dispatch({ type: 'SELECT_CARD', cardId });
  }, []);

  const deselectCard = useCallback((cardId: string) => {
    dispatch({ type: 'DESELECT_CARD', cardId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const clearRemoving = useCallback(() => {
    dispatch({ type: 'CLEAR_REMOVING' });
  }, []);

  const clearAdding = useCallback(() => {
    dispatch({ type: 'CLEAR_ADDING' });
  }, []);

  // Handle card click - just selection, no auto-validation
  const handleCardClick = useCallback((cardId: string) => {
    // If card is already selected, deselect it
    if (state.selectedCardIds.includes(cardId)) {
      dispatch({ type: 'DESELECT_CARD', cardId });
      return;
    }

    // If card is being removed, ignore
    if (state.removingCardIds.includes(cardId)) {
      return;
    }

    // If we already have 3, don't select more
    if (state.selectedCardIds.length >= 3) {
      return;
    }

    // Select the card
    dispatch({ type: 'SELECT_CARD', cardId });
  }, [state.selectedCardIds, state.removingCardIds]);

  // Manual submit selection
  const submitSelection = useCallback((): 'valid' | 'invalid' | 'duplicate' | null => {
    // Must have exactly 3 cards selected
    if (state.selectedCardIds.length !== 3) {
      return null;
    }

    const cardIds = state.selectedCardIds as [string, string, string];

    // Check for duplicate guess in this round
    if (isDuplicateGuess(cardIds, state.currentRound, state.guessHistory)) {
      return 'duplicate';
    }

    // Get the selected cards
    const selectedCards = cardIds.map(id =>
      state.cards.find(c => c.id === id)!
    );

    if (isValidSet(selectedCards as [Card, Card, Card])) {
      // Valid set found
      const foundSet: FoundSet = {
        cardIds,
        foundAt: Date.now(),
        round: state.currentRound,
      };
      // Delay slightly to show selection before removal
      setTimeout(() => {
        dispatch({ type: 'FOUND_SET', set: foundSet, lastFoundCards: selectedCards });
      }, 200);
      return 'valid';
    } else {
      // Invalid set - record the attempt
      const attempt: GuessAttempt = {
        cardIds,
        round: state.currentRound,
        wasCorrect: false,
      };
      dispatch({ type: 'INVALID_GUESS', attempt });
      return 'invalid';
    }
  }, [state.selectedCardIds, state.cards, state.currentRound, state.guessHistory]);

  // Use a hint - reveals the next card in the valid set
  const revealHint = useCallback((): string | null => {
    if (state.hintsUsed >= GAME_CONFIG.MAX_HINTS) {
      return null;
    }

    if (!state.puzzle) {
      return null;
    }

    // Get the valid set for current round
    const roundData = state.puzzle.rounds[state.currentRound - 1];
    if (!roundData) {
      return null;
    }

    // Find the next card to reveal (based on hintsUsed)
    const targetPosition = roundData.validSetIndices[state.hintsUsed];
    const targetCard = state.cards.find(c => c.position === targetPosition);

    if (!targetCard) {
      return null;
    }

    // Don't hint a card that's already hinted
    if (state.hintedCardIds.includes(targetCard.id)) {
      return null;
    }

    dispatch({ type: 'USE_HINT', cardId: targetCard.id });
    return targetCard.id;
  }, [state.puzzle, state.currentRound, state.hintsUsed, state.cards, state.hintedCardIds]);

  // Restore state from storage
  const restoreState = useCallback((savedState: Partial<GameState>) => {
    dispatch({ type: 'RESTORE_STATE', savedState });
  }, []);

  return {
    state,
    loadPuzzle,
    startGame,
    selectCard,
    deselectCard,
    clearSelection,
    handleCardClick,
    submitSelection,
    revealHint,
    clearRemoving,
    clearAdding,
    restoreState,
  };
}

export default useGameState;
