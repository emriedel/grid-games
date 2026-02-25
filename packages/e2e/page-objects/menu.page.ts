import { type Page, type Locator } from '@playwright/test';

/**
 * Page object for the HamburgerMenu component.
 */
export class MenuPage {
  readonly page: Page;
  readonly menuButton: Locator;
  readonly closeButton: Locator;
  readonly menuPanel: Locator;
  readonly backdrop: Locator;
  readonly gameLinks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuButton = page.getByLabel('Open menu');
    this.closeButton = page.getByLabel('Close menu');
    this.menuPanel = page.locator('[class*="fixed"][class*="right-0"], [data-menu-panel]');
    this.backdrop = page.locator('[class*="fixed"][class*="inset-0"][class*="bg-black"]');
    // Game links are inside the slide-out panel, which is a div with fixed position
    this.gameLinks = page.locator('.fixed a[href*="/"]');
  }

  async open() {
    await this.menuButton.click();
    // Wait for menu to be visible
    await this.page.waitForTimeout(300);
  }

  async close() {
    await this.closeButton.click();
    await this.page.waitForTimeout(300);
  }

  async closeWithEscape() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  async closeWithBackdropClick() {
    // Click on the backdrop area (right side of screen when menu is open on left)
    // Menu is 288px wide (w-72), so click to the right of it
    await this.page.mouse.click(350, 300);
    await this.page.waitForTimeout(300);
  }

  async isOpen(): Promise<boolean> {
    // Check if close button is visible (indicates menu is open)
    return await this.closeButton.isVisible();
  }

  async getGameLinks(): Promise<string[]> {
    const links = await this.gameLinks.allTextContents();
    return links.filter(text => text.trim().length > 0);
  }

  async expandGameSection(gameName: string) {
    const gameButton = this.page.locator(`button:has-text("${gameName}")`);
    if (await gameButton.isVisible()) {
      await gameButton.click();
      await this.page.waitForTimeout(200);
    }
  }
}
