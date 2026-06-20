import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { MoveResult, Player, RematchResult, Room } from "./types";
import { parseBoard } from "./utils";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  supabaseClient = createClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: row.id as string,
    code: row.code as string,
    status: row.status as Room["status"],
    board: parseBoard(row.board),
    current_turn: row.current_turn as Room["current_turn"],
    game_result: (row.game_result as Room["game_result"]) ?? null,
    winning_line: (row.winning_line as number[] | null) ?? null,
    score_x: row.score_x as number,
    score_o: row.score_o as number,
    score_draw: row.score_draw as number,
    rematch_x_accepted: row.rematch_x_accepted as boolean,
    rematch_o_accepted: row.rematch_o_accepted as boolean,
    version: row.version as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    room_id: row.room_id as string,
    name: row.name as string,
    symbol: row.symbol as Player["symbol"],
    session_id: row.session_id as string,
    is_connected: row.is_connected as boolean,
    joined_at: row.joined_at as string,
    last_seen: row.last_seen as string,
  };
}

export async function createRoom(code: string): Promise<{ room: Room | null; error: string | null }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("rooms")
    .insert({ code })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { room: null, error: "Room code collision. Please try again." };
    }
    return { room: null, error: error.message };
  }

  return { room: mapRoom(data), error: null };
}

export async function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }> {
  const supabase = getSupabase();

  const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();

  if (error) return { room: null, error: error.message };
  if (!data) return { room: null, error: null };

  return { room: mapRoom(data), error: null };
}

export async function getRoomById(id: string): Promise<{ room: Room | null; error: string | null }> {
  const supabase = getSupabase();

  const { data, error } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle();

  if (error) return { room: null, error: error.message };
  if (!data) return { room: null, error: null };

  return { room: mapRoom(data), error: null };
}

export async function getPlayersInRoom(roomId: string): Promise<{ players: Player[]; error: string | null }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) return { players: [], error: error.message };
  return { players: (data ?? []).map(mapPlayer), error: null };
}

export async function joinRoom(
  roomId: string,
  name: string,
  sessionId: string
): Promise<{ player: Player | null; error: string | null; errorCode?: string }> {
  const supabase = getSupabase();

  const { players, error: playersError } = await getPlayersInRoom(roomId);
  if (playersError) return { player: null, error: playersError };

  const existing = players.find((p) => p.session_id === sessionId);
  if (existing) {
    await updatePlayerPresence(existing.id, true);
    return { player: { ...existing, is_connected: true }, error: null };
  }

  if (players.length >= 2) {
    return { player: null, error: "Room is full. Maximum 2 players allowed.", errorCode: "ROOM_FULL" };
  }

  const duplicateName = players.some(
    (p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.session_id !== sessionId
  );
  if (duplicateName) {
    return { player: null, error: "A player with this name is already in the room.", errorCode: "DUPLICATE" };
  }

  const symbol = players.length === 0 ? "X" : "O";

  const { data, error } = await supabase
    .from("players")
    .insert({
      room_id: roomId,
      name: name.trim(),
      symbol,
      session_id: sessionId,
      is_connected: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { player: null, error: "You are already in this room.", errorCode: "DUPLICATE" };
    }
    return { player: null, error: error.message };
  }

  const player = mapPlayer(data);

  if (symbol === "O") {
    await supabase.rpc("start_game_if_ready", { p_room_id: roomId });
  }

  return { player, error: null };
}

export async function updatePlayerPresence(playerId: string, connected: boolean): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("players")
    .update({
      is_connected: connected,
      last_seen: new Date().toISOString(),
    })
    .eq("id", playerId);
}

export async function makeMove(
  roomId: string,
  sessionId: string,
  cellIndex: number,
  expectedVersion: number
): Promise<MoveResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("make_move", {
    p_room_id: roomId,
    p_session_id: sessionId,
    p_cell_index: cellIndex,
    p_expected_version: expectedVersion,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as MoveResult;
}

export async function requestRematch(roomId: string, sessionId: string): Promise<RematchResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("start_rematch", {
    p_room_id: roomId,
    p_session_id: sessionId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as RematchResult;
}

export async function resetScores(roomId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data, error } = await supabase.rpc("reset_scores", {
    p_room_id: roomId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string };
}

export function subscribeToRoom(
  roomId: string,
  onRoomChange: (room: Room) => void,
  onPlayersChange: (players: Player[]) => void
): () => void {
  const supabase = getSupabase();

  const roomChannel = supabase
    .channel(`room:${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      async () => {
        const { room } = await getRoomById(roomId);
        if (room) onRoomChange(room);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      async () => {
        const { players } = await getPlayersInRoom(roomId);
        onPlayersChange(players);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(roomChannel);
  };
}
