import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT || 3001);

function getAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URL || "http://localhost:3000";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      const allowed = getAllowedOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

// ============== Types ==============
type PlayerSymbol = "X" | "O";
type CellValue = "" | "X" | "O";
type GameResult = "X" | "O" | "draw";
type RoomStatus = "waiting" | "playing" | "game_over";

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

interface Room {
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

interface Player {
  id: string;
  room_id: string;
  name: string;
  symbol: PlayerSymbol;
  session_id: string;
  is_connected: boolean;
  joined_at: string;
  last_seen: string;
}

// ============== In-Memory Storage ==============
const rooms = new Map<string, Room>();
const players = new Map<string, Player>();
const roomCodes = new Map<string, string>(); // code -> roomId

// ============== Helper Functions ==============
function generateRoomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function checkWinner(board: CellValue[]): {
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

function isBoardFull(board: CellValue[]): boolean {
  return board.every((cell) => cell !== "");
}

function getGameResult(board: CellValue[]): GameResult | null {
  const { winner } = checkWinner(board);
  if (winner) return winner;
  if (isBoardFull(board)) return "draw";
  return null;
}

function getRoomPlayers(roomId: string): Player[] {
  return Array.from(players.values()).filter((p) => p.room_id === roomId);
}

function createNewGame(room: Room): Room {
  return {
    ...room,
    status: "playing",
    board: ["", "", "", "", "", "", "", "", ""],
    current_turn: "X",
    game_result: null,
    winning_line: null,
    rematch_x_accepted: false,
    rematch_o_accepted: false,
    version: room.version + 1,
    updated_at: new Date().toISOString(),
  };
}

// ============== Endpoints ==============
// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API info
app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "Tic Tac Toe API Server" });
});

// ============== Room Endpoints ==============

// Create a room
app.post("/api/rooms", (req: Request, res: Response) => {
  try {
    const { code: inputCode } = req.body;
    const code = inputCode?.toUpperCase() || generateRoomCode(6);

    if (roomCodes.has(code)) {
      return res.status(409).json({ message: "Room code collision. Please try again." });
    }

    const roomId = uuidv4();
    const now = new Date().toISOString();

    const room: Room = {
      id: roomId,
      code,
      status: "waiting",
      board: ["", "", "", "", "", "", "", "", ""],
      current_turn: "X",
      game_result: null,
      winning_line: null,
      score_x: 0,
      score_o: 0,
      score_draw: 0,
      rematch_x_accepted: false,
      rematch_o_accepted: false,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    rooms.set(roomId, room);
    roomCodes.set(code, roomId);
    res.status(201).json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Failed to create room" });
  }
});

// Get room by code
app.get("/api/rooms/code/:code", (req: Request, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();
    const roomId = roomCodes.get(code);

    if (!roomId) {
      return res.status(404).json(null);
    }

    const room = rooms.get(roomId);
    res.json(room || null);
  } catch (error) {
    console.error("Error fetching room by code:", error);
    res.status(500).json({ message: "Failed to fetch room" });
  }
});

// Get room by ID
app.get("/api/rooms/:roomId", (req: Request, res: Response) => {
  try {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      return res.status(404).json(null);
    }
    res.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({ message: "Failed to fetch room" });
  }
});

// ============== Player Endpoints ==============

// Get players in room
app.get("/api/rooms/:roomId/players", (req: Request, res: Response) => {
  try {
    const roomPlayers = getRoomPlayers(req.params.roomId).sort(
      (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    );
    res.json(roomPlayers);
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ message: "Failed to fetch players" });
  }
});

// Join room (create player)
app.post("/api/rooms/:roomId/players", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { name, session_id } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const roomPlayers = getRoomPlayers(roomId);
    const existing = roomPlayers.find((p) => p.session_id === session_id);

    if (existing) {
      existing.is_connected = true;
      existing.last_seen = new Date().toISOString();
      return res.json(existing);
    }

    if (roomPlayers.length >= 2) {
      return res.status(400).json({ message: "Room is full. Maximum 2 players allowed." });
    }

    const duplicateName = roomPlayers.some(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.session_id !== session_id
    );

    if (duplicateName) {
      return res.status(400).json({ message: "A player with this name is already in the room." });
    }

    const symbol: PlayerSymbol = roomPlayers.length === 0 ? "X" : "O";
    const playerId = uuidv4();
    const now = new Date().toISOString();

    const player: Player = {
      id: playerId,
      room_id: roomId,
      name: name.trim(),
      symbol,
      session_id,
      is_connected: true,
      joined_at: now,
      last_seen: now,
    };

    players.set(playerId, player);

    // Start game if both players are ready
    if (roomPlayers.length === 1 && room.status === "waiting") {
      const updatedRoom = createNewGame(room);
      rooms.set(roomId, updatedRoom);
    }

    res.status(201).json(player);
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ message: "Failed to join room" });
  }
});

