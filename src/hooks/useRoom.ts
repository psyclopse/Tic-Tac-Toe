"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPlayersInRoom,
  getRoomById,
  subscribeToRoom,
  updatePlayerPresence,
} from "@/lib/api";
import type { Player, Room } from "@/lib/types";

interface UseRoomOptions {
  roomId: string;
  sessionId?: string;
}

export function useRoom({ roomId, sessionId }: UseRoomOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const [{ room: fetchedRoom, error: roomError }, { players: fetchedPlayers, error: playersError }] =
      await Promise.all([getRoomById(roomId), getPlayersInRoom(roomId)]);

    if (roomError || playersError) {
      setError(roomError ?? playersError);
    } else {
      setRoom(fetchedRoom);
      setPlayers(fetchedPlayers);
      setError(null);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = subscribeToRoom(
      roomId,
      (updatedRoom) => setRoom(updatedRoom),
      (updatedPlayers) => setPlayers(updatedPlayers)
    );

    return unsubscribe;
  }, [roomId]);

  const currentPlayerForPresence = players.find((p) => p.session_id === sessionId);

  useEffect(() => {
    const playerId = currentPlayerForPresence?.id;
    if (!playerId) return;

    const markOnline = () => updatePlayerPresence(playerId, true);
    const markOffline = () => {
      void updatePlayerPresence(playerId, false);
    };

    markOnline();
    heartbeatRef.current = setInterval(markOnline, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        markOnline();
      } else {
        markOffline();
      }
    };

    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      markOffline();
    };
  }, [currentPlayerForPresence?.id]);

  const currentPlayer = players.find((p) => p.session_id === sessionId) ?? null;
  const opponent = players.find((p) => p.session_id !== sessionId) ?? null;

  return {
    room,
    players,
    currentPlayer,
    opponent,
    loading,
    error,
    refresh,
  };
}
