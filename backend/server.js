import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIO } from "socket.io";
import { Hocuspocus } from "@hocuspocus/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { initDB, Users, Notes, Executions } from "./db.js";
import { requireAuth, optionalAuth, signToken } from "./middleware/auth.js";

const app = express();
const httpServer = createServer(app);

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ── Socket.io (presence / live cursors) ───────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});

// Track who is in which note room
const noteRooms = {}; // noteId → { socketId → { userId, name, color } }

const COLORS = [
  "#7c6cfa","#f97316","#22c55e","#06b6d4",
  "#f59e0b","#ec4899","#8b5cf6","#14b8a6",
];

io.on("connection", (socket) => {
  let currentNoteId = null;
  let currentUser = null;

  socket.on("join-note", ({ noteId, user }) => {
    if (currentNoteId) {
      socket.leave(currentNoteId);
      if (noteRooms[currentNoteId]) {
        delete noteRooms[currentNoteId][socket.id];
        io.to(currentNoteId).emit("presence-update", Object.values(noteRooms[currentNoteId]));
      }
    }

    currentNoteId = noteId;
    currentUser = user;

    socket.join(noteId);
    if (!noteRooms[noteId]) noteRooms[noteId] = {};

    noteRooms[noteId][socket.id] = {
      socketId: socket.id,
      userId: user.id,
      name: user.name,
      color: COLORS[Object.keys(noteRooms[noteId]).length % COLORS.length],
    };

    // Tell everyone in the room about updated presence
    io.to(noteId).emit("presence-update", Object.values(noteRooms[noteId]));
  });

  socket.on("cursor-move", (data) => {
    if (currentNoteId) {
      socket.to(currentNoteId).emit("cursor-move", {
        ...data,
        socketId: socket.id,
        name: currentUser?.name,
        color: noteRooms[currentNoteId]?.[socket.id]?.color,
      });
    }
  });

  socket.on("disconnect", () => {
    if (currentNoteId && noteRooms[currentNoteId]) {
      delete noteRooms[currentNoteId][socket.id];
      io.to(currentNoteId).emit("presence-update", Object.values(noteRooms[currentNoteId]));
    }
  });
});

// ── Hocuspocus (Tiptap real-time collab) ──────────────────────────────────
const hocuspocus = new Hocuspocus({
  port: 1234,
  async onAuthenticate({ token, documentName }) {
    // documentName = noteId
    // For now allow all — add JWT check here for production
    return {};
  },
  async onChange({ documentName, document }) {
    // Persist document changes to DB
    try {
      const state = document.getMap("content").toJSON();
      await Notes.update(documentName, {
        title: state.title || "Untitled",
        content: state,
        tags: state.tags || [],
        is_public: false,
      });
    } catch {}
  },
});

hocuspocus.listen();
console.log("✅ Hocuspocus WebSocket running on ws://localhost:1234");

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", message: "CodeNest API 🚀" }));

// ── AUTH ROUTES ────────────────────────────────────────────────────────────

// POST /auth/signup
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be 6+ characters" });

    const existing = await Users.findByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await Users.create({ id: uuid(), name, email, password: hashed });

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "All fields required" });

    const user = await Users.findByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /auth/me
