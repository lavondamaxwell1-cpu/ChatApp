require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

/* =========================
   🌐 CORS SETUP
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());

/* =========================
   🧠 ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

/* =========================
   🟢 ONLINE USERS TRACKING
========================= */
let onlineUsers = [];

/* =========================
   🔌 SOCKET.IO SETUP
========================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

/* =========================
   🔌 SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ✅ ADD ONLINE USER
  socket.on("addOnlineUser", (userId) => {
    const exists = onlineUsers.find((u) => u.userId === userId);

    if (!exists) {
      onlineUsers.push({
        userId,
        socketId: socket.id,
      });
    }

    io.emit("onlineUsers", onlineUsers);
  });

  // ✅ JOIN ROOM (DM or general)
  socket.on("joinRoom", async (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);

    try {
      const messages = await Message.find({ room })
        .sort({ createdAt: 1 })
        .limit(50);

      socket.emit("roomMessages", messages);
    } catch (err) {
      console.error("Load messages error:", err);
    }
  });

  // ✅ SEND MESSAGE
  socket.on("sendMessage", async (messageData) => {
    try {
      const message = await Message.create({
        user: messageData.userId,
        username: messageData.username,
        room: messageData.room,
        text: messageData.text,
      });

      io.to(message.room).emit("receiveMessage", message);
    } catch (err) {
      console.error("Send message error:", err);
    }
  });

  // ✍️ TYPING
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("userTyping", username);
  });

  socket.on("stopTyping", ({ room }) => {
    socket.to(room).emit("userStopTyping");
  });

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);

    io.emit("onlineUsers", onlineUsers);
  });
});

/* =========================
   🧪 TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("Chat API running...");
});

/* =========================
   🗄️ DATABASE
========================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* =========================
   🚀 START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
