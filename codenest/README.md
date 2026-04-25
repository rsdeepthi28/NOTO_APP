# ⟨ CodeNest /⟩

A collaborative notes app with inline code execution. Write notes, embed runnable code blocks anywhere, and edit with teammates in real time.

## ✨ Features

- 📝 **Rich text notes** — bold, italic, headings, lists, highlights
- ⟨/⟩ **Inline code execution** — embed runnable Python, JS, C++, Java, C blocks right in your notes
- 🤝 **Real-time collaboration** — multiple users edit the same note live (powered by Yjs + Hocuspocus)
- 🟢 **Live cursors** — see exactly where collaborators are typing
- 🔐 **Auth** — JWT signup/login with bcrypt password hashing
- 🔗 **Share notes** — generate a public link or invite by email
- 🏷️ **Tags** — organize notes with custom tags
- 🔍 **Search** — full-text search across all your notes
- 💾 **PostgreSQL or JSON** — works out of the box with local JSON files; plug in Postgres for production

## 🚀 Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # edit if needed
node server.js
```

You'll see:
```
✅ Hocuspocus WebSocket running on ws://localhost:1234
✅ CodeNest API running on http://localhost:5000
```

### 2. Frontend (new terminal)

```bash
cd frontend
npm install
cp .env.example .env       # edit if needed
npm run dev
```

Open **http://localhost:5173** — sign up and start taking notes!

## 🗄️ Using PostgreSQL (optional)

```bash
# Create a database
createdb codenest

# Add to backend/.env
DATABASE_URL=postgresql://localhost/codenest
```

The app auto-creates all tables on startup. Without `DATABASE_URL`, it uses local JSON files in `backend/data/`.

## 🌐 Deploying

### Backend → Railway / Render
1. Push to GitHub
2. Create a new service on [Railway](https://railway.app) or [Render](https://render.com)
3. Set env vars: `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`
4. Start command: `node server.js`

### Frontend → Vercel
1. Import your repo on [Vercel](https://vercel.com)
2. Set `VITE_API_URL` and `VITE_WS_URL` to your deployed backend URL
3. Deploy — done!

## 🗂️ Project Structure

```
backend/
├── server.js          # Express + Socket.io + Hocuspocus
├── db.js              # PostgreSQL + JSON fallback
├── middleware/
│   └── auth.js        # JWT middleware
└── data/              # Auto-created JSON storage (dev)

frontend/src/
├── context/
│   └── AuthContext.jsx         # Global auth state
├── hooks/
│   └── useApi.js               # Authenticated fetch helper
├── pages/
│   ├── Dashboard.jsx           # Notes grid + search + tags
│   ├── NotePage.jsx            # Editor + collab + share
│   ├── ViewNote.jsx            # Read-only view
│   ├── SharedNote.jsx          # Public share link view
│   ├── Login.jsx
│   └── Signup.jsx
├── components/
│   └── Layout.jsx              # Sidebar layout
└── extensions/
    └── CodeExecutionComponent.jsx  # Tiptap inline code block
```

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Editor | Tiptap (ProseMirror) |
| Real-time | Yjs + Hocuspocus + Socket.io |
| Backend | Node.js + Express |
| Auth | JWT + bcrypt |
| Code execution | Judge0 API |
| Database | PostgreSQL (or local JSON) |
| Deploy | Vercel + Railway |