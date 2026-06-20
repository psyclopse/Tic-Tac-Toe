import { WINNING_COMBINATIONS, type CellValue, type GameResult, type PlayerSymbol } from "./types";

export function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function validatePlayerName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Player name is required.";
  }
  if (trimmed.length < 2) {
    return "Name must be at least 2 characters.";
  }
  if (trimmed.length > 20) {
    return "Name must be 20 characters or fewer.";
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return "Name can only contain letters, numbers, spaces, hyphens, and underscores.";
  }
  return null;
}

export function validateRoomCode(code: string): string | null {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return "Room code is required.";
  }
  if (trimmed.length < 6 || trimmed.length > 8) {
    return "Room code must be 6–8 characters.";
  }
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return "Room code must be alphanumeric.";
  }
  return null;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function checkWinner(board: CellValue[]): {
  winner: PlayerSymbol | null;
  line: number[] | null;
} {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as PlayerSymbol, line: combo };
    }
  }
  return { winner: null, line: null };
}

export function isBoardFull(board: CellValue[]): boolean {
  return board.every((cell) => cell !== "");
}

export function getGameResult(board: CellValue[]): GameResult | null {
  const { winner } = checkWinner(board);
  if (winner) return winner;
  if (isBoardFull(board)) return "draw";
  return null;
}

export function parseBoard(raw: unknown): CellValue[] {
  if (Array.isArray(raw)) {
    return raw.map((cell) => (cell === "X" || cell === "O" ? cell : "")) as CellValue[];
  }
  return ["", "", "", "", "", "", "", "", ""];
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "ttt_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function saveSession(data: {
  sessionId: string;
  playerName: string;
  roomId: string;
  roomCode: string;
}): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ttt_session", JSON.stringify(data));
}

export function loadSession(): {
  sessionId: string;
  playerName: string;
  roomId: string;
  roomCode: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("ttt_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ttt_session");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
