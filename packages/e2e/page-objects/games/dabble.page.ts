import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

/**
 * Page object for the Dabble game.
 * Dabble uses drag-and-drop for tile placement.
 */
export class DabblePage extends BaseGamePage {
  readonly letterRack: Locator;
  readonly rackTiles: Locator;
  readonly boardCells: Locator;
  readonly submitWordButton: Locator;
  readonly clearButton: Locator;
  readonly scoreDisplay: Locator;
  readonly wordList: Locator;

  constructor(page: Page) {
    super(page);
    // Rack tiles are buttons with accessible names like "A 1", "E 1", "Z 10" (letter + space + point)
    // Use getByRole to match by accessible name pattern
    this.rackTiles = page.getByRole('button', { name: /^[A-Z] \d+$/ });
    // Letter rack is the parent container of rack tiles
    this.letterRack = page.locator('main div').filter({ has: this.rackTiles.first() }).first();
    // Board cells are buttons in the grid layout (not rack tiles)
    this.boardCells = page.locator('.grid button');
    this.submitWordButton = page.getByRole('button', { name: /submit word/i });
    this.clearButton = page.getByRole('button', { name: /clear/i });
    // Score is shown in navbar
    this.scoreDisplay = page.locator('button').filter({ hasText: /^\d+$/ }).first();
    this.wordList = page.locator('[class*="word-list"], [data-word-list]');
  }

  /**
   * Get all letters currently in the rack.
   * Rack tiles have text like "A 1" (letter + point value).
   */
  async getRackLetters(): Promise<string[]> {
    const tiles = await this.rackTiles.allTextContents();
    // Extract just the letter from "A 1" format
    return tiles.map(t => {
      const match = t.match(/^([A-Z])/);
      return match ? match[1] : '';
    }).filter(t => t.length === 1);
  }

  /**
   * Place a tile from rack to a board cell using click-to-select, click-to-place.
   * @param rackIndex Index of tile in rack
   * @param row Board row
   * @param col Board column
   */
  async placeTile(rackIndex: number, row: number, col: number) {
    // Click rack tile to select it
    const tile = this.rackTiles.nth(rackIndex);
    await tile.click();
    await this.page.waitForTimeout(100);

    // Click board cell to place the tile
    const cell = this.page.locator(`[data-row="${row}"][data-col="${col}"]`);
    await cell.waitFor({ state: 'visible', timeout: 2000 });
    await cell.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Submit the current word placement.
   */
  async submitWord() {
    await this.submitWordButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear current placement.
   */
  async clearPlacement() {
    await this.clearButton.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Get current score.
   */
  async getScore(): Promise<number> {
    const text = await this.scoreDisplay.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Get list of submitted words.
   */
  async getSubmittedWords(): Promise<string[]> {
    const text = await this.wordList.textContent();
    return text?.split(/[\s,]+/).filter(w => w.length > 0) ?? [];
  }

  /**
   * Find rack index for a specific letter.
   * Returns -1 if not found.
   */
  async findLetterIndex(letter: string, excludeIndices: number[] = []): Promise<number> {
    const letters = await this.getRackLetters();
    for (let i = 0; i < letters.length; i++) {
      if (letters[i] === letter.toUpperCase() && !excludeIndices.includes(i)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Place a word on the board starting at a position.
   * @param word The word to place
   * @param startRow Starting row
   * @param startCol Starting column
   * @param direction 'horizontal' or 'vertical'
   */
  async placeWord(word: string, startRow: number, startCol: number, direction: 'horizontal' | 'vertical' = 'horizontal') {
    const usedIndices: number[] = [];

    for (let i = 0; i < word.length; i++) {
      const letter = word[i].toUpperCase();
      const rackIndex = await this.findLetterIndex(letter, usedIndices);

      if (rackIndex === -1) {
        throw new Error(`Letter ${letter} not found in rack`);
      }

      const row = direction === 'horizontal' ? startRow : startRow + i;
      const col = direction === 'horizontal' ? startCol + i : startCol;

      await this.placeTile(rackIndex, row, col);
      usedIndices.push(rackIndex);
    }
  }

  /**
   * Click the Finish button to complete the game.
   */
  async clickFinish() {
    const finishButton = this.page.getByRole('button', { name: /finish/i });
    await finishButton.click();
    await this.page.waitForTimeout(500);
  }
}
