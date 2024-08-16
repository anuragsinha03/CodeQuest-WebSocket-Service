const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const bodyParser = require("body-parser");
const { PORT } = require("./config/serverConfig");

const app = express();
app.use(bodyParser.json());
const httpServer = createServer(app);

const redisCache = new Redis();

const io = new Server(httpServer, {
	cors: {
		origin: process.env.CORS_ORIGIN,
		methods: ["GET", "POST"],
	},
});

io.on("connection", socket => {
	console.log("A user connected " + socket.id);
	socket.on("setUserId", userId => {
		console.log("Setting user id to connection id", userId, socket.id);
		redisCache.set(userId, socket.id);
	});

	socket.on("getConnectionId", async userId => {
		const connId = await redisCache.get(userId);
		console.log("Getting connection id for user id", userId, connId);
		socket.emit("connectionId", connId);
		const everything = await redisCache.keys("*");

		console.log(everything);
	});
});

app.post("/sendPayload", async (req, res) => {
	console.log(req.body);
	const { userId, payload } = req.body;
	if (!userId || !payload) {
		return res.status(400).send("Invalid request");
	}
	const socketId = await redisCache.get(userId);

	if (socketId) {
		io.to(socketId).emit("submissionPayloadResponse", payload);
		return res.send("Payload sent successfully");
	} else {
		return res.status(404).send("User not connected");
	}
});

httpServer.listen(PORT, () => {
	console.log("Server is running on port:", PORT);
});
