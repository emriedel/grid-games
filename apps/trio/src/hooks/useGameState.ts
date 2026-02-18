'use client';

import { useReducer, useCallback } from 'react';
import type { GameState, GameAction, SequentialPuzzle, Card, RoundOutcome } from '@/types';
import { isValidSet } from '@/lib/setLogic';
import { GAME_CONFIG } from '@/constants';
import { getReplacementCards } from '@/lib/puzzleLoader';

const initialState: GameState = {
  phase: 'landing',
  puzzle: null,
  currentRound: 1,
  cards: [],
  selectedCardIds: [],
  roundOutcomes: ['pending', 'pending', 'pending', 'pending', 'pending'],
  hintUsedInRound: [false, false, false, false, false],
  allTrios: [],
  revealingCorrectTrio: false,
  correctTrioCardIds: [],
  hintedCardIds: [],
  lastFoundSet: undefined,
  removingCardIds: [],
  addingCardIds: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PUZZLE':
      return {
        ...state,
        puzzle: action.puzzle,
        cards: action.cards,
        currentRound: 1,
        selectedCardIds: [],
        roundOutcomes: ['pending', 'pending', 'pending', 'pending', 'pending'],
        hintUsedInRound: [false, false, false, false, false],
        allTrios: [],
        revealingCorrectTrio: false,
        correctTrioCardIds: [],
        hintedCardIds: [],
        lastFoundSet: undefined,
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
      // Can't select during reveal
      if (state.revealingCorrectTrio) {
        return state;
      }
      return {
        ...state,
        selectedCardIds: [...state.selectedCardIds, action.cardId],
      };
    }

    case 'DESELECT_CARD':
      // Can't deselect during reveal
      if (state.revealingCorrectTrio) {
        return state;
      }
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
      const roundIndex = state.currentRound - 1;
      const newRound = state.currentRound + 1;
      const isComplete = newRound > GAME_CONFIG.ROUND_COUNT;

      // Update round outcome based on whether hint was used
      const newRoundOutcomes = [...state.roundOutcomes] as RoundOutcome[];
      newRoundOutcomes[roundIndex] = action.usedHint ? 'found-with-hint' : 'found';

      // Add to all trios
      const newAllTrios = [...state.allTrios, action.lastFoundCards];

      // Mark found cards as removing
      const removingCardIds = action.lastFoundCards.map(c => c.id);

      return {
        ...state,
        selectedCardIds: [],
        removingCardIds,
        roundOutcomes: newRoundOutcomes,
        allTrios: newAllTrios,
        lastFoundSet: action.lastFoundCards,
        // Clear hints for new round (hinted cards were just found)
        hintedCardIds: [],
        phase: isComplete ? 'finished' : state.phase,
      };
    }

    case 'MISSED_ROUND': {
      const roundIndex = state.currentRound - 1;

      // Update round outcome to missed
      const newRoundOutcomes = [...state.roundOutcomes] as RoundOutcome[];
      newRoundOutcomes[roundIndex] = 'missed';

      // Add correct trio to allTrios
      const newAllTrios = [...state.allTrios, action.correctTrio];

      return {
        ...state,
        selectedCardIds: [],
        roundOutcomes: newRoundOutcomes,
        allTrios: newAllTrios,
        revealingCorrectTrio: true,
        correctTrioCardIds: action.correctTrioCardIds,
        lastFoundSet: action.correctTrio,
      };
    }

    case 'ADVANCE_AFTER_MISS': {
      const newRound = state.currentRound + 1;
      const isComplete = newRound > GAME_CONFIG.ROUND_COUNT;

      // Set removingCardIds to the correct trio that was revealed
      const removingCardIds = [...state.correctTrioCardIds];

      return {
        ...state,
        revealingCorrectTrio: false,
        correctTrioCardIds: [],
        removingCardIds,
        hintedCardIds: [],
        phase: isComplete ? 'finished' : state.phase,
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

    case 'USE_HINT': {
      const roundIndex = state.currentRound - 1;
      // Check if hint already used this round
      if (state.hintUsedInRound[roundIndex]) {
        return state;
      }

      // Mark hint as used for this round
      const newHintUsedInRound = [...state.hintUsedInRound];
      newHintUsedInRound[roundIndex] = true;

      return {
        ...state,
        hintUsedInRound: newHintUsedInRound,
        hintedCardIds: [...state.hintedCardIds, action.cardId],
      };
    }

    case 'RESTORE_STATE': {
      const { savedState } = action;
      return {
        ...state,
        currentRound: savedState.currentRound ?? state.currentRound,
        roundOutcomes: savedState.roundOutcomes ?? state.roundOutcomes,
        hintUsedInRound: savedState.hintUsedInRound ?? state.hintUsedInRound,
        allTrios: savedState.allTrios ?? state.allTrios,
        hintedCardIds: savedState.hintedCardIds ?? state.hintedCardIds,
        cards: savedState.cards ?? state.cards,
        lastFoundSet: savedState.lastFoundSet ?? state.lastFoundSet,
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
  submitSelection: () => 'valid' | 'invalid' | null;
  revealHint: () => string | null;
  clearRemoving: () => void;
  clearAdding: () => void;
  restoreState: (savedState: Partial<GameState>) => void;
  dispatchMissedRound: (correctTrio: Card[], correctTrioCardIds: string[]) => void;
  dispatchAdvanceAfterMiss: () => void;
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

    // If we're revealing the correct trio, ignore
    if (state.revealingCorrectTrio) {
      return;
    }

    // If we already have 3, don't select more
    if (state.selectedCardIds.length >= 3) {
      return;
    }

    // Select the card
    dispatch({ type: 'SELECT_CARD', cardId });
  }, [state.selectedCardIds, state.removingCardIds, state.revealingCorrectTrio]);

  // Manual submit selection
  const submitSelection = useCallback((): 'valid' | 'invalid' | null => {
    // Must have exactly 3 cards selected
    if (state.selectedCardIds.length !== 3) {
      return null;
    }

    // Can't submit during reveal
    if (state.revealingCorrectTrio) {
      return null;
    }

    const cardIds = state.selectedCardIds as [string, string, string];

    // Get the selected cards
    const selectedCards = cardIds.map(id =>
      state.cards.find(c => c.id === id)!
    );

    if (isValidSet(selectedCards as [Card, Card, Card])) {
      // Valid set found - check if hint was used this round
      const roundIndex = state.currentRound - 1;
      const usedHint = state.hintUsedInRound[roundIndex];

      // Delay to show success animation before removal (400ms for green ring animation)
      setTimeout(() => {
        dispatch({ type: 'FOUND_SET', lastFoundCards: selectedCards, usedHint });
      }, 400);
      return 'valid';
    } else {
      // Invalid set - this round is now missed
      return 'invalid';
    }
  }, [state.selectedCardIds, state.cards, state.currentRound, state.hintUsedInRound, state.revealingCorrectTrio]);

  // Dispatch missed round action (called from Game.tsx after invalid submission)
  const dispatchMissedRound = useCallback((correctTrio: Card[], correctTrioCardIds: string[]) => {
    dispatch({ type: 'MISSED_ROUND', correctTrio, correctTrioCardIds });
  }, []);

  // Dispatch advance after miss action (called from Game.tsx after reveal timer)
  const dispatchAdvanceAfterMiss = useCallback(() => {
    dispatch({ type: 'ADVANCE_AFTER_MISS' });
  }, []);

  // Use a hint - reveals the first card in the valid set (one per round)
  const revealHint = useCallback((): string | null => {
    const roundIndex = state.currentRound - 1;

    // Check if hint already used this round
    if (state.hintUsedInRound[roundIndex]) {
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

    // Always reveal the first card in the valid set
    const targetPosition = roundData.validSetIndices[0];
    const targetCard = state.cards.find(c => c.position === targetPosition);

    if (!targetCard) {
      return null;
    }

    dispatch({ type: 'USE_HINT', cardId: targetCard.id });
    return targetCard.id;
  }, [state.puzzle, state.currentRound, state.hintUsedInRound, state.cards]);

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
    dispatchMissedRound,
    dispatchAdvanceAfterMiss,
  };
}

export default useGameState;
