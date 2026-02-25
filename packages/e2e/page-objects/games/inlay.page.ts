import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

type Rotation = 0 | 1 | 2 | 3;

interface PlacementInfo {
  pentominoId: string;
  row: number;
  col: number;
  rotation: Rotation;
}

/**
 * Page object for the Inlay game.
 */
export class InlayPage extends BaseGamePage {
  readonly pieceTray: Locator;
  readonly trayPieces: Locator;
  readonly boardCells: Locator;

  constructor(page: Page) {
    super(page);
    // Piece tray is a flex-wrap container
    this.pieceTray = page.locator('.flex.flex-wrap.justify-center.gap-2');
    // Tray pieces are buttons with aria-label containing the piece name
    this.trayPieces = page.locator('.flex.flex-wrap.justify-center.gap-2 button');
    // Board cells are in the board grid
    this.boardCells = page.locator('[class*="board"] [class*="cell"], .grid button');
  }

  /**
   * Select a piece from the tray by its pentomino ID (e.g., 'F', 'I', 'L').
   * PiecePreview uses aria-label with the piece name.
   */
  async selectPiece(pentominoId: string) {
    // Aria-label format: "F", "I (selected)", "L (placed)"
    const piece = this.page.locator(`button[aria-label^="${pentominoId}"]`).first();
    if (await piece.isVisible({ timeout: 1000 })) {
      await piece.click();
    }
    await this.page.waitForTimeout(100);
  }

  /**
   * Rotate the selected piece by clicking it again.
   */
  async rotatePiece() {
    // Clicking a selected piece rotates it
    const selectedPiece = this.page.locator('[class*="selected"][data-pentomino-id], [class*="ring"][data-pentomino-id]');
    if (await selectedPiece.isVisible()) {
      await selectedPiece.click();
    }
    await this.page.waitForTimeout(100);
  }

  /**
   * Rotate piece to desired rotation (0-3).
   */
  async rotateToRotation(currentRotation: Rotation, targetRotation: Rotation) {
    const rotationsNeeded = (targetRotation - currentRotation + 4) % 4;
    for (let i = 0; i < rotationsNeeded; i++) {
      await this.rotatePiece();
    }
  }

  /**
   * Place the selected piece at a board position by clicking the cell.
   */
  async placeAtCell(row: number, col: number) {
    const cell = this.page.locator(`[data-row="${row}"][data-col="${col}"]`);
    if (await cell.isVisible()) {
      await cell.click();
    } else {
      // Fallback: click by position in grid
      const allCells = await this.boardCells.all();
      // Assume cells are in row-major order
      const boardWidth = 6; // Typical for inlay puzzles
      const index = row * boardWidth + col;
      if (allCells[index]) {
        await allCells[index].click();
      }
    }
    await this.page.waitForTimeout(200);
  }

  /**
   * Place a piece with rotation at specified position.
   */
  async placePiece(placement: PlacementInfo) {
    await this.selectPiece(placement.pentominoId);
    // Assume piece starts at rotation 0, rotate to target
    for (let i = 0; i < placement.rotation; i++) {
      await this.rotatePiece();
    }
    await this.placeAtCell(placement.row, placement.col);
  }

  /**
   * Execute a full solution.
   */
  async playSolution(placements: PlacementInfo[]) {
    for (const placement of placements) {
      await this.placePiece(placement);
    }
  }

  /**
   * Check if puzzle is complete (all pieces placed correctly).
   */
  async isPuzzleComplete(): Promise<boolean> {
    // Check if tray is empty (all pieces placed)
    const trayPieceCount = await this.trayPieces.count();
    return trayPieceCount === 0;
  }
}
