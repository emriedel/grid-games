'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Board, FoundWord, GameStatus, Position } from '@/types';
import { loadDictionary, isValidWord } from '@/lib/dictionary';
import { getWordFromPath, findAllValidWords, validatePath } from '@/lib/wordValidator';
import { MIN_WORD_LENGTH } from '@/constants/gameConfig';
import { calculateWordScore, calculateTotalScore, calculateMaxScore } from '@/lib/scoring';
import {
  findPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  getTodayPuzzleNumber,
} from '@/lib/storage';
import {
  getDailyPuzzle,
  getPuzzleByNumber,
  getPuzzleFromPool,
  type DailyPuzzle,
} from '@/lib/puzzleGenerator';
import { TIMER_DURATION, calculateStars, STAR_THRESHOLDS } from '@/constants/gameConfig';
import { useTimer } from './useTimer';

interface UseGameStateProps {
  /** Optional puzzle number for archive mode */
  archivePuzzleNumber?: number | null;
}

export type SubmitWordResult =
  | { success: true }
  | { success: false; reason: 'already-found' | 'too-short' | 'not-in-list' };

interface UseGameStateReturn {
  board: Board;
  foundWords: FoundWord[];
  currentPath: Position[];
  currentWord: string;
  status: GameStatus;
  timeRemaining: number;
  puzzleNumber: number;
  puzzleId: string | undefined;
  totalScore: number;
  allValidWords: Map<string, Position[]>;
  maxPossibleScore: number;
  stars: number;
  setCurrentPath: (path: Position[]) => void;
  submitWord: (path: Position[]) => SubmitWordResult;
  startGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  isWordAlreadyFound: (word: string) => boolean;
  regeneratePuzzle: () => void;
  hasInProgress: boolean;
  hasCompleted: boolean;
  isArchiveMode: boolean;
}

