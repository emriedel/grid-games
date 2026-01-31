'use client';

import { useReducer, useCallback } from 'react';
import { GameState, Puzzle, Piece, Direction, Move, Position } from '@/types';
import { simulateSlide, applyMove, isTargetOnGoal, wouldPieceMove } from '@/lib/gameLogic';
import { SLIDE_ANIMATION_DURATION } from '@/constants/gameConfig';

type GameAction =
  | { type: 'START_GAME'; puzzle: Puzzle }
  | { type: 'SELECT_PIECE'; pieceId: string }
  | { type: 'MOVE_START' }
  | { type: 'MOVE_END'; pieces: Piece[]; didWin: boolean; move: Move }
  | { type: 'RESET' }
  | { type: 'SET_FINISHED' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'playing',
        puzzle: action.puzzle,
        pieces: action.puzzle.pieces.map((p) => ({ ...p })),
        selectedPieceId: null,
        moveCount: 0,
        isAnimating: false,
        moveHistory: [],
      };

    case 'SELECT_PIECE':
      return {
        ...state,
        selectedPieceId: state.selectedPieceId === action.pieceId ? null : action.pieceId,
      };

    case 'MOVE_START':
      return {
        ...state,
        isAnimating: true,
      };

    case 'MOVE_END':
      return {
        ...state,
        pieces: action.pieces,
        moveCount: state.moveCount + 1,
        isAnimating: false,
        phase: action.didWin ? 'finished' : state.phase,
        moveHistory: [...state.moveHistory, action.move],
      };

    case 'RESET':
      if (!state.puzzle) return state;
      return {
        ...state,
        pieces: state.puzzle.pieces.map((p) => ({ ...p })),
        selectedPieceId: null,
        moveCount: 0,
        isAnimating: false,
        phase: 'playing',
        moveHistory: [],
      };

    case 'SET_FINISHED':
      return {
        ...state,
        phase: 'finished',
      };

    default:
      return state;
  }
}

const initialState: GameState = {
  phase: 'landing',
  puzzle: null,
  pieces: [],
  selectedPieceId: null,
  moveCount: 0,
  isAnimating: false,
  moveHistory: [],
};

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const startGame = useCallback((puzzle: Puzzle) => {
    dispatch({ type: 'START_GAME', puzzle });
  }, []);

  const selectPiece = useCallback((pieceId: string) => {
    if (state.isAnimating) return;
    dispatch({ type: 'SELECT_PIECE', pieceId });
  }, [state.isAnimating]);

  const movePiece = useCallback(
    (direction: Direction) => {
      if (!state.puzzle || !state.selectedPieceId || state.isAnimating) return;

      // Check if the move would actually move the piece
      if (!wouldPieceMove(state.puzzle.board, state.pieces, state.selectedPieceId, direction)) {
        return;
      }

      // Get starting position
      const piece = state.pieces.find((p) => p.id === state.selectedPieceId);
      if (!piece) return;
      const startPos: Position = { ...piece.position };

      // Start animation
      dispatch({ type: 'MOVE_START' });

      // Calculate end position
      const endPos = simulateSlide(
        state.puzzle.board,
        state.pieces,
        state.selectedPieceId,
        direction
      );

      // Apply move
      const newPieces = applyMove(state.pieces, state.selectedPieceId, endPos);

      // Check win condition
      const didWin = isTargetOnGoal(newPieces, state.puzzle.board.goal);

      // Create move record
      const move: Move = {
        pieceId: state.selectedPieceId,
        direction,
        from: startPos,
        to: endPos,
      };

      // Wait for animation then update state
      setTimeout(() => {
        dispatch({ type: 'MOVE_END', pieces: newPieces, didWin, move });
      }, SLIDE_ANIMATION_DURATION);
    },
    [state.puzzle, state.selectedPieceId, state.pieces, state.isAnimating]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setFinished = useCallback(() => {
    dispatch({ type: 'SET_FINISHED' });
  }, []);

  return {
    state,
    startGame,
    selectPiece,
    movePiece,
    reset,
    setFinished,
  };
}
