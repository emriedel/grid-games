import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

interface TilePosition {
  row: number;
  col: number;
}

/**
 * Page object for the Jumble game.
 * Jumble uses swipe/drag to trace word paths.
 */
export class JumblePage extends BaseGamePage {
  readonly tiles: Locator;
  readonly currentWord: Locator;
  readonly timer: Locator;
  readonly scoreDisplay: Locator;
  readonly foundWordsList: Locator;
  readonly startButton: Locator;

  constructor(page: Page) {
    super(page);
    // Tiles have data-row and data-col attributes
    this.tiles = page.locator('[data-row][data-col]');
    this.currentWord = page.locator('[class*="current-word"], [data-current-word]');
    // Timer shows time in format like "1:30" with tabular-nums styling
    this.timer = page.locator('.tabular-nums, [class*="timer"]');
    // Score display
    this.scoreDisplay = page.locator('text=/\\d+ pts/i');
    this.foundWordsList = page.locator('[class*="found"], [data-found-words]');
    this.startButton = page.getByRole('button', { name: /start|begin/i });
  }

  /**
   * Get the tile at a specific position.
   */
  getTile(row: number, col: number): Locator {
    return this.page.locator(`[data-row="${row}"][data-col="${col}"]`);
  }

  /**
   * Start the game (if there's a start button).
   */
  async start() {
    if (await this.startButton.isVisible()) {
      await this.startButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Trace a word path by coordinates.
   */
  async traceWord(path: TilePosition[]) {
    if (path.length === 0) return;

    // Start by clicking the first tile
    const firstTile = this.getTile(path[0].row, path[0].col);
    const firstBox = await firstTile.boundingBox();
    if (!firstBox) return;

    // Start drag from center of first tile
    await this.page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await this.page.mouse.down();

    // Move through remaining tiles
    for (let i = 1; i < path.length; i++) {
      const tile = this.getTile(path[i].row, path[i].col);
      const box = await tile.boundingBox();
      if (box) {
        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
        await this.page.waitForTimeout(50);
      }
    }

    // Release to submit the word
    await this.page.mouse.up();
    await this.page.waitForTimeout(300);
  }

  /**
   * Submit the current selection by releasing the drag.
   */
  async submitWord() {
    // Double-tap the last tile to submit, or release drag
    await this.page.mouse.up();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the current displayed word.
   */
  async getCurrentWord(): Promise<string> {
    return await this.currentWord.textContent() ?? '';
  }

  /**
   * Get time remaining.
   */
  async getTimeRemaining(): Promise<number> {
    const text = await this.timer.textContent();
    if (!text) return 0;
    // Parse time format like "1:30" or "90"
    if (text.includes(':')) {
      const [min, sec] = text.split(':').map(Number);
      return min * 60 + sec;
    }
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
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
   * Get list of found words.
   */
  async getFoundWords(): Promise<string[]> {
    const text = await this.foundWordsList.textContent();
    return text?.split(/[\s,]+/).filter(w => w.length > 0) ?? [];
  }

  /**
   * Click the Finish Early button to end the game.
   */
  async clickFinish() {
    const finishButton = this.page.getByRole('button', { name: /finish early/i });
    await finishButton.click();
    await this.page.waitForTimeout(500);
  }
}
