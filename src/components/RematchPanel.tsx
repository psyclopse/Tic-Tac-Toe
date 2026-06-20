"use client";

import { Button } from "@/components/ui/Button";
import type { Player, PlayerSymbol } from "@/lib/types";

interface RematchPanelProps {
  currentPlayer: Player;
  rematchXAccepted: boolean;
  rematchOAccepted: boolean;
  onRequestRematch: () => void;
  onResetScores: () => void;
  loading?: boolean;
}

export function RematchPanel({
  currentPlayer,
  rematchXAccepted,
  rematchOAccepted,
  onRequestRematch,
  onResetScores,
  loading = false,
}: RematchPanelProps) {
  const hasAccepted =
    currentPlayer.symbol === "X" ? rematchXAccepted : rematchOAccepted;
  const opponentAccepted =
    currentPlayer.symbol === "X" ? rematchOAccepted : rematchXAccepted;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-center">
      <h3 className="text-lg font-semibold text-slate-100">Game Over</h3>
      <p className="mt-2 text-sm text-slate-400">
        Both players must accept to start a rematch. Scores are kept until reset.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
        <RematchStatus symbol="X" accepted={rematchXAccepted} />
        <span>·</span>
        <RematchStatus symbol="O" accepted={rematchOAccepted} />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          onClick={onRequestRematch}
          disabled={loading || hasAccepted}
          variant={hasAccepted ? "secondary" : "primary"}
        >
          {hasAccepted
            ? opponentAccepted
              ? "Starting rematch…"
              : "Waiting for opponent…"
            : "Request Rematch"}
        </Button>
        <Button variant="ghost" onClick={onResetScores} disabled={loading}>
          Reset Scores
        </Button>
      </div>
    </div>
  );
}

function RematchStatus({ symbol, accepted }: { symbol: PlayerSymbol; accepted: boolean }) {
  return (
    <span className={symbol === "X" ? "text-sky-400" : "text-amber-400"}>
      {symbol}: {accepted ? "Ready ✓" : "Waiting"}
    </span>
  );
}
