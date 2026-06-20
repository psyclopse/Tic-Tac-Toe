import type { Player, PlayerSymbol } from "@/lib/types";

interface PlayerBadgeProps {
  name: string;
  symbol: PlayerSymbol;
  isCurrentTurn?: boolean;
  isConnected?: boolean;
  isYou?: boolean;
}

export function PlayerBadge({
  name,
  symbol,
  isCurrentTurn = false,
  isConnected = true,
  isYou = false,
}: PlayerBadgeProps) {
  const symbolColor = symbol === "X" ? "text-sky-400" : "text-amber-400";
  const ringColor = symbol === "X" ? "ring-sky-500/40" : "ring-amber-500/40";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 transition-all ${
        isCurrentTurn ? `ring-2 ${ringColor}` : ""
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold ${symbolColor}`}
      >
        {symbol}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-100">
          {name}
          {isYou && <span className="ml-1 text-xs font-normal text-slate-500">(You)</span>}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-slate-500"}`}
            aria-hidden
          />
          <span className={isConnected ? "text-emerald-400" : "text-slate-500"}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
          {isCurrentTurn && <span className="text-indigo-400">· Your turn</span>}
        </div>
      </div>
    </div>
  );
}

interface PlayerListProps {
  players: Player[];
  currentTurn?: PlayerSymbol;
  sessionId?: string;
}

export function PlayerList({ players, currentTurn, sessionId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => (a.symbol === "X" ? -1 : 1));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sorted.map((player) => (
        <PlayerBadge
          key={player.id}
          name={player.name}
          symbol={player.symbol}
          isConnected={player.is_connected}
          isCurrentTurn={currentTurn === player.symbol}
          isYou={player.session_id === sessionId}
        />
      ))}
      {players.length < 2 && (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-6 text-sm text-slate-500">
          Waiting for opponent…
        </div>
      )}
    </div>
  );
}
