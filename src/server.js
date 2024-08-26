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

// Handle socket connections
io.on("connection", socket => {
	console.log(`User connected with socket ID: ${socket.id}`);

	// Set user ID to socket ID mapping in Redis
	socket.on("setUserId", async userId => {
		try {
			await redisCache.set(userId, socket.id);
			console.log(`UserID: ${userId} mapped to SocketID: ${socket.id}`);
		} catch (err) {
			console.error("Error setting userId in Redis:", err);
		}
	});

	// Get connection ID (socket ID) based on user ID
	socket.on("getConnectionId", async userId => {
		try {
			const connId = await redisCache.get(userId);
			console.log(`Retrieved SocketID: ${connId} for UserID: ${userId}`);
			socket.emit("connectionId", connId);

			// Optional: Log all keys in Redis (for debugging)
			const allKeys = await redisCache.keys("*");
			console.log("All Redis keys:", allKeys);
		} catch (err) {
			console.error("Error getting connectionId from Redis:", err);
		}
	});
});

// Endpoint to handle payload submission
app.post("/sendPayload", async (req, res) => {
	try {
		const { userId, payload } = req.body;
		if (!userId || !payload) {
			return res
				.status(400)
				.send("Invalid request: Missing userId or payload");
		}

		const socketId = await redisCache.get(userId);
		console.log(`Retrieved SocketID: ${socketId} for UserID: ${userId}`);

		if (socketId) {
			io.to(socketId).emit("submissionPayloadResponse", payload);
			return res.send("Payload sent successfully");
		} else {
			return res.status(404).send("User not connected");
		}
	} catch (err) {
		console.error("Error in /sendPayload endpoint:", err);
		return res.status(500).send("Internal Server Error");
	}
});

// Start the server
httpServer.listen(PORT, () => {
	console.log(`Server is running on port: ${PORT}`);
});
