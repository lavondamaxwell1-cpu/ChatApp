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
   🌐 CORS SETUP (IMPORTANT)
========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL, // ← your Vercel URL comes from here
].filter(Boolean);

/* ===== EXPRESS CORS ===== */
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
   🟢 ONLINE USERS
========================= */
let onlineUsers = [];

/* =========================
   🔌 SOCKET.IO CORS (THIS FIXES YOUR ERROR)
========================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

/* =========================
   🔌 SOCKET EVENTS
========================= */
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

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

  socket.on("joinRoom", async (room) => {
    socket.join(room);

    try {
      const messages = await Message.find({ room })
        .sort({ createdAt: 1 })
        .limit(50);

      socket.emit("roomMessages", messages);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const message = await Message.create({
        user: data.userId,
        username: data.username,
        room: data.room,
        text: data.text,
      });

      io.to(data.room).emit("receiveMessage", message);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("userTyping", username);
  });

  socket.on("stopTyping", ({ room }) => {
    socket.to(room).emit("userStopTyping");
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);

    io.emit("onlineUsers", onlineUsers);
    console.log("Socket disconnected:", socket.id);
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
  .catch((err) => console.error(err));

/* =========================
   🚀 START SERVER
========================= */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
