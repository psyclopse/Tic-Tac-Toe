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
      setGeneralError("Something went wrong. Check that the API server is running.");
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
      setGeneralError("Something went wrong. Check that the API server is running.");
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
          <section className="lg:col-start-2 lg:col-span-3">
            <div className="relative overflow-hidden rounded-[28px] border border-amber-900/25 bg-[linear-gradient(135deg,rgba(255,251,240,0.98),rgba(242,228,196,0.98))] p-6 shadow-[0_18px_45px_rgba(82,58,24,0.25)] ring-1 ring-white/60 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(120,89,51,0.16),transparent_42%),repeating-linear-gradient(0deg,rgba(120,89,51,0.05)_0,rgba(120,89,51,0.05)_1px,transparent_1px,transparent_4px)] before:opacity-90 before:content-[''] sm:p-8">
              <div className="relative z-10">
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
            </div>
          </section>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-600">
          Built with Next.js & Express · Frontend on Vercel · Backend on Render
        </footer>
      </div>
    </main>
  );
}