export function useGameState(props?: UseGameStateProps): UseGameStateReturn {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const poolId = searchParams.get('poolId');

  const archivePuzzleNumber = props?.archivePuzzleNumber;
  const isArchiveMode = archivePuzzleNumber !== undefined && archivePuzzleNumber !== null;
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

  const [board, setBoard] = useState<Board>([]);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [puzzleId, setPuzzleId] = useState<string | undefined>(undefined);
  const [allValidWords, setAllValidWords] = useState<Map<string, Position[]>>(new Map());
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [hasInProgress, setHasInProgress] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const handleGameEnd = useCallback(() => {
    setStatus('finished');
  }, []);

  const { timeRemaining, start: startTimer, reset: resetTimer, setTime } = useTimer(
    TIMER_DURATION,
    handleGameEnd
  );

  // Calculate current word from path
  const currentWord = useMemo(() => {
    if (board.length === 0 || currentPath.length === 0) return '';
    return getWordFromPath(board, currentPath);
  }, [board, currentPath]);

  // Calculate total score
  const totalScore = useMemo(() => calculateTotalScore(foundWords), [foundWords]);

  // Calculate stars based on score
  const stars = useMemo(() => {
    return calculateStars(totalScore);
  }, [totalScore]);

  // Check if word already found
  const isWordAlreadyFound = useCallback(
    (word: string) => {
      return foundWords.some((fw) => fw.word === word);
    },
    [foundWords]
  );

  // Initialize game
  useEffect(() => {
    async function init() {
      try {
        await loadDictionary();

        let puzzle: DailyPuzzle;

        // Check for debug pool puzzle first
        if (isDebug && poolId) {
          const poolPuzzle = await getPuzzleFromPool(poolId);
          if (poolPuzzle) {
            puzzle = poolPuzzle;
          } else {
            puzzle = await getDailyPuzzle();
          }
        } else if (isArchiveMode) {
          puzzle = await getPuzzleByNumber(activePuzzleNumber);
        } else {
          puzzle = await getDailyPuzzle();
        }

        setBoard(puzzle.board);
        setPuzzleNumber(puzzle.puzzleNumber || activePuzzleNumber);
        setPuzzleId(puzzle.puzzleId);
        setMaxPossibleScore(puzzle.maxPossibleScore);

        // Find all valid words
        const validWords = findAllValidWords(puzzle.board);
        setAllValidWords(validWords);

        // Debug logging
        if (isDebug) {
          console.log('[Jumble Debug] Puzzle #' + (puzzle.puzzleNumber || activePuzzleNumber));
          console.log('[Jumble Debug] Puzzle ID:', puzzle.puzzleId);
          console.log('[Jumble Debug] Max possible score:', puzzle.maxPossibleScore);
          console.log('[Jumble Debug] Total words:', validWords.size);
          console.log('[Jumble Debug] Star thresholds:', STAR_THRESHOLDS);
          console.log('[Jumble Debug] Pre-generated:', puzzle.isPreGenerated);
        }

        // Check saved state (skip if debug mode without poolId)
        const shouldCheckSavedState = !isDebug || !poolId;
        if (shouldCheckSavedState) {
          const puzzleState = findPuzzleState(puzzle.puzzleNumber || activePuzzleNumber);

          if (puzzleState?.status === 'completed') {
            // Puzzle is completed
            setFoundWords(puzzleState.data.foundWords);
            setHasCompleted(true);
            setHasInProgress(false);

            if (isArchiveMode) {
              // Archive: go directly to finished state (game board view)
              setStatus('finished');
            } else {
              // Today: show landing with completed mode first
              setStatus('ready');
            }
          } else if (puzzleState?.status === 'in-progress') {
            // Puzzle is in-progress
            setFoundWords(puzzleState.data.foundWords);
            setTime(puzzleState.data.timeRemaining ?? TIMER_DURATION);
            setHasCompleted(false);
            setHasInProgress(true);

            if (isArchiveMode) {
              // Archive: go directly to playing
              setStatus('playing');
              startTimer();
            } else {
              // Today: show landing with in-progress mode
              setStatus('ready');
            }
          } else {
            // Fresh puzzle
            setHasCompleted(false);
            setHasInProgress(false);

            if (isArchiveMode) {
              // Archive: go directly to playing
              setStatus('playing');
              resetTimer(TIMER_DURATION);
              startTimer();
            } else {
              // Today: show landing
              setStatus('ready');
            }
          }
        } else {
          // Debug mode with pool puzzle - start fresh
          setHasCompleted(false);
          setHasInProgress(false);
          setStatus('ready');
        }
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    }

    init();
  }, [isArchiveMode, activePuzzleNumber, isDebug, poolId]);

  // Save in-progress state when playing
  useEffect(() => {
    if (status === 'playing' && foundWords.length > 0 && puzzleId) {
      savePuzzleState(
        puzzleNumber || activePuzzleNumber,
        {
          puzzleNumber: puzzleNumber || activePuzzleNumber,
          puzzleId,
          status: 'in-progress',
          data: {
            foundWords,
            timeRemaining,
          },
        },
        puzzleId
      );
    }
  }, [status, foundWords, timeRemaining, puzzleNumber, activePuzzleNumber, puzzleId]);

  // Save completion state when game finishes
  useEffect(() => {
    if (status === 'finished' && foundWords.length > 0 && puzzleId) {
      const finalStars = calculateStars(totalScore);
      savePuzzleState(
        puzzleNumber || activePuzzleNumber,
        {
          puzzleNumber: puzzleNumber || activePuzzleNumber,
          puzzleId,
          status: 'completed',
          data: {
            foundWords,
            totalPossibleWords: allValidWords.size,
            score: totalScore,
            maxPossibleScore,
            stars: finalStars,
          },
        },
        puzzleId
      );
    }
  }, [
    status,
    foundWords,
    puzzleNumber,
    activePuzzleNumber,
    puzzleId,
    allValidWords.size,
    totalScore,
    maxPossibleScore,
  ]);

  // Start game (fresh)
  const startGame = useCallback(() => {
    if (status !== 'ready') return;

    setStatus('playing');
    setFoundWords([]);
    resetTimer(TIMER_DURATION);
    startTimer();
  }, [status, resetTimer, startTimer]);

  // Resume game (from in-progress state)
  const resumeGame = useCallback(() => {
    if (status !== 'ready') return;

    const puzzleState = findPuzzleState(puzzleNumber || activePuzzleNumber);
    if (puzzleState?.status === 'in-progress') {
      setFoundWords(puzzleState.data.foundWords);
      setTime(puzzleState.data.timeRemaining ?? TIMER_DURATION);
      setStatus('playing');
      startTimer();
    } else {
      // Fall back to fresh start
      startGame();
    }
  }, [status, puzzleNumber, activePuzzleNumber, setTime, startTimer, startGame]);

  // End game manually
  const endGame = useCallback(() => {
    if (status !== 'playing') return;
    setStatus('finished');
  }, [status]);

  // Reset game (replay from scratch)
  const resetGame = useCallback(() => {
    // Clear saved state for this puzzle
    clearPuzzleState(puzzleNumber || activePuzzleNumber, puzzleId);

    // Reset game state
    setFoundWords([]);
    setCurrentPath([]);
    setHasCompleted(false);
    setHasInProgress(false);

    // Reset timer and start playing
    resetTimer(TIMER_DURATION);
    setStatus('playing');
    startTimer();
  }, [puzzleNumber, activePuzzleNumber, puzzleId, resetTimer, startTimer]);

  // Regenerate puzzle (debug mode only)
  const regeneratePuzzle = useCallback(async () => {
    // For debug, load a random pool puzzle
    const puzzle = await getDailyPuzzle();

    setBoard(puzzle.board);
    setPuzzleNumber(puzzle.puzzleNumber);
    setPuzzleId(puzzle.puzzleId);
    setMaxPossibleScore(puzzle.maxPossibleScore);
    setStatus('ready');
    setFoundWords([]);
    setCurrentPath([]);
    resetTimer(TIMER_DURATION);

    // Find all valid words for the new board
    const validWords = findAllValidWords(puzzle.board);
    setAllValidWords(validWords);
  }, [resetTimer]);

  // Submit a word
  const submitWord = useCallback(
    (path: Position[]): SubmitWordResult => {
      if (status !== 'playing' || path.length === 0) {
        return { success: false, reason: 'too-short' };
      }

      const word = getWordFromPath(board, path);

      // Check if already found
      if (isWordAlreadyFound(word)) {
        return { success: false, reason: 'already-found' };
      }

      // Check word length
      if (word.length < MIN_WORD_LENGTH) {
        return { success: false, reason: 'too-short' };
      }

      // Check if in dictionary (validatePath also checks this, but we want specific feedback)
      if (!isValidWord(word)) {
        return { success: false, reason: 'not-in-list' };
      }

      // Validate the path geometry (adjacency, no repeated tiles)
      if (!validatePath(board, path)) {
        return { success: false, reason: 'not-in-list' };
      }

      // Add to found words
      const score = calculateWordScore(word);
      setFoundWords((prev) => [...prev, { word, score, path }]);

      // Haptic feedback on mobile
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      return { success: true };
    },
    [status, board, isWordAlreadyFound]
  );

  return {
    board,
    foundWords,
    currentPath,
    currentWord,
    status,
    timeRemaining,
    puzzleNumber,
    puzzleId,
    totalScore,
    allValidWords,
    maxPossibleScore,
    stars,
    setCurrentPath,
    submitWord,
    startGame,
    resumeGame,
    endGame,
    resetGame,
    isWordAlreadyFound,
    regeneratePuzzle,
    hasInProgress,
    hasCompleted,
    isArchiveMode,
  };
}
