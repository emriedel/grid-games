import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for the Archive page.
 */
export class ArchivePage {
  readonly page: Page;
  readonly title: Locator;
  readonly puzzleList: Locator;
  readonly puzzleEntries: Locator;
  readonly monthSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1');
    this.puzzleList = page.locator('[class*="archive"], [class*="grid"]');
    // Archive entries are buttons with #N pattern
    this.puzzleEntries = page.locator('button:has-text("#")');
    this.monthSelector = page.locator('select, [data-month-selector]');
  }

  async waitForLoad() {
    await this.title.waitFor({ state: 'visible' });
    // Wait for puzzle list to load - entries are async loaded
    await this.page.waitForTimeout(1500);
  }

  async getTitle(): Promise<string> {
    return await this.title.textContent() ?? '';
  }

  async getPuzzleCount(): Promise<number> {
    return await this.puzzleEntries.count();
  }

  async clickPuzzle(puzzleNumber: number) {
    const puzzleButton = this.page.locator(`button:has-text("#${puzzleNumber}")`).first();
    await puzzleButton.click();
  }

  async selectMonth(month: string) {
    if (await this.monthSelector.isVisible()) {
      await this.monthSelector.selectOption({ label: month });
    }
  }

  async hasMonthSelector(): Promise<boolean> {
    return await this.monthSelector.isVisible();
  }
}
