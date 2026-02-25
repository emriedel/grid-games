import { test, expect } from '@playwright/test';
import { TrioPage, LandingPage } from '../../page-objects';

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
});
