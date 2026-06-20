"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createRoom, getRoomByCode, joinRoom } from "@/lib/api";
import {
  generateRoomCode,
  getOrCreateSessionId,
  normalizeRoomCode,
  saveSession,
  validatePlayerName,
  validateRoomCode,
} from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"create" | "join" | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateName = (): boolean => {
    const error = validatePlayerName(playerName);
    setNameError(error);
    return !error;
  };

  const handleCreateRoom = async () => {
    setGeneralError(null);
    setRoomError(null);
    if (!validateName()) return;

    setLoading("create");
    try {
      const sessionId = getOrCreateSessionId();
      let code = generateRoomCode(6);
      let attempts = 0;
      let room = null;

      while (attempts < 5) {
        const result = await createRoom(code);
        if (result.room) {
          room = result.room;
          break;
        }
        if (result.error?.includes("collision")) {
          code = generateRoomCode(6);
          attempts++;
          continue;
        }
        setGeneralError(result.error ?? "Failed to create room.");
        setLoading(null);
        return;
      }

      if (!room) {
        setGeneralError("Could not generate a unique room code. Please try again.");
        setLoading(null);
        return;
      }

      const { player, error } = await joinRoom(room.id, playerName, sessionId);
      if (error || !player) {
        setGeneralError(error ?? "Failed to join room.");
        setLoading(null);
        return;
      }

      saveSession({
        sessionId,
        playerName: playerName.trim(),
        roomId: room.id,
        roomCode: room.code,
      });

      router.push(`/room/${room.code}`);
    } catch {
      setGeneralError("Something went wrong. Check your Supabase configuration.");
    } finally {
      setLoading(null);
    }
  };

  const handleJoinRoom = async () => {
    setGeneralError(null);
    const nameValid = validateName();
    const codeValidation = validateRoomCode(roomCode);
    setRoomError(codeValidation);
    if (!nameValid || codeValidation) return;

    setLoading("join");
    try {
      const normalized = normalizeRoomCode(roomCode);
      const sessionId = getOrCreateSessionId();
      const { room, error: fetchError } = await getRoomByCode(normalized);

      if (fetchError) {
        setGeneralError(fetchError);
        setLoading(null);
        return;
      }

      if (!room) {
        setRoomError("Invalid room code. Please check and try again.");
        setLoading(null);
        return;
      }

      const { player, error, errorCode } = await joinRoom(room.id, playerName, sessionId);

      if (errorCode === "ROOM_FULL") {
        setRoomError("Room Full — this room already has 2 players.");
        setLoading(null);
        return;
      }

      if (error || !player) {
        setGeneralError(error ?? "Failed to join room.");
        setLoading(null);
        return;
      }

      saveSession({
        sessionId,
        playerName: playerName.trim(),
        roomId: room.id,
        roomCode: room.code,
      });

      router.push(`/room/${room.code}`);
    } catch {
      setGeneralError("Something went wrong. Check your Supabase configuration.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl animate-fade-in">
        <header className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
            Real-time multiplayer
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Tic Tac Toe
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Challenge a friend online. Create a room, share your code, and play instantly —
            synchronized in real time.
          </p>
        </header>

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
              <Input
                label="Your name"
                placeholder="Enter your display name"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                error={nameError}
                maxLength={20}
                autoComplete="nickname"
              />

              <div className="mt-8 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Create a room</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Start a new game and invite a friend with your room code.
                  </p>
                  <Button
                    className="mt-4 w-full sm:w-auto"
                    onClick={handleCreateRoom}
                    disabled={loading !== null}
                  >
                    {loading === "create" ? "Creating…" : "Create Room"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-slate-900/50 px-3 text-slate-500">or join</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Join a room</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the 6–8 character code shared by your opponent.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input
                      label="Room code"
                      placeholder="e.g. ABC123"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        if (roomError) setRoomError(null);
                      }}
                      error={roomError}
                      maxLength={8}
                      className="uppercase tracking-widest"
                    />
                  </div>
                  <Button
                    className="mt-4 w-full sm:w-auto"
                    variant="secondary"
                    onClick={handleJoinRoom}
                    disabled={loading !== null}
                  >
                    {loading === "join" ? "Joining…" : "Join Room"}
                  </Button>
                </div>
              </div>

              {generalError && (
                <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
                  {generalError}
                </p>
              )}
            </div>
          </section>

          <aside className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-slate-100">How to play</h2>
              <ol className="mt-4 space-y-4 text-sm text-slate-400">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    1
                  </span>
                  <span>Enter your name — it&apos;s required to create or join a room.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    2
                  </span>
                  <span>Create a room and share the code, or join with a friend&apos;s code.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    3
                  </span>
                  <span>First player is <strong className="text-sky-400">X</strong>, second is <strong className="text-amber-400">O</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    4
                  </span>
                  <span>Take turns placing your mark. Get three in a row to win!</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                    5
                  </span>
                  <span>After each game, both players can accept a rematch. Scores sync automatically.</span>
                </li>
              </ol>

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Preview</p>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {["X", "", "O", "", "X", "", "O", "", ""].map((cell, i) => (
                    <div
                      key={i}
                      className={`flex aspect-square items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-lg font-bold ${
                        cell === "X" ? "text-sky-400" : cell === "O" ? "text-amber-400" : "text-slate-700"
                      }`}
                    >
                      {cell || "·"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          Built with Next.js & Supabase Realtime · Deploy on Vercel
        </footer>
      </div>
    </main>
  );
}
