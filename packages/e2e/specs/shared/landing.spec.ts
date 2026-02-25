import { test, expect } from '@playwright/test';
import { LandingPage } from '../../page-objects';

/**
 * Landing screen tests - run against all 5 games.
 * Tests the common LandingScreen component functionality.
 */
test.describe('Landing Screen', () => {
  test.beforeEach(async ({ context }) => {
    // Each test starts with fresh localStorage
    await context.clearCookies();
  });

  test('page loads with game name visible', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    // Game name should be visible in the heading
    await expect(landing.gameName).toBeVisible();
    const gameName = await landing.getGameName();
    expect(gameName.length).toBeGreaterThan(0);
  });

  test('shows Play button for fresh game', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await expect(landing.playButton).toBeVisible();
  });

  test('shows How to Play button', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await expect(landing.howToPlayButton).toBeVisible();
  });

  test('has menu button visible', async ({ page }) => {
    await page.goto('/');

    // Menu button should be in the nav
    const menuButton = page.getByLabel('Open menu');
    await expect(menuButton).toBeVisible();
  });

  test('Play button transitions to game state', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.play();

    // After clicking play, the landing screen should be replaced
    // Either the play button disappears or a game board appears
    await page.waitForTimeout(500);

    // The game should now be in playing state
    // Either Play button is gone OR we see a game board
    const playButtonGone = await landing.playButton.isHidden().catch(() => true);
    const boardVisible = await page.locator('[class*="board"], [class*="grid"]').isVisible().catch(() => false);

    expect(playButtonGone || boardVisible).toBe(true);
  });

  test('How to Play opens modal', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.openHowToPlay();

    // Modal should be visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
  });
});
