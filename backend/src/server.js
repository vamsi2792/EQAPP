require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const { attachSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

// Connect MongoDB
connectDB();

// Express and the chat socket share one HTTP server (and so one port / one ngrok tunnel).
const server = http.createServer(app);
attachSocket(server);

server.listen(PORT, "0.0.0.0", () => {

  console.log(`Server running on port ${PORT}`);
});
