const cors = require("cors");
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT || 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "*";
const ROOM_TTL_MS = 60 * 60 * 1000;

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  CLIENT_ORIGIN === "*"
    ? "*"
    : CLIENT_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "64kb" }));

const io = new Server(server, {
  cors: corsOptions,
  maxHttpBufferSize: 1e6
});

const rooms = new Map();

function makeRoomId() {
  return crypto.randomBytes(6).toString("base64url");
}

function sanitizeFileMeta(meta = {}) {
  return {
    name: String(meta.name || "shared-file").slice(0, 180),
    size: Number(meta.size || 0),
    type: String(meta.type || "application/octet-stream").slice(0, 120)
  };
}

function isParticipant(room, socketId) {
  return room && (room.ownerId === socketId || room.receiverId === socketId);
}

function isKnownPeer(room, socketId) {
  return room && (room.ownerId === socketId || room.receiverId === socketId);
}

function clearSocketRoom(socket) {
  const { roomId, role } = socket.data;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) {
    socket.leave(roomId);
    delete socket.data.roomId;
    delete socket.data.role;
    return;
  }

  if (role === "sender" && room.ownerId === socket.id) {
    socket.to(roomId).emit("peer:left", {
      peerId: socket.id,
      role: "sender",
      reason: "sender-disconnected"
    });
    rooms.delete(roomId);
  }

  if (role === "receiver" && room.receiverId === socket.id) {
    room.receiverId = null;
    room.updatedAt = Date.now();
    socket.to(room.ownerId).emit("peer:left", {
      peerId: socket.id,
      role: "receiver",
      reason: "receiver-disconnected"
    });
  }

  socket.leave(roomId);
  delete socket.data.roomId;
  delete socket.data.role;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    uptime: process.uptime()
  });
});

io.on("connection", (socket) => {
  socket.on("room:create", (fileMeta, callback = () => {}) => {
    clearSocketRoom(socket);

    const roomId = makeRoomId();
    const room = {
      id: roomId,
      ownerId: socket.id,
      receiverId: null,
      fileMeta: sanitizeFileMeta(fileMeta),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = "sender";

    callback({
      ok: true,
      roomId,
      fileMeta: room.fileMeta
    });
  });

  socket.on("room:join", ({ roomId } = {}, callback = () => {}) => {
    const room = rooms.get(String(roomId || ""));

    if (!room) {
      callback({ ok: false, error: "Room not found. Ask the sender for a fresh link." });
      return;
    }

    if (room.ownerId === socket.id) {
      callback({ ok: false, error: "Open this link in a second browser tab or device." });
      return;
    }

    if (room.receiverId && io.sockets.sockets.has(room.receiverId)) {
      callback({ ok: false, error: "This MVP room already has one active receiver." });
      return;
    }

    clearSocketRoom(socket);
    room.receiverId = socket.id;
    room.updatedAt = Date.now();
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.role = "receiver";

    callback({
      ok: true,
      roomId: room.id,
      senderId: room.ownerId,
      fileMeta: room.fileMeta
    });

    io.to(room.ownerId).emit("peer:joined", {
      peerId: socket.id,
      roomId: room.id
    });
  });

  socket.on("signal", ({ roomId, to, type, payload } = {}) => {
    const room = rooms.get(String(roomId || ""));
    if (!isParticipant(room, socket.id) || !isKnownPeer(room, to)) return;

    io.to(to).emit("signal", {
      from: socket.id,
      roomId: room.id,
      type,
      payload
    });
  });

  socket.on("disconnecting", () => {
    clearSocketRoom(socket);
  });
});

const cleanupTimer = setInterval(() => {
  const now = Date.now();

  for (const [roomId, room] of rooms.entries()) {
    if (now - room.createdAt <= ROOM_TTL_MS) continue;

    io.to(roomId).emit("room:expired", {
      roomId,
      reason: "Room expired after one hour."
    });
    rooms.delete(roomId);
  }
}, 60 * 1000);

cleanupTimer.unref?.();

const clientDist = path.resolve(__dirname, "..", "client", "dist");
const clientIndex = path.join(clientDist, "index.html");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && fs.existsSync(clientIndex)) {
      res.sendFile(clientIndex);
      return;
    }
    next();
  });
}

server.listen(PORT, () => {
  console.log(`Signaling server listening on http://localhost:${PORT}`);
});
