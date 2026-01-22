'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Board, FoundWord, GameStatus, Position } from '@/types';
import { generateBoard, getPuzzleNumber } from '@/lib/boardGenerator';
import { loadDictionary } from '@/lib/dictionary';
import { getWordFromPath, findAllValidWords, validatePath } from '@/lib/wordValidator';
import { calculateWordScore, calculateTotalScore, calculateMaxScore } from '@/lib/scoring';
import { hasPlayedToday, getTodayResult, updateStatsAfterGame, saveDailyResult } from '@/lib/storage';
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
  endGame: () => void;
  isWordAlreadyFound: (word: string) => boolean;
}

export function useGameState(): UseGameStateReturn {
  const [board, setBoard] = useState<Board>([]);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [status, setStatus] = useState<GameStatus>('loading');
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [allValidWords, setAllValidWords] = useState<Map<string, Position[]>>(new Map());

  const handleGameEnd = useCallback(() => {
    setStatus('finished');
  }, []);

  const { timeRemaining, start: startTimer, reset: resetTimer } = useTimer(
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

        // Check if already played today
        if (hasPlayedToday()) {
          const todayResult = getTodayResult();
          if (todayResult) {
            setStatus('finished');
            // We don't restore found words since we don't store them
          } else {
            setStatus('ready');
          }
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

  // Start game
  const startGame = useCallback(() => {
    if (status !== 'ready') return;

    setStatus('playing');
    setFoundWords([]);
    resetTimer(TIMER_DURATION);
    startTimer();
  }, [status, resetTimer, startTimer]);

  // End game manually
  const endGame = useCallback(() => {
    if (status !== 'playing') return;

    setStatus('finished');

    // Save stats
    updateStatsAfterGame(
      foundWords.length,
      totalScore,
      allValidWords.size,
      maxPossibleScore
    );

    // Save daily result with puzzle number
    saveDailyResult({
      puzzleNumber,
      date: new Date().toISOString().split('T')[0],
      wordsFound: foundWords.length,
      totalPossibleWords: allValidWords.size,
      score: totalScore,
      maxPossibleScore,
    });
  }, [status, foundWords.length, totalScore, allValidWords.size, maxPossibleScore, puzzleNumber]);

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
    endGame,
    isWordAlreadyFound,
  };
}