// Update player presence
app.put("/api/players/:playerId/presence", (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    const { is_connected } = req.body;

    const player = players.get(playerId);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    player.is_connected = is_connected;
    player.last_seen = new Date().toISOString();

    res.json(player);
  } catch (error) {
    console.error("Error updating player presence:", error);
    res.status(500).json({ message: "Failed to update presence" });
  }
});

// ============== Game Endpoints ==============

// Make move
app.post("/api/rooms/:roomId/moves", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { session_id, cell_index, expected_version } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }

    if (room.version !== expected_version) {
      return res.json({
        success: false,
        error: "Version mismatch. Game state has changed.",
        code: "STALE",
      });
    }

    if (room.status !== "playing") {
      return res.json({ success: false, error: "Game is not currently playing." });
    }

    const roomPlayers = getRoomPlayers(roomId);
    const currentPlayer = roomPlayers.find((p) => p.session_id === session_id);

    if (!currentPlayer) {
      return res.json({ success: false, error: "Player not found in room." });
    }

    if (currentPlayer.symbol !== room.current_turn) {
      return res.json({ success: false, error: "It's not your turn." });
    }

    if (room.board[cell_index] !== "") {
      return res.json({ success: false, error: "Cell is already occupied." });
    }

    // Make the move
    const newBoard = [...room.board];
    newBoard[cell_index] = currentPlayer.symbol;

    const { winner, line } = checkWinner(newBoard);
    const gameResult = winner || (isBoardFull(newBoard) ? "draw" : null);

    const updatedRoom: Room = {
      ...room,
      board: newBoard,
      current_turn: currentPlayer.symbol === "X" ? "O" : "X",
      game_result: gameResult,
      winning_line: line || null,
      version: room.version + 1,
      updated_at: new Date().toISOString(),
    };

    if (gameResult) {
      updatedRoom.status = "game_over";
      updatedRoom.current_turn = currentPlayer.symbol;
      if (gameResult === "X") updatedRoom.score_x++;
      else if (gameResult === "O") updatedRoom.score_o++;
      else updatedRoom.score_draw++;
    }

    rooms.set(roomId, updatedRoom);

    res.json({
      success: true,
      game_over: gameResult !== null,
      result: gameResult,
    });
  } catch (error) {
    console.error("Error making move:", error);
    res.status(500).json({ success: false, error: "Failed to make move" });
  }
});

// Request rematch
app.post("/api/rooms/:roomId/rematch", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { session_id } = req.body;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }

    const roomPlayers = getRoomPlayers(roomId);
    const player = roomPlayers.find((p) => p.session_id === session_id);

    if (!player) {
      return res.json({ success: false, error: "Player not found" });
    }

    if (room.status !== "game_over") {
      return res.json({ success: false, error: "Game is not over yet." });
    }

    if (player.symbol === "X") {
      room.rematch_x_accepted = true;
    } else {
      room.rematch_o_accepted = true;
    }

    // Start new game if both players accepted
    if (room.rematch_x_accepted && room.rematch_o_accepted) {
      const newRoom = createNewGame(room);
      rooms.set(roomId, newRoom);
      return res.json({ success: true, started: true });
    }

    room.version++;
    room.updated_at = new Date().toISOString();
    rooms.set(roomId, room);

    res.json({ success: true, started: false });
  } catch (error) {
    console.error("Error requesting rematch:", error);
    res.status(500).json({ success: false, error: "Failed to request rematch" });
  }
});

// Reset scores
app.post("/api/rooms/:roomId/reset-scores", (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const room = rooms.get(roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: "Room not found" });
    }

    room.score_x = 0;
    room.score_o = 0;
    room.score_draw = 0;
    room.version += 1;
    room.updated_at = new Date().toISOString();

    rooms.set(roomId, room);

    res.json({ success: true });
  } catch (error) {
    console.error("Error resetting scores:", error);
    res.status(500).json({ success: false, error: "Failed to reset scores" });
  }
});

// ============== Start Server ==============
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
