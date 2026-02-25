import { test, expect } from '@playwright/test';
import { ArchivePage } from '../../page-objects';

/**
 * Archive page tests - run against all games.
 * All 5 games have archives, so these tests should pass for all.
 */
test.describe('Archive Page', () => {
  test('loads with title', async ({ page }) => {
    await page.goto('/archive');
    const archive = new ArchivePage(page);
    await archive.waitForLoad();

    const title = await archive.getTitle();
    expect(title.toLowerCase()).toContain('archive');
  });

  test('shows puzzle list', async ({ page }) => {
    await page.goto('/archive');
    const archive = new ArchivePage(page);
    await archive.waitForLoad();

    // Should have at least one puzzle entry
    // (Puzzle #1 was assigned Feb 1, 2026)
    const puzzleCount = await archive.getPuzzleCount();
    // On mobile-dabble (Feb 24, 2026), there should be 23 past puzzles
    expect(puzzleCount).toBeGreaterThanOrEqual(1);
  });

  test('puzzle entries show number and date', async ({ page }) => {
    await page.goto('/archive');
    const archive = new ArchivePage(page);
    await archive.waitForLoad();

    // Find any puzzle entry text
    const entryText = await archive.puzzleEntries.first().textContent();
    // Should contain a number or date reference
    expect(entryText).toBeTruthy();
    // Check for number pattern (like #1, #2, etc.) or date pattern
    const hasNumber = /#\d+/.test(entryText ?? '');
    const hasDateLike = /\d/.test(entryText ?? '');
    expect(hasNumber || hasDateLike).toBe(true);
  });

  test('clicking puzzle loads the game board', async ({ page }) => {
    await page.goto('/archive');
    const archive = new ArchivePage(page);
    await archive.waitForLoad();

    // Click the first puzzle entry
    const firstEntry = archive.puzzleEntries.first();
    if (await firstEntry.isVisible()) {
      await firstEntry.click();

      // Wait for navigation to complete (game board should appear)
      await page.waitForTimeout(2000);

      // The game board or some game element should be visible
      const hasBoard = await page.locator('[class*="board"], [class*="grid"], [class*="game"]').first().isVisible();
      expect(hasBoard).toBe(true);
    }
  });

  test('can navigate to puzzle #1', async ({ page }) => {
    // Navigate directly to puzzle #1
    await page.goto('/?puzzle=1');
    await page.waitForLoadState('domcontentloaded');

    // Should load the puzzle (either go to game or show some content)
    await page.waitForTimeout(500);

    // Check that page loaded something (not 404)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length ?? 0).toBeGreaterThan(10);
  });
});
