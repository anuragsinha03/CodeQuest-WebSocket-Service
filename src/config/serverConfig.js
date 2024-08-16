const dotenv = require("dotenv").config();

module.exports = {
	PORT: process.env.PORT,
	CORS_ORIGIN: process.env.CORS_ORIGIN,
};
