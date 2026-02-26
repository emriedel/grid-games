import { test, expect } from '@playwright/test';
import { TrioPage, LandingPage } from '../../page-objects';
import {
  TRIO_PUZZLE_1_SOLUTION,
  TRIO_PUZZLE_1_ROUNDS,
} from '../../helpers/solutions/trio';

/**
 * Trio game-specific tests.
 * Tests basic game functionality and UI.
 */
test.describe('Trio Game', () => {
  // Only run on trio project
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('trio'), 'Trio-only test');
  });

  test.describe('Game UI', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('landing page shows game name', async ({ page }) => {
      await page.goto('/');
      const landing = new LandingPage(page);
      await landing.waitForLoad();

      const gameName = await landing.getGameName();
      expect(gameName.toLowerCase()).toContain('trio');
    });

    test('can load puzzle #1 from archive', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Board should be visible
      await expect(trio.gameBoard).toBeVisible();
    });

    test('shows 9 cards in grid', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Should have 9 cards (3x3 grid)
      const cardCount = await trio.cards.count();
      expect(cardCount).toBe(9);
    });

    test('cards have descriptive aria-labels', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Cards should have aria-labels describing their attributes
      // Format: "{count} {color} {pattern} {shape}(s)"
      const firstCard = trio.cards.first();
      const ariaLabel = await firstCard.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      // Should contain recognizable attributes
      expect(ariaLabel?.toLowerCase()).toMatch(/\d\s+\w+/);
    });

    test('shows submit button', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Submit button should be visible
      await expect(trio.submitButton).toBeVisible();
    });

    test('can select a card', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Click first card
      const firstCard = trio.cards.first();
      await firstCard.click();
      await page.waitForTimeout(100);

      // Card should be selected (aria-pressed="true")
      const isPressed = await firstCard.getAttribute('aria-pressed');
      expect(isPressed).toBe('true');
    });

    test('can select multiple cards', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Select 3 cards
      await trio.selectCards([0, 1, 2]);

      // Check that cards are selected
      const card0Pressed = await trio.cards.nth(0).getAttribute('aria-pressed');
      const card1Pressed = await trio.cards.nth(1).getAttribute('aria-pressed');
      const card2Pressed = await trio.cards.nth(2).getAttribute('aria-pressed');

      expect(card0Pressed).toBe('true');
      expect(card1Pressed).toBe('true');
      expect(card2Pressed).toBe('true');
    });
  });

  test.describe('Puzzle Completion', () => {
    test.beforeEach(async ({ context }) => {
      await context.clearCookies();
    });

    test('can complete puzzle #1 with all valid trios', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Verify we have 9 cards initially
      const initialCardCount = await trio.cards.count();
      expect(initialCardCount).toBe(9);

      // Play through all 5 rounds
      await trio.playSolution(TRIO_PUZZLE_1_SOLUTION);

      // Wait for game to detect completion
      await page.waitForTimeout(500);

      // Verify game is finished (See Results button should be visible)
      const finished = await trio.isFinished();
      expect(finished).toBe(true);
    });

    test('shows results modal after completion', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Complete the puzzle
      await trio.playSolution(TRIO_PUZZLE_1_SOLUTION);

      // Wait for results modal to auto-open
      await trio.resultsModal.waitForOpen();

      // Verify modal is open
      expect(await trio.resultsModal.isOpen()).toBe(true);

      // Should show 5/5 trios found
      await expect(page.getByRole('dialog').getByText('5/5')).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Trios')).toBeVisible();

      // Modal should show game stats and share button
      await expect(page.getByRole('dialog').getByText('5/5')).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('button', { name: /share/i })).toBeVisible();
    });

    test('saves completion to localStorage', async ({ page }) => {
      await page.goto('/?puzzle=1');
      const trio = new TrioPage(page);
      await trio.waitForBoard();

      // Complete the puzzle
      await trio.playSolution(TRIO_PUZZLE_1_SOLUTION);
      await page.waitForTimeout(500);

      // Check localStorage has completion data
      const hasStorage = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(k => k.startsWith('trio-1-'));
      });
      expect(hasStorage).toBe(true);
    });
  });
});
