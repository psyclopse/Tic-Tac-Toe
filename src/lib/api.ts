import type { MoveResult, Player, RematchResult, Room } from "./types";
import { getApiBaseUrl, parseBoard } from "./utils";

interface ApiRoom {
  id: string;
  code: string;
  status: string;
  board: unknown;
  current_turn: string;
  game_result: string | null;
  winning_line: number[] | null;
  score_x: number;
  score_o: number;
  score_draw: number;
  rematch_x_accepted: boolean;
  rematch_o_accepted: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface ApiPlayer {
  id: string;
  room_id: string;
  name: string;
  symbol: string;
  session_id: string;
  is_connected: boolean;
  joined_at: string;
  last_seen: string;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
}

function mapRoom(data: ApiRoom): Room {
  return {
    id: data.id,
    code: data.code,
    status: data.status as Room["status"],
    board: parseBoard(data.board),
    current_turn: data.current_turn as Room["current_turn"],
    game_result: data.game_result as Room["game_result"],
    winning_line: data.winning_line,
    score_x: data.score_x,
    score_o: data.score_o,
    score_draw: data.score_draw,
    rematch_x_accepted: data.rematch_x_accepted,
    rematch_o_accepted: data.rematch_o_accepted,
    version: data.version,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function mapPlayer(data: ApiPlayer): Player {
  return {
    id: data.id,
    room_id: data.room_id,
    name: data.name,
    symbol: data.symbol as Player["symbol"],
    session_id: data.session_id,
    is_connected: data.is_connected,
    joined_at: data.joined_at,
    last_seen: data.last_seen,
  };
}

async function parseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  const error = await parseJson<ApiErrorBody>(response);
  throw new Error(error?.message || error?.error || `API error: ${response.status}`);
}

export async function createRoom(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (response.status === 409) {
      return { room: null, error: "Room code collision. Please try again." };
    }

    const data = await handleResponse<ApiRoom>(response);
    return { room: mapRoom(data), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    return { room: null, error: message };
  }
}

export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms/code/${encodeURIComponent(code)}`);

    if (response.status === 404) {
      return { room: null, error: null };
    }

    const data = await handleResponse<ApiRoom | null>(response);
    return { room: data ? mapRoom(data) : null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    return { room: null, error: message };
  }
}

export async function getRoomById(id: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(id)}`);

    if (response.status === 404) {
      return { room: null, error: null };
    }

    const data = await handleResponse<ApiRoom | null>(response);
    return { room: data ? mapRoom(data) : null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    return { room: null, error: message };
  }
}

export async function getPlayersInRoom(roomId: string): Promise<{ players: Player[]; error: string | null }> {
  try {
    const data = await handleResponse<ApiPlayer[]>(
      await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/players`)
    );
    return { players: data.map(mapPlayer), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch players";
    return { players: [], error: message };
  }
}

export async function joinRoom(
  roomId: string,
  name: string,
  sessionId: string
): Promise<{ player: Player | null; error: string | null; errorCode?: string }> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, session_id: sessionId }),
    });

    if (response.status === 400) {
      const body = await parseJson<ApiErrorBody>(response);
      const message = body?.message || "Failed to join room";
      if (message.toLowerCase().includes("full")) {
        return { player: null, error: "Room is full. Maximum 2 players allowed.", errorCode: "ROOM_FULL" };
      }
      if (message.toLowerCase().includes("already")) {
        return { player: null, error: message, errorCode: "DUPLICATE" };
      }
      return { player: null, error: message };
    }

    const data = await handleResponse<ApiPlayer>(response);
    return { player: mapPlayer(data), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room";
    return { player: null, error: message };
  }
}

export async function updatePlayerPresence(playerId: string, connected: boolean): Promise<void> {
  try {
    await handleResponse<ApiPlayer>(
      await fetch(`${getApiBaseUrl()}/api/players/${encodeURIComponent(playerId)}/presence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_connected: connected }),
      })
    );
  } catch (error) {
    console.error("Failed to update player presence:", error);
  }
}

export async function makeMove(
  roomId: string,
  sessionId: string,
  cellIndex: number,
  expectedVersion: number
): Promise<MoveResult> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/moves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        cell_index: cellIndex,
        expected_version: expectedVersion,
      }),
    });

    const data = await parseJson<MoveResult>(response);
    if (data) return data;

    return { success: false, error: "Move failed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Move failed";
    return { success: false, error: message };
  }
}

export async function requestRematch(roomId: string, sessionId: string): Promise<RematchResult> {
  try {
    const data = await handleResponse<RematchResult>(
      await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/rematch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
    );
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rematch request failed";
    return { success: false, error: message };
  }
}

export async function resetScores(roomId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const data = await handleResponse<{ success: boolean; error?: string }>(
      await fetch(`${getApiBaseUrl()}/api/rooms/${encodeURIComponent(roomId)}/reset-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reset failed";
    return { success: false, error: message };
  }
}

function playersFingerprint(players: Player[]): string {
  return players
    .map((p) => `${p.id}:${p.is_connected}:${p.last_seen}`)
    .sort()
    .join("|");
}

export function subscribeToRoom(
  roomId: string,
  onRoomChange: (room: Room) => void,
  onPlayersChange: (players: Player[]) => void
): () => void {
  let lastRoomVersion = -1;
  let lastPlayersFingerprint = "";

  const poll = async () => {
    try {
      const [{ room }, { players }] = await Promise.all([
        getRoomById(roomId),
        getPlayersInRoom(roomId),
      ]);

      if (room && room.version !== lastRoomVersion) {
        lastRoomVersion = room.version;
        onRoomChange(room);
      }

      const fingerprint = playersFingerprint(players);
      if (fingerprint !== lastPlayersFingerprint) {
        lastPlayersFingerprint = fingerprint;
        onPlayersChange(players);
      }
    } catch (error) {
      console.error("Subscription error:", error);
    }
  };

  void poll();
  const interval = setInterval(poll, 1000);

  return () => clearInterval(interval);
}
