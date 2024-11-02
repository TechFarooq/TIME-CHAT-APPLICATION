const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = "your_jwt_secret_key";


mongoose.connect("mongodb://localhost:27017/chatApp", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
});

const User = mongoose.model("User", userSchema);


app.use(express.json());


app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword });

  try {
    await user.save();
    res.status(201).send("User registered successfully");
  } catch (error) {
    res.status(400).send("Error registering user");
  }
});


app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.status(200).json({ token });
  } else {
    res.status(400).send("Invalid credentials");
  }
});


io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("chatMessage", ({ room, message }) => {
    io.to(room).emit("message", message);
  });

  socket.on("privateMessage", ({ toUser, message }) => {
    socket.to(toUser).emit("privateMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
