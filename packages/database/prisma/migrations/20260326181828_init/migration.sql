-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "puzzle_id" TEXT NOT NULL,
    "puzzle_number" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scores_game_id_puzzle_id_score_idx" ON "scores"("game_id", "puzzle_id", "score" DESC);
