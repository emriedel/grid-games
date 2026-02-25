import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for the LandingScreen component.
 * Handles interactions with the pre-game landing page.
 */
export class LandingPage {
  readonly page: Page;
  readonly playButton: Locator;
  readonly resumeButton: Locator;
  readonly viewGameButton: Locator;
  readonly howToPlayButton: Locator;
  readonly archiveLink: Locator;
  readonly gameName: Locator;
  readonly puzzleInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    this.playButton = page.getByRole('button', { name: 'Play', exact: true });
    this.resumeButton = page.getByRole('button', { name: 'Resume' });
    this.viewGameButton = page.getByRole('button', { name: /view game/i });
    this.howToPlayButton = page.getByRole('button', { name: 'How to Play' });
    this.archiveLink = page.getByRole('link', { name: /archive/i });
    this.gameName = page.locator('h1');
    this.puzzleInfo = page.locator('[class*="puzzle-info"], [class*="text-muted"]');
  }

  async waitForLoad() {
    // Wait for either play button or the game name to be visible
    await this.page.waitForSelector('h1, button:has-text("Play"), button:has-text("Resume")');
  }

  async play() {
    await this.playButton.click();
  }

  async resume() {
    await this.resumeButton.click();
  }

  async viewGame() {
    await this.viewGameButton.click();
  }

  async openHowToPlay() {
    await this.howToPlayButton.click();
  }

  async goToArchive() {
    await this.archiveLink.click();
  }

  async getGameName(): Promise<string> {
    return await this.gameName.textContent() ?? '';
  }
}