app.get("/auth/me", requireAuth, async (req, res) => {
  const user = await Users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ── NOTES ROUTES ───────────────────────────────────────────────────────────

// GET /notes — all notes for current user
app.get("/notes", requireAuth, async (req, res) => {
  try {
    const notes = await Notes.findByOwner(req.user.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /notes — create note
app.post("/notes", requireAuth, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const id = uuid();
    const shareToken = uuid();
    const note = await Notes.create({
      id,
      owner_id: req.user.id,
      title: title || "Untitled",
      content: content || {},
      tags: tags || [],
      share_token: shareToken,
    });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

// GET /notes/:id — get single note (auth or share token)
app.get("/notes/:id", optionalAuth, async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });

    // Must be owner, collaborator, or note is public
    if (!note.is_public && note.owner_id !== req.user?.id) {
      const collabs = await Notes.getCollaborators(req.params.id);
      const isCollab = collabs.some((c) => c.id === req.user?.id);
      if (!isCollab) return res.status(403).json({ error: "Access denied" });
    }

    const collaborators = await Notes.getCollaborators(req.params.id);
    res.json({ ...note, collaborators });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// PUT /notes/:id — update note
app.put("/notes/:id", requireAuth, async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.owner_id !== req.user.id) {
      const collabs = await Notes.getCollaborators(req.params.id);
      const isEditor = collabs.some((c) => c.id === req.user.id && c.role === "editor");
      if (!isEditor) return res.status(403).json({ error: "Access denied" });
    }

    const { title, content, tags, is_public } = req.body;
    const updated = await Notes.update(req.params.id, {
      title: title ?? note.title,
      content: content ?? note.content,
      tags: tags ?? note.tags,
      is_public: is_public ?? note.is_public,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update note" });
  }
});

// DELETE /notes/:id
app.delete("/notes/:id", requireAuth, async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.owner_id !== req.user.id) return res.status(403).json({ error: "Only owner can delete" });
    await Notes.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// POST /notes/:id/share — toggle sharing + add collaborator by email
app.post("/notes/:id/share", requireAuth, async (req, res) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.owner_id !== req.user.id) return res.status(403).json({ error: "Only owner can share" });

    const { email, is_public } = req.body;

    // Toggle public link
    if (typeof is_public === "boolean") {
      await Notes.update(req.params.id, {
        title: note.title, content: note.content,
        tags: note.tags, is_public,
      });
    }

    // Add collaborator by email
    if (email) {
      const user = await Users.findByEmail(email);
      if (!user) return res.status(404).json({ error: "No user with that email" });
      if (user.id === req.user.id) return res.status(400).json({ error: "You are already the owner" });
      await Notes.addCollaborator(req.params.id, user.id);
    }

    const updated = await Notes.findById(req.params.id);
    const collaborators = await Notes.getCollaborators(req.params.id);
    res.json({
      ...updated,
      collaborators,
      shareUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/shared/${updated.share_token}`,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to share note" });
  }
});

// GET /shared/:token — view a publicly shared note (no auth needed)
app.get("/shared/:token", async (req, res) => {
  try {
    const note = await Notes.findByShareToken(req.params.token);
    if (!note || !note.is_public) return res.status(404).json({ error: "Note not found or not public" });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// ── CODE EXECUTION ─────────────────────────────────────────────────────────
app.post("/execute", requireAuth, async (req, res) => {
  try {
    const { source_code, language_id, note_id } = req.body;

    const response = await fetch(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code,
          language_id,
          cpu_time_limit: 2,
          memory_limit: 128000,
        }),
      }
    );

    const data = await response.json();
    const output = data.stdout || data.stderr || data.compile_output || "No output";

    await Executions.create({
      id: uuid(),
      user_id: req.user.id,
      note_id: note_id || null,
      code: source_code,
      language: language_id,
      output,
    });

    res.json({ output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /history — user's execution history
app.get("/history", requireAuth, async (req, res) => {
  try {
    const history = await Executions.findByUser(req.user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ── SEARCH ─────────────────────────────────────────────────────────────────
app.get("/search", requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const notes = await Notes.findByOwner(req.user.id);
    const query = q.toLowerCase();
    const results = notes.filter((n) => {
      const titleMatch = (n.title || "").toLowerCase().includes(query);
      const contentMatch = JSON.stringify(n.content || {}).toLowerCase().includes(query);
      const tagMatch = (n.tags || []).some((t) => t.toLowerCase().includes(query));
      return titleMatch || contentMatch || tagMatch;
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});
// ── ADD THIS ROUTE TO backend/server.js ──────────────────────────────────
// Place it before app.listen() at the bottom

app.post("/ai/assist", requireAuth, async (req, res) => {
  try {
    const { text, action } = req.body;
    if (!text || !action) return res.status(400).json({ error: "text and action required" });

    const GROQ_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_KEY) return res.status(503).json({ error: "AI not configured — add GROQ_API_KEY to backend .env" });

    const prompts = {
      improve:   `Rewrite the following text to be clearer, more concise and professional. Fix weak word choices and remove filler words. Return only the improved text, nothing else:\n\n${text}`,
      fix:       `Fix all grammar, spelling, punctuation and capitalization errors in the following text. Return only the corrected text, nothing else:\n\n${text}`,
      summarize: `Summarize the following text in 1-2 concise sentences that capture the key points. Return only the summary, nothing else:\n\n${text}`,
      expand:    `Expand the following text with more detail, context and examples while keeping the same tone. Return only the expanded text, nothing else:\n\n${text}`,
      bullets:   `Convert the following text into clear, concise bullet points. Each bullet should start with •. Return only the bullet points, nothing else:\n\n${text}`,
      heading:   `Generate a short, clear title or heading (3-6 words) for the following text. Return only the heading, nothing else:\n\n${text}`,
      code:      `Explain what the following code does in plain English. Be concise and clear. Return only the explanation, nothing else:\n\n${text}`,
    };

    const prompt = prompts[action];
    if (!prompt) return res.status(400).json({ error: "Invalid action" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
       
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API error");

    const result = data.choices?.[0]?.message?.content?.trim();
    if (!result) throw new Error("No response from AI");

    res.json({ result });
  } catch (err) {
    console.error("AI assist error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

initDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`✅ CodeNest API running on http://localhost:${PORT}`);
  });
});