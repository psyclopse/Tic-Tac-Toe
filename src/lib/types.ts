export type RoomStatus = "waiting" | "playing" | "game_over";
export type GameResult = "X" | "O" | "draw";
export type PlayerSymbol = "X" | "O";
export type CellValue = "" | "X" | "O";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  board: CellValue[];
  current_turn: PlayerSymbol;
  game_result: GameResult | null;
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

export interface Player {
  id: string;
  room_id: string;
  name: string;
  symbol: PlayerSymbol;
  session_id: string;
  is_connected: boolean;
  joined_at: string;
  last_seen: string;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  code?: string;
  game_over?: boolean;
  result?: GameResult;
}

export interface RematchResult {
  success: boolean;
  error?: string;
  started?: boolean;
}

export interface SessionData {
  sessionId: string;
  playerName: string;
  roomId?: string;
  roomCode?: string;
}

export const EMPTY_BOARD: CellValue[] = ["", "", "", "", "", "", "", "", ""];

export const WINNING_COMBINATIONS: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
