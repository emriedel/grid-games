import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Page object for the Carom game.
 */
export class CaromPage extends BaseGamePage {
  readonly pieces: Locator;
  readonly targetPiece: Locator;
  readonly blockerPieces: Locator;
  readonly goalCell: Locator;
  readonly moveCounter: Locator;
  readonly arrows: Locator;

  constructor(page: Page) {
    super(page);
    // Pieces are buttons with aria-labels like "target piece at row..." or "blocker piece at row..."
    this.pieces = page.locator('button[aria-label*="piece at row"]');
    this.targetPiece = page.locator('button[aria-label*="target piece"]');
    this.blockerPieces = page.locator('button[aria-label*="blocker piece"]');
    this.goalCell = page.locator('[class*="goal"], [data-goal]');
    // Move counter is a button containing "Moves: X" text
    this.moveCounter = page.getByRole('button', { name: /Moves:/ });
    // Arrows are SVGs or buttons for direction
    this.arrows = page.locator('[aria-label*="arrow"], [class*="arrow"]');
  }

  /**
   * Select a piece by its ID (target, blocker-0, blocker-1, blocker-2)
   */
  async selectPiece(pieceId: string) {
    if (pieceId === 'target') {
      await this.targetPiece.click();
    } else {
      // For blockers, we need to find them by index
      const index = parseInt(pieceId.replace('blocker-', ''), 10);
      await this.blockerPieces.nth(index).click();
    }
    await this.page.waitForTimeout(100);
  }

  /**
   * Move the selected piece in a direction by clicking the directional arrow.
   */
  async move(direction: Direction) {
    // Arrows have aria-label like "Move up", "Move down", etc.
    const arrow = this.page.locator(`button[aria-label="Move ${direction}"]`);
    if (await arrow.isVisible({ timeout: 1000 })) {
      await arrow.click();
    } else {
      // Fallback: use keyboard
      const keyMap: Record<Direction, string> = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
      };
      await this.page.keyboard.press(keyMap[direction]);
    }
    // Wait for slide animation
    await this.page.waitForTimeout(250);
  }

  /**
   * Get the current move count.
   */
  async getMoveCount(): Promise<number> {
    const text = await this.moveCounter.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /**
   * Execute a full solution (array of moves).
   */
  async playSolution(moves: Array<{ pieceId: string; direction: Direction }>) {
    for (const move of moves) {
      await this.selectPiece(move.pieceId);
      await this.move(move.direction);
    }
  }
}
