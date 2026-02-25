import { type Page } from '@playwright/test';

/**
 * Helper functions for localStorage operations in tests.
 */

/**
 * Clear all localStorage for the current page's origin.
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Get a localStorage item.
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set a localStorage item.
 */
export async function setLocalStorageItem(page: Page, key: string, value: string) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
}

/**
 * Get all localStorage keys.
 */
export async function getLocalStorageKeys(page: Page): Promise<string[]> {
  return await page.evaluate(() => Object.keys(localStorage));
}

/**
 * Get all localStorage keys matching a pattern.
 */
export async function findLocalStorageKeys(page: Page, pattern: RegExp): Promise<string[]> {
  const keys = await getLocalStorageKeys(page);
  return keys.filter(key => pattern.test(key));
}

/**
 * Check if any localStorage key starts with a prefix (e.g., game ID).
 */
export async function hasStorageForGame(page: Page, gameId: string): Promise<boolean> {
  const keys = await getLocalStorageKeys(page);
  return keys.some(key => key.startsWith(gameId));
}
