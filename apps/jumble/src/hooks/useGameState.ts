'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Board, FoundWord, GameStatus, Position } from '@/types';
import { generateBoard, getPuzzleNumber, getTodayDateString } from '@/lib/boardGenerator';
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
  hasInProgressGame,
} from '@/lib/storage';
import { TIMER_DURATION } from '@/constants/gameConfig';
import { useTimer } from './useTimer';

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
  isWordAlreadyFound: (word: string) => boolean;
  regeneratePuzzle: () => void;
  hasInProgress: boolean;
  hasCompleted: boolean;
}

export function useGameState(): UseGameStateReturn {
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

        const today = new Date();
        const newBoard = generateBoard(today);
        const number = getPuzzleNumber(today);

        setBoard(newBoard);
        setPuzzleNumber(number);

        // Check saved state and set flags for landing mode
        const completed = hasPlayedToday();
        const inProgress = hasInProgressGame();
        setHasCompleted(completed);
        setHasInProgress(inProgress);

        // Check if already played today
        if (completed) {
          // Restore found words from completed game
          const todayResult = getTodayResult();
          if (todayResult?.foundWords) {
            setFoundWords(todayResult.foundWords);
          }
          setStatus('finished');
        } else {
          setStatus('ready');
        }

        // Find all valid words (for scoring max and results)
        const validWords = findAllValidWords(newBoard);
        setAllValidWords(validWords);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    }

    init();
  }, []);

  // Save in-progress state when playing
  useEffect(() => {
    if (status === 'playing') {
      saveInProgressState(foundWords, timeRemaining);
    }
  }, [status, foundWords, timeRemaining]);

  // Clear in-progress state when finished
  useEffect(() => {
    if (status === 'finished') {
      clearInProgressState();
    }
  }, [status]);

  // Save daily result when game finishes (timer or manual)
  useEffect(() => {
    if (status === 'finished' && foundWords.length > 0) {
      saveDailyResult({
        puzzleNumber,
        date: getTodayDateString(),
        foundWords,
        totalPossibleWords: allValidWords.size,
        score: totalScore,
        maxPossibleScore,
      });
    }
  }, [status, foundWords, puzzleNumber, allValidWords.size, totalScore, maxPossibleScore]);

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
    isWordAlreadyFound,
    regeneratePuzzle,
    hasInProgress,
    hasCompleted,
  };
}
