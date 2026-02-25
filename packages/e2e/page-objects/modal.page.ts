import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for modal dialogs (How-to-play, Results, etc.).
 */
export class ModalPage {
  readonly page: Page;
  readonly dialog: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog');
    this.closeButton = page.locator('[aria-label="Close"], [aria-label="Close modal"]');
  }

  async isOpen(): Promise<boolean> {
    return await this.dialog.isVisible();
  }

  async close() {
    await this.closeButton.click();
  }

  async closeWithEscape() {
    await this.page.keyboard.press('Escape');
  }

  async waitForOpen() {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async waitForClose() {
    await this.dialog.waitFor({ state: 'hidden' });
  }
}

/**
 * Page object for the Results modal specifically.
 */
export class ResultsModalPage extends ModalPage {
  readonly shareButton: Locator;
  readonly primaryStat: Locator;
  readonly gameNameText: Locator;

  constructor(page: Page) {
    super(page);
    this.shareButton = this.dialog.getByRole('button', { name: /share results/i });
    this.primaryStat = this.dialog.locator('.text-5xl, [class*="text-accent"]').first();
    this.gameNameText = this.dialog.locator('[class*="muted"]').first();
  }

  async share() {
    await this.shareButton.click();
  }

  async getPrimaryStat(): Promise<string> {
    return await this.primaryStat.textContent() ?? '';
  }
}
