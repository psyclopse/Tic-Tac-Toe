import type { MoveResult, Player, RematchResult, Room } from "./types";
import { parseBoard } from "./utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }
  return response.json();
}

export async function createRoom(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const data = await handleResponse<ApiRoom>(
      await fetch(`${API_URL}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
    );
    return { room: mapRoom(data), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room";
    if (message.includes("collision")) {
      return { room: null, error: "Room code collision. Please try again." };
    }
    return { room: null, error: message };
  }
}

export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const data = await handleResponse<ApiRoom | null>(
      await fetch(`${API_URL}/api/rooms/code/${code}`)
    );
    return { room: data ? mapRoom(data) : null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    return { room: null, error: message };
  }
}

export async function getRoomById(id: string): Promise<{ room: Room | null; error: string | null }> {
  try {
    const data = await handleResponse<ApiRoom | null>(
      await fetch(`${API_URL}/api/rooms/${id}`)
    );
    return { room: data ? mapRoom(data) : null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room";
    return { room: null, error: message };
  }
}

export async function getPlayersInRoom(roomId: string): Promise<{ players: Player[]; error: string | null }> {
  try {
    const data = await handleResponse<ApiPlayer[]>(
      await fetch(`${API_URL}/api/rooms/${roomId}/players`)
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
    const data = await handleResponse<ApiPlayer>(
      await fetch(`${API_URL}/api/rooms/${roomId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, session_id: sessionId }),
      })
    );
    return { player: mapPlayer(data), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join room";
    if (message.includes("full")) {
      return { player: null, error: "Room is full. Maximum 2 players allowed.", errorCode: "ROOM_FULL" };
    }
    if (message.includes("already")) {
      return { player: null, error: message, errorCode: "DUPLICATE" };
    }
    return { player: null, error: message };
  }
}

export async function updatePlayerPresence(playerId: string, connected: boolean): Promise<void> {
  try {
    await handleResponse<void>(
      await fetch(`${API_URL}/api/players/${playerId}/presence`, {
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
    const data = await handleResponse<MoveResult>(
      await fetch(`${API_URL}/api/rooms/${roomId}/moves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          cell_index: cellIndex,
          expected_version: expectedVersion,
        }),
      })
    );
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Move failed";
    return { success: false, error: message };
  }
}

export async function requestRematch(roomId: string, sessionId: string): Promise<RematchResult> {
  try {
    const data = await handleResponse<RematchResult>(
      await fetch(`${API_URL}/api/rooms/${roomId}/rematch`, {
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
      await fetch(`${API_URL}/api/rooms/${roomId}/reset-scores`, {
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

// Polling-based subscription for development. In production, consider WebSockets.
export function subscribeToRoom(
  roomId: string,
  onRoomChange: (room: Room) => void,
  onPlayersChange: (players: Player[]) => void
): () => void {
  let lastRoomVersion = -1;
  let lastPlayersVersion = -1;

  const interval = setInterval(async () => {
    try {
      const { room } = await getRoomById(roomId);
      if (room && room.version > lastRoomVersion) {
        lastRoomVersion = room.version;
        onRoomChange(room);
      }

      const { players } = await getPlayersInRoom(roomId);
      if (players.length > 0 && players.length !== lastPlayersVersion) {
        lastPlayersVersion = players.length;
        onPlayersChange(players);
      }
    } catch (error) {
      console.error("Subscription error:", error);
    }
  }, 1000); // Poll every second

  return () => clearInterval(interval);
}
