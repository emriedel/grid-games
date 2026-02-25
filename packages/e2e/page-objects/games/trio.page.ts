import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

/**
 * Page object for the Trio game.
 */
export class TrioPage extends BaseGamePage {
  readonly cards: Locator;
  readonly submitButton: Locator;
  readonly hintButton: Locator;
  readonly roundProgress: Locator;
  readonly foundSetDisplay: Locator;

  constructor(page: Page) {
    super(page);
    // Cards are buttons in a 3x3 grid with aria-labels describing the card
    // aria-label format: "1 red solid circle", "2 blue striped triangle", etc.
    this.cards = page.locator('button[aria-pressed]');
    this.submitButton = page.getByRole('button', { name: /submit/i });
    this.hintButton = page.locator('[aria-label*="hint"], button:has-text("💡")');
    this.roundProgress = page.locator('[class*="progress"], [data-round-progress]');
    this.foundSetDisplay = page.locator('[class*="found-set"], [data-found-set]');
  }

  /**
   * Select cards by their indices (0-8 for a 3x3 grid).
   */
  async selectCards(indices: number[]) {
    for (const index of indices) {
      const card = this.cards.nth(index);
      await card.click();
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Submit the current selection.
   */
  async submit() {
    await this.submitButton.click();
    // Wait for animation
    await this.page.waitForTimeout(500);
  }

  /**
   * Select cards and submit.
   */
  async selectAndSubmit(indices: number[]) {
    await this.selectCards(indices);
    await this.submit();
  }

  /**
   * Use a hint.
   */
  async useHint() {
    await this.hintButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the current round number (1-5).
   */
  async getCurrentRound(): Promise<number> {
    // Look for dots or indicators showing current round
    const text = await this.roundProgress.textContent();
    if (text) {
      const match = text.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 1;
    }
    return 1;
  }

  /**
   * Play through all 5 rounds using provided valid set indices for each round.
   */
  async playSolution(roundSolutions: number[][]) {
    for (const validIndices of roundSolutions) {
      await this.selectAndSubmit(validIndices);
      // Wait for cards to animate out and new cards to appear
      await this.page.waitForTimeout(700);
    }
  }
}
