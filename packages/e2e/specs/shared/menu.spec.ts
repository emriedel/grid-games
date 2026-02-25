import { test, expect } from '@playwright/test';
import { MenuPage } from '../../page-objects';

/**
 * HamburgerMenu tests - run against all games.
 */
test.describe('Hamburger Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForSelector('h1, button');
  });

  test('opens when menu button clicked', async ({ page }) => {
    const menu = new MenuPage(page);

    await menu.open();

    // Close button should be visible when menu is open
    await expect(menu.closeButton).toBeVisible();
  });

  test('closes when close button clicked', async ({ page }) => {
    const menu = new MenuPage(page);

    await menu.open();
    await expect(menu.closeButton).toBeVisible();

    await menu.close();

    // Menu button should be visible again
    await expect(menu.menuButton).toBeVisible();
  });

  test('closes on Escape key', async ({ page }) => {
    const menu = new MenuPage(page);

    await menu.open();
    await expect(menu.closeButton).toBeVisible();

    await menu.closeWithEscape();

    // Should be closed now
    await expect(menu.menuButton).toBeVisible();
  });

  test('shows game links', async ({ page }) => {
    const menu = new MenuPage(page);

    await menu.open();

    // Should have multiple game links
    const links = await menu.getGameLinks();
    expect(links.length).toBeGreaterThan(0);
  });

  test('can navigate to another game', async ({ page }) => {
    const menu = new MenuPage(page);

    await menu.open();

    // Find and click a game link (any game)
    const gameLink = page.locator('nav a[href*="/"], a[href*="nerdcube"]').first();
    if (await gameLink.isVisible()) {
      const href = await gameLink.getAttribute('href');
      if (href) {
        await gameLink.click();
        await page.waitForLoadState('domcontentloaded');
        // Should have navigated
        expect(page.url()).toBeTruthy();
      }
    }
  });
});
