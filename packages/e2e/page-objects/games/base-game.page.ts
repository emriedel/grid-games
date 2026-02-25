import { type Page, type Locator } from '@playwright/test';
import { ResultsModalPage } from '../modal.page';

/**
 * Base page object for all game pages.
 * Contains common functionality shared across games.
 */
export class BaseGamePage {
  readonly page: Page;
  readonly gameBoard: Locator;
  readonly navBar: Locator;
  readonly menuButton: Locator;
  readonly howToPlayButton: Locator;
  readonly seeResultsButton: Locator;
  readonly resultsModal: ResultsModalPage;

  constructor(page: Page) {
    this.page = page;
    this.gameBoard = page.locator('[data-testid="game-board"], [class*="board"], [class*="grid"]').first();
    this.navBar = page.locator('nav, header').first();
    this.menuButton = page.getByLabel('Open menu');
    this.howToPlayButton = page.locator('[aria-label="How to play"], button:has-text("?")');
    this.seeResultsButton = page.getByRole('button', { name: /see results|view results/i });
    this.resultsModal = new ResultsModalPage(page);
  }

  async waitForBoard() {
    await this.gameBoard.waitFor({ state: 'visible', timeout: 10000 });
  }

  async openResultsModal() {
    await this.seeResultsButton.click();
    await this.resultsModal.waitForOpen();
  }

  async isFinished(): Promise<boolean> {
    return await this.seeResultsButton.isVisible();
  }
}
