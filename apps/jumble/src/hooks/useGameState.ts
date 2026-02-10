'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDateForPuzzleNumber, parseDateString } from '@grid-games/shared';
import { Board, FoundWord, GameStatus, Position } from '@/types';
import { generateBoard, getPuzzleNumber } from '@/lib/boardGenerator';
import { loadDictionary } from '@/lib/dictionary';
import { getWordFromPath, findAllValidWords, validatePath } from '@/lib/wordValidator';
import { calculateWordScore, calculateTotalScore, calculateMaxScore } from '@/lib/scoring';
import {
  hasPlayedToday,
  getTodayResult,
  saveDailyResult,
  getInProgressState,
  saveInProgressState,
  clearInProgressState,
  clearPuzzleState,
  hasInProgressGame,
  getPuzzleState,
  savePuzzleState,
  isPuzzleCompleted,
  isPuzzleInProgress,
  getTodayPuzzleNumber,
} from '@/lib/storage';
import { TIMER_DURATION } from '@/constants/gameConfig';
import { useTimer } from './useTimer';

// Base date for puzzle numbering
// IMPORTANT: Use 'T00:00:00' to force local timezone interpretation
const PUZZLE_BASE_DATE = new Date('2026-01-01T00:00:00');

interface UseGameStateProps {
  /** Optional puzzle number for archive mode */
  archivePuzzleNumber?: number | null;
}

interface UseGameStateReturn {
  board: Board;
  foundWords: FoundWord[];
  currentPath: Position[];
  currentWord: string;
  status: GameStatus;
  timeRemaining: number;
  puzzleNumber: number;
  totalScore: number;
  allValidWords: Map<string, Position[]>;
  maxPossibleScore: number;
  setCurrentPath: (path: Position[]) => void;
  submitWord: (path: Position[]) => boolean;
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
  const archivePuzzleNumber = props?.archivePuzzleNumber;
  const isArchiveMode = archivePuzzleNumber !== undefined && archivePuzzleNumber !== null;
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;
  const [board, setBoard] = useState<Board>([]);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [allValidWords, setAllValidWords] = useState<Map<string, Position[]>>(new Map());
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

  // Calculate max possible score
  const maxPossibleScore = useMemo(() => {
    return calculateMaxScore(Array.from(allValidWords.keys()));
  }, [allValidWords]);

  // Check if word already found
  const isWordAlreadyFound = useCallback((word: string) => {
    return foundWords.some((fw) => fw.word === word);
  }, [foundWords]);

  // Initialize game
  useEffect(() => {
    async function init() {
      try {
        await loadDictionary();

        // Generate board for the active puzzle number
        // For archive mode, convert puzzle number to date
        let puzzleDate: Date;
        if (isArchiveMode) {
          const dateString = getDateForPuzzleNumber(PUZZLE_BASE_DATE, activePuzzleNumber);
          puzzleDate = parseDateString(dateString);
        } else {
          puzzleDate = new Date();
        }

        const newBoard = generateBoard(puzzleDate);
        setBoard(newBoard);
        setPuzzleNumber(activePuzzleNumber);

        // Check saved state using unified storage
        const puzzleState = getPuzzleState(activePuzzleNumber);

        if (puzzleState?.status === 'completed') {
          // Puzzle is completed
          setFoundWords(puzzleState.data.foundWords);
          setHasCompleted(true);
          setHasInProgress(false);

          if (isArchiveMode) {
            // Archive: go directly to finished (skip landing)
            setStatus('finished');
          } else {
            // Today: show landing with completed mode
            setStatus('finished');
          }
        } else if (puzzleState?.status === 'in-progress') {
          // Puzzle is in-progress
          setFoundWords(puzzleState.data.foundWords);
          setTime(puzzleState.data.timeRemaining ?? TIMER_DURATION);
          setHasCompleted(false);
          setHasInProgress(true);

          if (isArchiveMode) {
            // Archive: go directly to playing (skip landing)
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
            // Archive: go directly to playing (skip landing)
            setStatus('playing');
            resetTimer(TIMER_DURATION);
            startTimer();
          } else {
            // Today: show landing
            setStatus('ready');
          }
        }

        // Find all valid words (for scoring max and results)
        const validWords = findAllValidWords(newBoard);
        setAllValidWords(validWords);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    }

    init();
  }, [isArchiveMode, activePuzzleNumber]);

  // Save in-progress state when playing (only if meaningful progress made)
  useEffect(() => {
    if (status === 'playing' && foundWords.length > 0) {
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'in-progress',
        data: {
          foundWords,
          timeRemaining,
        },
      });
    }
  }, [status, foundWords, timeRemaining, activePuzzleNumber]);

  // Save completion state when game finishes
  useEffect(() => {
    if (status === 'finished' && foundWords.length > 0) {
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'completed',
        data: {
          foundWords,
          totalPossibleWords: allValidWords.size,
          score: totalScore,
          maxPossibleScore,
        },
      });
    }
  }, [status, foundWords, activePuzzleNumber, allValidWords.size, totalScore, maxPossibleScore]);

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

    const inProgress = getInProgressState();
    if (inProgress) {
      setFoundWords(inProgress.foundWords);
      setTime(inProgress.timeRemaining);
      setStatus('playing');
      startTimer();
    } else {
      // Fall back to fresh start if no in-progress state
      startGame();
    }
  }, [status, setTime, startTimer, startGame]);

  // End game manually
  const endGame = useCallback(() => {
    if (status !== 'playing') return;
    setStatus('finished');
    // Note: saveDailyResult is called by the effect that watches status === 'finished'
  }, [status]);

  // Reset game (replay from scratch)
  const resetGame = useCallback(() => {
    // Clear saved state for this puzzle
    clearPuzzleState(activePuzzleNumber);

    // Reset game state
    setFoundWords([]);
    setCurrentPath([]);
    setHasCompleted(false);
    setHasInProgress(false);

    // Reset timer and start playing
    resetTimer(TIMER_DURATION);
    setStatus('playing');
    startTimer();
  }, [activePuzzleNumber, resetTimer, startTimer]);

  // Regenerate puzzle with random date (debug mode)
  const regeneratePuzzle = useCallback(async () => {
    // Generate a random date for a new puzzle
    const randomDate = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000);
    const newBoard = generateBoard(randomDate);
    const number = getPuzzleNumber(randomDate);

    setBoard(newBoard);
    setPuzzleNumber(number);
    setStatus('ready');
    setFoundWords([]);
    setCurrentPath([]);
    resetTimer(TIMER_DURATION);

    // Find all valid words for the new board
    const validWords = findAllValidWords(newBoard);
    setAllValidWords(validWords);
  }, [resetTimer]);

  // Submit a word
  const submitWord = useCallback((path: Position[]): boolean => {
    if (status !== 'playing' || path.length === 0) return false;

    const word = getWordFromPath(board, path);

    // Check if already found
    if (isWordAlreadyFound(word)) {
      return false;
    }

    // Validate the path and word
    if (!validatePath(board, path)) {
      return false;
    }

    // Add to found words
    const score = calculateWordScore(word);
    setFoundWords((prev) => [...prev, { word, score, path }]);

    // Haptic feedback on mobile
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    return true;
  }, [status, board, isWordAlreadyFound]);

  return {
    board,
    foundWords,
    currentPath,
    currentWord,
    status,
    timeRemaining,
    puzzleNumber,
    totalScore,
    allValidWords,
    maxPossibleScore,
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
