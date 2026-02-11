// Category types for puzzle generation
export type CategoryType =
  | 'compound-word-prefix'   // "Spring _____" → BREAK, BOARD, ROLL
  | 'compound-word-suffix'   // "_____ Ball" → BASKET, VOLLEY, FOOT
  | 'proper-noun-group'      // NBA Teams, Pixar Movies, Rock Bands
  | 'finite-group'           // Planets, Bones, Playing Card Suits
  | 'general-category'       // Kitchen Utensils, School Supplies
  | 'things-that'            // Things that are round, Things in pairs
  | 'adjective-category';    // Shades of Blue, Types of Green

export interface Category {
  name: string;           // e.g., "NBA Teams", "Spring _____"
  type: CategoryType;
  words: string[];        // 8-20 single words per category
}

export interface CategoryDatabase {
  categories: Category[];
  generatedAt: string;
  metadata: {
    totalCategories: number;
    byCategoryType: Record<CategoryType, number>;
  };
}

// Pool puzzle with approval status
export interface PoolPuzzle {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare];
  metadata: {
    categoryTypes: CategoryType[];
    overlapWords: string[];        // Words that fit multiple categories
    generatedAt: string;
  };
}

export interface PoolPuzzleSquare {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface PoolFile {
  gameId: 'edgewise';
  puzzles: PoolPuzzle[];
}

// Word index for finding overlaps
export interface WordIndex {
  // Maps word to list of category names it belongs to
  wordToCategories: Map<string, string[]>;
  // Maps category name to its words
  categoryToWords: Map<string, string[]>;
}
