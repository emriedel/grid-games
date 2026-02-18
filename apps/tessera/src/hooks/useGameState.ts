'use client';

import { useReducer, useCallback } from 'react';
import type {
  GameState,
  GameAction,
  Puzzle,
  PlacedPiece,
  Position,
  PentominoId,
  Rotation,
} from '@/types';
import {
  createBoardFromShape,
  canPlacePiece,
  placePiece,
  removePiece,
  clearBoard,
  isPuzzleComplete,
  applyPlacedPieces,
} from '@/lib/gameLogic';
import { nextRotation } from '@/constants/pentominoes';

const INITIAL_STATE: GameState = {
  phase: 'landing',
  puzzle: null,
  board: null,
  availablePieces: [],
  placedPieces: [],
  selectedPieceId: null,
  selectedRotation: 0,
  won: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_PUZZLE': {
      const { puzzle } = action;
      const board = createBoardFromShape(puzzle.shape);
      return {
        ...INITIAL_STATE,
        phase: 'landing',
        puzzle,
        board,
        availablePieces: [...puzzle.pentominoIds],
      };
    }

    case 'START_GAME': {
      return {
        ...state,
        phase: 'playing',
      };
    }

    case 'SELECT_PIECE': {
      const { pentominoId } = action;
      // If already selected, rotate instead
      if (state.selectedPieceId === pentominoId) {
        return {
          ...state,
          selectedRotation: nextRotation(state.selectedRotation),
        };
      }
      return {
        ...state,
        selectedPieceId: pentominoId,
        selectedRotation: 0,
      };
    }

    case 'DESELECT_PIECE': {
      return {
        ...state,
        selectedPieceId: null,
        selectedRotation: 0,
      };
    }

    case 'ROTATE_PIECE': {
      if (!state.selectedPieceId) return state;
      return {
        ...state,
        selectedRotation: nextRotation(state.selectedRotation),
      };
    }

    case 'PLACE_PIECE': {
      const { position } = action;
      if (!state.selectedPieceId || !state.board) return state;

      const pentominoId = state.selectedPieceId;
      const rotation = state.selectedRotation;

      // Check if placement is valid
      if (!canPlacePiece(state.board, pentominoId, position, rotation)) {
        return state;
      }

      // Place the piece
      const newBoard = placePiece(state.board, pentominoId, position, rotation);
      const newPlacedPiece: PlacedPiece = { pentominoId, position, rotation };

      // Remove from available, add to placed
      const newAvailablePieces = state.availablePieces.filter((id) => id !== pentominoId);
      const newPlacedPieces = [...state.placedPieces, newPlacedPiece];

      // Check for win
      const won = isPuzzleComplete(newBoard);

      return {
        ...state,
        board: newBoard,
        availablePieces: newAvailablePieces,
        placedPieces: newPlacedPieces,
        selectedPieceId: null,
        selectedRotation: 0,
        phase: won ? 'finished' : state.phase,
        won,
      };
    }

    case 'REMOVE_PIECE': {
      const { pentominoId } = action;
      if (!state.board) return state;

      // Find the placed piece
      const placedPiece = state.placedPieces.find((p) => p.pentominoId === pentominoId);
      if (!placedPiece) return state;

      // Remove from board
      const newBoard = removePiece(state.board, pentominoId);

      // Remove from placed, add back to available
      const newPlacedPieces = state.placedPieces.filter((p) => p.pentominoId !== pentominoId);
      const newAvailablePieces = [...state.availablePieces, pentominoId];

      return {
        ...state,
        board: newBoard,
        placedPieces: newPlacedPieces,
        availablePieces: newAvailablePieces,
        // Select the removed piece for immediate re-placement
        selectedPieceId: pentominoId,
        selectedRotation: placedPiece.rotation,
      };
    }

    case 'ROTATE_PLACED_PIECE': {
      const { pentominoId } = action;
      if (!state.board) return state;

      // Find the placed piece
      const placedPiece = state.placedPieces.find((p) => p.pentominoId === pentominoId);
      if (!placedPiece) return state;

      // Calculate next rotation
      const newRotation = nextRotation(placedPiece.rotation);

      // Remove piece from board temporarily
      const boardWithoutPiece = removePiece(state.board, pentominoId);

      // Check if the new rotation is valid at the same position
      if (!canPlacePiece(boardWithoutPiece, pentominoId, placedPiece.position, newRotation)) {
        // Rotation invalid - return state unchanged (caller can show toast)
        return state;
      }

      // Place piece with new rotation
      const newBoard = placePiece(boardWithoutPiece, pentominoId, placedPiece.position, newRotation);

      // Update the placed piece with new rotation
      const newPlacedPieces = state.placedPieces.map((p) =>
        p.pentominoId === pentominoId
          ? { ...p, rotation: newRotation }
          : p
      );

      return {
        ...state,
        board: newBoard,
        placedPieces: newPlacedPieces,
      };
    }

    case 'CLEAR_ALL': {
      if (!state.board || !state.puzzle) return state;

      const newBoard = clearBoard(state.board);

      return {
        ...state,
        board: newBoard,
        placedPieces: [],
        availablePieces: [...state.puzzle.pentominoIds],
        selectedPieceId: null,
        selectedRotation: 0,
      };
    }

    case 'FINISH_GAME': {
      return {
        ...state,
        phase: 'finished',
        won: true,
      };
    }

    case 'RESTORE_STATE': {
      const { state: savedState } = action;
      if (!state.puzzle || !state.board) return state;

      // Rebuild board from placed pieces
      const baseBoard = createBoardFromShape(state.puzzle.shape);
      const placedPieces = savedState.placedPieces ?? [];
      const newBoard = applyPlacedPieces(baseBoard, placedPieces);

      // Determine available pieces
      const placedIds = new Set(placedPieces.map((p) => p.pentominoId));
      const availablePieces = state.puzzle.pentominoIds.filter((id) => !placedIds.has(id));

      // Check for completed state
      const won = isPuzzleComplete(newBoard);

      return {
        ...state,
        board: newBoard,
        placedPieces,
        availablePieces,
        phase: won ? 'finished' : 'playing',
        won,
      };
    }

    default:
      return state;
  }
}

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  const loadPuzzle = useCallback((puzzle: Puzzle) => {
    dispatch({ type: 'LOAD_PUZZLE', puzzle });
  }, []);

  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  const selectPiece = useCallback((pentominoId: PentominoId) => {
    dispatch({ type: 'SELECT_PIECE', pentominoId });
  }, []);

  const deselectPiece = useCallback(() => {
    dispatch({ type: 'DESELECT_PIECE' });
  }, []);

  const rotatePiece = useCallback(() => {
    dispatch({ type: 'ROTATE_PIECE' });
  }, []);

  const tryPlacePiece = useCallback((position: Position) => {
    dispatch({ type: 'PLACE_PIECE', position });
  }, []);

  const removePieceFromBoard = useCallback((pentominoId: PentominoId) => {
    dispatch({ type: 'REMOVE_PIECE', pentominoId });
  }, []);

  const rotatePlacedPiece = useCallback((pentominoId: PentominoId): boolean => {
    // Get current state to check if rotation succeeded
    const prevPlacedPieces = state.placedPieces;
    dispatch({ type: 'ROTATE_PLACED_PIECE', pentominoId });
    // Note: This returns immediately - caller should check if rotation changed
    // For now, return true optimistically (toast will be handled differently)
    return true;
  }, [state.placedPieces]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const restoreState = useCallback((savedState: Partial<GameState>) => {
    dispatch({ type: 'RESTORE_STATE', state: savedState });
  }, []);

  return {
    state,
    loadPuzzle,
    startGame,
    selectPiece,
    deselectPiece,
    rotatePiece,
    tryPlacePiece,
    removePieceFromBoard,
    rotatePlacedPiece,
    clearAll,
    restoreState,
  };
}
