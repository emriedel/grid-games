import { type Page, type Locator } from '@playwright/test';
import { BaseGamePage } from './base-game.page';

type Rotation = 0 | 1 | 2 | 3;
type CellOffset = { row: number; col: number };

interface PlacementInfo {
  pentominoId: string;
  row: number;
  col: number;
  rotation: Rotation;
}

/**
 * Pentomino cell definitions (base rotation 0) and anchor indices.
 * Each pentomino covers 5 cells relative to bounding box (0,0).
 * The anchorIndex indicates which cell is the "click target" for placement.
 */
const PENTOMINO_DATA: Record<string, { cells: CellOffset[]; anchorIndex: number }> = {
  F: { cells: [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }], anchorIndex: 3 },
  I: { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }], anchorIndex: 2 },
  L: { cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }, { row: 3, col: 1 }], anchorIndex: 2 },
  N: { cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 3, col: 0 }], anchorIndex: 2 },
  P: { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 0 }], anchorIndex: 3 },
  T: { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 1 }], anchorIndex: 3 },
  U: { cells: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], anchorIndex: 3 },
  V: { cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }], anchorIndex: 2 },
  W: { cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }], anchorIndex: 2 },
  X: { cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 1 }], anchorIndex: 2 },
  Y: { cells: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }], anchorIndex: 2 },
  Z: { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 2, col: 2 }], anchorIndex: 2 },
};

/**
 * Rotate a cell offset 90° clockwise
 */
function rotateCW(cell: CellOffset): CellOffset {
  return { row: cell.col, col: -cell.row };
}

/**
 * Normalize offsets so minimum row and col are 0
 */
function normalizeOffsets(offsets: CellOffset[]): CellOffset[] {
  const minRow = Math.min(...offsets.map(c => c.row));
  const minCol = Math.min(...offsets.map(c => c.col));
  return offsets.map(c => ({ row: c.row - minRow, col: c.col - minCol }));
}

/**
 * Get pentomino cells for a specific rotation
 */
function getPentominoCells(id: string, rotation: Rotation): CellOffset[] {
  let cells = PENTOMINO_DATA[id]?.cells || [];
  for (let i = 0; i < rotation; i++) {
    cells = normalizeOffsets(cells.map(rotateCW));
  }
  return cells;
}

/**
 * Get the anchor cell offset for a pentomino at a specific rotation.
 * This is the cell that should be clicked to place the piece.
 */
function getAnchorCell(id: string, rotation: Rotation): CellOffset {
  const anchorIndex = PENTOMINO_DATA[id]?.anchorIndex ?? 0;
  const cells = getPentominoCells(id, rotation);
  return cells[anchorIndex];
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
   * Pieces have aria-labels like "X-pentomino" or "U-pentomino (selected)"
   */
  async selectPiece(pentominoId: string) {
    // Find piece button by aria-label starting with the ID
    const piece = this.page.getByRole('button', { name: new RegExp(`^${pentominoId}-pentomino`) });
    await piece.waitFor({ state: 'visible', timeout: 2000 });
    await piece.click({ force: true });
    await this.page.waitForTimeout(200);
  }

  /**
   * Rotate the selected piece by clicking it again.
   * A selected piece has aria-label containing "(selected)" or aria-pressed="true"
   */
  async rotatePiece() {
    // Find the selected piece by aria-label or aria-pressed
    const selectedPiece = this.page.locator('button[aria-label*="(selected)"], button[aria-pressed="true"]').first();
    if (await selectedPiece.isVisible({ timeout: 500 })) {
      await selectedPiece.click();
      await this.page.waitForTimeout(150);
    }
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
   * Cells have aria-labels like "Cell (row, col) playable" or "Cell (row, col) filled by X"
   */
  async placeAtCell(row: number, col: number) {
    const cell = this.page.getByRole('button', { name: new RegExp(`Cell \\(${row}, ${col}\\)`) });
    await cell.waitFor({ state: 'visible', timeout: 2000 });
    await cell.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Place a piece with rotation at specified position.
   * The position is the bounding box top-left.
   * We need to click on the ANCHOR cell position for the game to accept placement.
   */
  async placePiece(placement: PlacementInfo) {
    await this.selectPiece(placement.pentominoId);
    // Rotate to target rotation
    for (let i = 0; i < placement.rotation; i++) {
      await this.rotatePiece();
    }

    // Get the anchor cell offset for this piece at this rotation
    const anchorOffset = getAnchorCell(placement.pentominoId, placement.rotation);

    // Calculate the board position where we need to click (anchor cell position)
    const clickRow = placement.row + anchorOffset.row;
    const clickCol = placement.col + anchorOffset.col;

    await this.placeAtCell(clickRow, clickCol);
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
