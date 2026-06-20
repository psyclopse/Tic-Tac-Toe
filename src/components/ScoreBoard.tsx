import type { Player } from "@/lib/types";

interface ScoreBoardProps {
  players: Player[];
  scoreX: number;
  scoreO: number;
  scoreDraw: number;
}

export function ScoreBoard({ players, scoreX, scoreO, scoreDraw }: ScoreBoardProps) {
  const playerX = players.find((p) => p.symbol === "X");
  const playerO = players.find((p) => p.symbol === "O");

  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center sm:gap-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-sky-400/80">X · {playerX?.name ?? "Player X"}</p>
        <p className="mt-1 text-2xl font-bold text-slate-100">{scoreX}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Draws</p>
        <p className="mt-1 text-2xl font-bold text-slate-100">{scoreDraw}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-amber-400/80">O · {playerO?.name ?? "Player O"}</p>
        <p className="mt-1 text-2xl font-bold text-slate-100">{scoreO}</p>
      </div>
    </div>
  );
}
