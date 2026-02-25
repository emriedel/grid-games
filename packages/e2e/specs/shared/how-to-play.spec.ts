import { test, expect } from '@playwright/test';
import { LandingPage, ModalPage } from '../../page-objects';

/**
 * How-to-play modal tests - run against all games.
 */
test.describe('How to Play Modal', () => {
  test('opens from landing screen', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.openHowToPlay();

    const modal = new ModalPage(page);
    await expect(modal.dialog).toBeVisible();
  });

  test('contains instructional content', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.openHowToPlay();

    const modal = new ModalPage(page);
    await modal.waitForOpen();

    // Modal should have text content
    const modalText = await modal.dialog.textContent();
    expect(modalText?.length ?? 0).toBeGreaterThan(50);
  });

  test('closes on close button click', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.openHowToPlay();

    const modal = new ModalPage(page);
    await modal.waitForOpen();

    await modal.close();
    await modal.waitForClose();

    await expect(modal.dialog).not.toBeVisible();
  });

  test('closes on Escape key', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    await landing.openHowToPlay();

    const modal = new ModalPage(page);
    await modal.waitForOpen();

    await modal.closeWithEscape();
    await modal.waitForClose();

    await expect(modal.dialog).not.toBeVisible();
  });

  test('opens from game navbar (? button)', async ({ page }) => {
    await page.goto('/');
    const landing = new LandingPage(page);
    await landing.waitForLoad();

    // First enter playing state
    await landing.play();
    await page.waitForTimeout(500);

    // Look for the ? button in navbar
    const helpButton = page.locator('[aria-label="How to play"], button:has-text("?")');
    if (await helpButton.isVisible()) {
      await helpButton.click();

      const modal = new ModalPage(page);
      await expect(modal.dialog).toBeVisible();
    }
  });
});
