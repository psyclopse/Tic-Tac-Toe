"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { GameBoard } from "@/components/GameBoard";
import { PlayerList } from "@/components/PlayerBadge";
import { RematchPanel } from "@/components/RematchPanel";
import { ScoreBoard } from "@/components/ScoreBoard";
import { Button } from "@/components/ui/Button";
import { useRoom } from "@/hooks/useRoom";
import { getRoomByCode, getPlayersInRoom, joinRoom, makeMove, requestRematch, resetScores } from "@/lib/api";
import { getOrCreateSessionId, loadSession, saveSession } from "@/lib/utils";

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [sessionId, setSessionId] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (!code || !sessionId) return;

    async function init() {
      const { room, error } = await getRoomByCode(code);
      if (error) {
        setInitError(error);
        return;
      }
      if (!room) {
        setInitError("Invalid Room Code — please check and try again.");
        return;
      }

      setRoomId(room.id);

      const session = loadSession();
      if (!session?.playerName) {
        setInitError("Please enter your name on the home page before joining a room.");
        return;
      }

      if (session.roomId === room.id && session.sessionId === sessionId) {
        const { error: rejoinError, errorCode } = await joinRoom(
          room.id,
          session.playerName,
          sessionId
        );
        if (rejoinError && errorCode === "ROOM_FULL") {
          const { players } = await getPlayersInRoom(room.id);
          const isMember = players.some((p) => p.session_id === sessionId);
          if (!isMember) {
            setInitError("Room Full — this room already has 2 players.");
          }
        }
        return;
      }

      const { player, error: joinError, errorCode } = await joinRoom(
        room.id,
        session.playerName,
        sessionId
      );

      if (joinError && errorCode === "ROOM_FULL") {
        setInitError("Room Full — this room already has 2 players.");
        return;
      }

      if (joinError && errorCode !== "DUPLICATE") {
        setInitError(joinError);
        return;
      }

      if (player) {
        saveSession({
          sessionId,
          playerName: session.playerName,
          roomId: room.id,
          roomCode: room.code,
        });
      }
    }

    void init();
  }, [code, sessionId]);

  const { room, players, currentPlayer, loading, error, refresh } = useRoom({
    roomId: roomId ?? "",
    sessionId,
  });

  const handleCellClick = useCallback(
    async (index: number) => {
      if (!room || !currentPlayer || moveLoading) return;
      if (room.status !== "playing") return;
      if (room.current_turn !== currentPlayer.symbol) return;

      setMoveLoading(true);
      setMoveError(null);

      const result = await makeMove(room.id, sessionId, index, room.version);

      if (!result.success) {
        if (result.code === "STALE") {
          await refresh();
        } else {
          setMoveError(result.error ?? "Move failed.");
        }
      }

      setMoveLoading(false);
    },
    [room, currentPlayer, moveLoading, sessionId, refresh]
  );

  const handleRematch = async () => {
    if (!room) return;
    setActionLoading(true);
    await requestRematch(room.id, sessionId);
    setActionLoading(false);
  };

  const handleResetScores = async () => {
    if (!room) return;
    setActionLoading(true);
    await resetScores(room.id);
    setActionLoading(false);
  };

  if (initError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-slate-900/80 p-8 text-center">
          <h1 className="text-xl font-semibold text-rose-300">{initError}</h1>
          {initError.toLowerCase().includes("name") && (
            <p className="mt-3 text-sm text-slate-500">Enter your name, then create or join a room.</p>
          )}
          <Link href="/" className="mt-6 inline-block">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!roomId || loading || !room) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-slate-400">Loading room…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-slate-900/80 p-8 text-center">
          <h1 className="text-xl font-semibold text-rose-300">{error}</h1>
          <Link href="/" className="mt-6 inline-block">
            <Button variant="secondary">Back to Home</Button>
          </Link>
        </div>
      </main>
    );
  }

  const isWaiting = room.status === "waiting" || players.length < 2;
  const isGameOver = room.status === "game_over";
  const isMyTurn = currentPlayer?.symbol === room.current_turn;
  const boardDisabled =
    isWaiting ||
    isGameOver ||
    !isMyTurn ||
    moveLoading ||
    !currentPlayer?.is_connected;

  const winnerPlayer = players.find((p) => p.symbol === room.game_result);
  const gameOverMessage = isGameOver
    ? room.game_result === "draw"
      ? "It's a draw!"
      : `${winnerPlayer?.name ?? room.game_result} wins!`
    : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl animate-fade-in">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-300">
              ← Leave room
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-white">Room {room.code}</h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2">
            <span className="font-mono text-lg font-bold tracking-widest text-indigo-300">
              {room.code}
            </span>
            <CopyButton text={room.code} label="Copy code" />
          </div>
        </header>

        {isWaiting ? (
          <WaitingRoom roomCode={room.code} players={players} sessionId={sessionId} />
        ) : (
          <>
            <PlayerList players={players} currentTurn={room.current_turn} sessionId={sessionId} />

            <div className="mt-6">
              <ScoreBoard
                players={players}
                scoreX={room.score_x}
                scoreO={room.score_o}
                scoreDraw={room.score_draw}
              />
            </div>

            {!isGameOver && (
              <p className="mt-6 text-center text-sm text-slate-400">
                {isMyTurn ? (
                  <span className="font-medium text-indigo-400">Your turn — make a move!</span>
                ) : (
                  <span>Waiting for {room.current_turn}&apos;s move…</span>
                )}
              </p>
            )}

            {isGameOver && gameOverMessage && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center">
                <p className="text-lg font-semibold text-emerald-300">{gameOverMessage}</p>
              </div>
            )}

            <div className="mt-6">
              <GameBoard
                board={room.board}
                winningLine={room.winning_line}
                onCellClick={handleCellClick}
                disabled={boardDisabled}
                interactive={!isGameOver}
              />
            </div>

            {moveError && (
              <p className="mt-4 text-center text-sm text-rose-400" role="alert">
                {moveError}
              </p>
            )}

            {isGameOver && currentPlayer && (
              <div className="mt-8">
                <RematchPanel
                  currentPlayer={currentPlayer}
                  rematchXAccepted={room.rematch_x_accepted}
                  rematchOAccepted={room.rematch_o_accepted}
                  onRequestRematch={handleRematch}
                  onResetScores={handleResetScores}
                  loading={actionLoading}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function WaitingRoom({
  roomCode,
  players,
  sessionId,
}: {
  roomCode: string;
  players: import("@/lib/types").Player[];
  sessionId: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10">
        <div className="h-3 w-3 animate-pulse-soft rounded-full bg-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-100">Waiting for opponent</h2>
      <p className="mt-2 text-slate-400">
        Share room code <span className="font-mono font-bold text-indigo-300">{roomCode}</span> with
        a friend. The game starts when they join.
      </p>

      <div className="mt-8">
        <PlayerList players={players} sessionId={sessionId} />
      </div>

      <div className="mt-8 flex justify-center">
        <CopyButton text={roomCode} label="Copy room code" />
      </div>
    </div>
  );
}
