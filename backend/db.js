// db.js — PostgreSQL with automatic JSON fallback
// If DATABASE_URL is not set, uses local JSON files (great for development)

import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const USE_POSTGRES = !!process.env.DATABASE_URL;

let pool = null;

if (USE_POSTGRES) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  console.log("✅ Using PostgreSQL");
} else {
  console.log("📁 No DATABASE_URL found — using local JSON storage");
}

// ── JSON fallback helpers ──────────────────────────────────────────────────
const DATA_DIR = path.resolve("./data");
if (!USE_POSTGRES && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  try { return JSON.parse(fs.readFileSync(fp, "utf-8")); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ── Schema init (PostgreSQL only) ─────────────────────────────────────────
export async function initDB() {
  if (!USE_POSTGRES) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'Untitled',
      content JSONB DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      is_public BOOLEAN DEFAULT false,
      share_token TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS note_collaborators (
      note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'editor',
      PRIMARY KEY (note_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS executions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
      code TEXT,
      language INTEGER,
      output TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log("✅ Database schema ready");
}

// ── User operations ────────────────────────────────────────────────────────
export const Users = {
  async create({ id, name, email, password }) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        "INSERT INTO users (id, name, email, password) VALUES ($1,$2,$3,$4) RETURNING *",
        [id, name, email, password]
      );
      return r.rows[0];
    }
    const users = readJSON("users.json");
    const user = { id, name, email, password, created_at: new Date().toISOString() };
    users.push(user);
    writeJSON("users.json", users);
    return user;
  },

  async findByEmail(email) {
    if (USE_POSTGRES) {
      const r = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
      return r.rows[0] || null;
    }
    return readJSON("users.json").find((u) => u.email === email) || null;
  },

  async findById(id) {
    if (USE_POSTGRES) {
      const r = await pool.query("SELECT id,name,email,created_at FROM users WHERE id=$1", [id]);
      return r.rows[0] || null;
    }
    const u = readJSON("users.json").find((u) => u.id === id);
    if (u) { const { password, ...rest } = u; return rest; }
    return null;
  },
};

// ── Note operations ────────────────────────────────────────────────────────
export const Notes = {
  async create({ id, owner_id, title, content, tags, share_token }) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        `INSERT INTO notes (id, owner_id, title, content, tags, share_token)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, owner_id, title, JSON.stringify(content), tags, share_token]
      );
      return r.rows[0];
    }
    const notes = readJSON("notes.json");
    const note = { id, owner_id, title, content, tags: tags || [], share_token, is_public: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    notes.push(note);
    writeJSON("notes.json", notes);
    return note;
  },

  async findByOwner(owner_id) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        `SELECT n.*, u.name as owner_name FROM notes n
         JOIN users u ON n.owner_id = u.id
         WHERE n.owner_id=$1 OR n.id IN (
           SELECT note_id FROM note_collaborators WHERE user_id=$1
         ) ORDER BY n.updated_at DESC`,
        [owner_id]
      );
      return r.rows;
    }
    return readJSON("notes.json")
      .filter((n) => n.owner_id === owner_id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  async findById(id) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        `SELECT n.*, u.name as owner_name FROM notes n
         JOIN users u ON n.owner_id = u.id WHERE n.id=$1`,
        [id]
      );
      return r.rows[0] || null;
    }
    return readJSON("notes.json").find((n) => n.id === id) || null;
  },

  async findByShareToken(token) {
    if (USE_POSTGRES) {
      const r = await pool.query("SELECT * FROM notes WHERE share_token=$1", [token]);
      return r.rows[0] || null;
    }
    return readJSON("notes.json").find((n) => n.share_token === token) || null;
  },

  async update(id, { title, content, tags, is_public }) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        `UPDATE notes SET title=$1, content=$2, tags=$3, is_public=$4, updated_at=NOW()
         WHERE id=$5 RETURNING *`,
        [title, JSON.stringify(content), tags, is_public, id]
      );
      return r.rows[0];
    }
    const notes = readJSON("notes.json");
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    notes[idx] = { ...notes[idx], title, content, tags, is_public, updated_at: new Date().toISOString() };
    writeJSON("notes.json", notes);
    return notes[idx];
  },

  async delete(id) {
    if (USE_POSTGRES) {
      await pool.query("DELETE FROM notes WHERE id=$1", [id]);
      return;
    }
    let notes = readJSON("notes.json");
    notes = notes.filter((n) => n.id !== id);
    writeJSON("notes.json", notes);
  },

  async addCollaborator(note_id, user_id, role = "editor") {
    if (USE_POSTGRES) {
      await pool.query(
        `INSERT INTO note_collaborators (note_id, user_id, role)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [note_id, user_id, role]
      );
      return;
    }
    const collabs = readJSON("collaborators.json");
    if (!collabs.find((c) => c.note_id === note_id && c.user_id === user_id)) {
      collabs.push({ note_id, user_id, role });
      writeJSON("collaborators.json", collabs);
    }
  },

  async getCollaborators(note_id) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        `SELECT u.id, u.name, u.email, nc.role FROM note_collaborators nc
         JOIN users u ON nc.user_id = u.id WHERE nc.note_id=$1`,
        [note_id]
      );
      return r.rows;
    }
    const collabs = readJSON("collaborators.json").filter((c) => c.note_id === note_id);
    const users = readJSON("users.json");
    return collabs.map((c) => {
      const u = users.find((u) => u.id === c.user_id);
      return u ? { id: u.id, name: u.name, email: u.email, role: c.role } : null;
    }).filter(Boolean);
  },
};

// ── Execution history ──────────────────────────────────────────────────────
export const Executions = {
  async create({ id, user_id, note_id, code, language, output }) {
    if (USE_POSTGRES) {
      await pool.query(
        "INSERT INTO executions (id,user_id,note_id,code,language,output) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, user_id, note_id, code, language, output]
      );
      return;
    }
    const execs = readJSON("executions.json");
    execs.unshift({ id, user_id, note_id, code, language, output, created_at: new Date().toISOString() });
    writeJSON("executions.json", execs.slice(0, 200));
  },

  async findByUser(user_id) {
    if (USE_POSTGRES) {
      const r = await pool.query(
        "SELECT * FROM executions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
        [user_id]
      );
      return r.rows;
    }
    return readJSON("executions.json").filter((e) => e.user_id === user_id);
  },
};

export default pool;