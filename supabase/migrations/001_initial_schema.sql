-- Tic-Tac-Toe Multiplayer Schema
-- Run this in the Supabase SQL Editor or via Supabase CLI migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Room status enum
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'game_over');
CREATE TYPE game_result AS ENUM ('X', 'O', 'draw');
CREATE TYPE player_symbol AS ENUM ('X', 'O');

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  status room_status NOT NULL DEFAULT 'waiting',
  board JSONB NOT NULL DEFAULT '["","","","","","","","",""]'::jsonb,
  current_turn player_symbol NOT NULL DEFAULT 'X',
  game_result game_result,
  winning_line JSONB,
  score_x INTEGER NOT NULL DEFAULT 0 CHECK (score_x >= 0),
  score_o INTEGER NOT NULL DEFAULT 0 CHECK (score_o >= 0),
  score_draw INTEGER NOT NULL DEFAULT 0 CHECK (score_draw >= 0),
  rematch_x_accepted BOOLEAN NOT NULL DEFAULT false,
  rematch_o_accepted BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT code_length CHECK (char_length(code) >= 6 AND char_length(code) <= 8)
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  symbol player_symbol NOT NULL,
  session_id TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT name_length CHECK (char_length(trim(name)) >= 2 AND char_length(trim(name)) <= 20),
  UNIQUE (room_id, session_id),
  UNIQUE (room_id, symbol)
);

-- Indexes
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_session_id ON players(session_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow public read/write for anon users (game app pattern)
-- In production you may tighten these with auth; for room-code based access this is standard.

CREATE POLICY "Anyone can read rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update players"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete players"
  ON players FOR DELETE
  USING (true);

-- Enable Realtime for both tables
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE players REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Atomic move function to prevent race conditions
CREATE OR REPLACE FUNCTION make_move(
  p_room_id UUID,
  p_session_id TEXT,
  p_cell_index INTEGER,
  p_expected_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_player players%ROWTYPE;
  v_board TEXT[];
  v_symbol player_symbol;
  v_new_board JSONB;
  v_result game_result;
  v_winning_line JSONB;
  v_winning_combos INTEGER[][] := ARRAY[
    ARRAY[0,1,2], ARRAY[3,4,5], ARRAY[6,7,8],
    ARRAY[0,3,6], ARRAY[1,4,7], ARRAY[2,5,8],
    ARRAY[0,4,8], ARRAY[2,4,6]
  ];
  v_combo INTEGER[];
  v_i INTEGER;
  v_j INTEGER;
  v_a INTEGER;
  v_b INTEGER;
  v_c INTEGER;
  v_filled INTEGER;
BEGIN
  -- Lock room row for update
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room.status != 'playing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not in progress');
  END IF;

  IF v_room.version != p_expected_version THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stale state', 'code', 'STALE');
  END IF;

  IF p_cell_index < 0 OR p_cell_index > 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid cell');
  END IF;

  SELECT * INTO v_player FROM players
  WHERE room_id = p_room_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  IF v_player.symbol != v_room.current_turn THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your turn');
  END IF;

  -- Parse board
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(v_room.board)
  ) INTO v_board;

  IF v_board[p_cell_index + 1] != '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cell occupied');
  END IF;

  v_symbol := v_player.symbol;
  v_board[p_cell_index + 1] := v_symbol::TEXT;
  v_new_board := to_jsonb(v_board);

  -- Check for win
  v_result := NULL;
  v_winning_line := NULL;

  FOR v_i IN 1..8 LOOP
    v_combo := v_winning_combos[v_i];
    v_a := v_combo[1] + 1;
    v_b := v_combo[2] + 1;
    v_c := v_combo[3] + 1;

    IF v_board[v_a] = v_symbol::TEXT
       AND v_board[v_b] = v_symbol::TEXT
       AND v_board[v_c] = v_symbol::TEXT THEN
      v_result := v_symbol;
      v_winning_line := to_jsonb(v_combo);
      EXIT;
    END IF;
  END LOOP;

  -- Check for draw
  IF v_result IS NULL THEN
    v_filled := 0;
    FOR v_j IN 1..9 LOOP
      IF v_board[v_j] != '' THEN
        v_filled := v_filled + 1;
      END IF;
    END LOOP;

    IF v_filled = 9 THEN
      v_result := 'draw'::game_result;
    END IF;
  END IF;

  IF v_result IS NOT NULL THEN
    UPDATE rooms SET
      board = v_new_board,
      game_result = v_result,
      winning_line = v_winning_line,
      status = 'game_over',
      score_x = score_x + CASE WHEN v_result = 'X' THEN 1 ELSE 0 END,
      score_o = score_o + CASE WHEN v_result = 'O' THEN 1 ELSE 0 END,
      score_draw = score_draw + CASE WHEN v_result = 'draw' THEN 1 ELSE 0 END,
      version = version + 1,
      rematch_x_accepted = false,
      rematch_o_accepted = false
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'game_over', true, 'result', v_result);
  ELSE
    UPDATE rooms SET
      board = v_new_board,
      current_turn = CASE WHEN current_turn = 'X' THEN 'O'::player_symbol ELSE 'X'::player_symbol END,
      version = version + 1
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'game_over', false);
  END IF;
END;
$$;

-- Reset game for rematch (both players accepted)
CREATE OR REPLACE FUNCTION start_rematch(
  p_room_id UUID,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_player players%ROWTYPE;
  v_x_accepted BOOLEAN;
  v_o_accepted BOOLEAN;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  IF v_room.status != 'game_over' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game is not over');
  END IF;

  SELECT * INTO v_player FROM players
  WHERE room_id = p_room_id AND session_id = p_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;

  IF v_player.symbol = 'X' THEN
    UPDATE rooms SET rematch_x_accepted = true WHERE id = p_room_id;
  ELSE
    UPDATE rooms SET rematch_o_accepted = true WHERE id = p_room_id;
  END IF;

  SELECT rematch_x_accepted, rematch_o_accepted
  INTO v_x_accepted, v_o_accepted
  FROM rooms WHERE id = p_room_id;

  IF v_x_accepted AND v_o_accepted THEN
    UPDATE rooms SET
      board = '["","","","","","","","",""]'::jsonb,
      current_turn = 'X',
      game_result = NULL,
      winning_line = NULL,
      status = 'playing',
      rematch_x_accepted = false,
      rematch_o_accepted = false,
      version = version + 1
    WHERE id = p_room_id;

    RETURN jsonb_build_object('success', true, 'started', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'started', false);
END;
$$;

-- Reset scores
CREATE OR REPLACE FUNCTION reset_scores(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE rooms SET
    score_x = 0,
    score_o = 0,
    score_draw = 0,
    version = version + 1
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Room not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Start game when second player joins
CREATE OR REPLACE FUNCTION start_game_if_ready(p_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM players WHERE room_id = p_room_id;

  IF v_count = 2 THEN
    UPDATE rooms SET
      status = 'playing',
      board = '["","","","","","","","",""]'::jsonb,
      current_turn = 'X',
      game_result = NULL,
      winning_line = NULL,
      version = version + 1
    WHERE id = p_room_id AND status = 'waiting';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION make_move TO anon, authenticated;
GRANT EXECUTE ON FUNCTION start_rematch TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_scores TO anon, authenticated;
GRANT EXECUTE ON FUNCTION start_game_if_ready TO anon, authenticated;
