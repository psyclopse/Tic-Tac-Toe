"use client";

import type { CellValue } from "@/lib/types";

interface GameBoardProps {
  board: CellValue[];
  winningLine?: number[] | null;
  onCellClick?: (index: number) => void;
  disabled?: boolean;
  interactive?: boolean;
}

export function GameBoard({
  board,
  winningLine = null,
  onCellClick,
  disabled = false,
  interactive = true,
}: GameBoardProps) {
  const winningSet = new Set(winningLine ?? []);

  return (
    <div
      className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2 sm:max-w-md sm:gap-3"
      role="grid"
      aria-label="Tic-tac-toe board"
    >
      {board.map((cell, index) => {
        const isWinning = winningSet.has(index);
        const isEmpty = cell === "";
        const canClick = interactive && isEmpty && !disabled && onCellClick;

        return (
          <button
            key={index}
            type="button"
            role="gridcell"
            aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ", empty"}`}
            disabled={!canClick}
            onClick={() => canClick && onCellClick(index)}
            className={`aspect-square rounded-2xl border text-4xl font-bold transition-all sm:text-5xl ${
              isWinning
                ? "border-emerald-400/60 bg-emerald-500/20 text-white shadow-lg shadow-emerald-500/20"
                : "border-slate-700 bg-slate-900/80"
            } ${
              cell === "X"
                ? "text-sky-400"
                : cell === "O"
                  ? "text-amber-400"
                  : "text-transparent"
            } ${
              canClick
                ? "cursor-pointer hover:border-indigo-500/60 hover:bg-slate-800/90 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95"
                : "cursor-default"
            } disabled:cursor-not-allowed`}
          >
            {cell || "·"}
          </button>
        );
      })}
    </div>
  );
}
