import "dotenv/config";
import { createSocketServer } from "./servers/socketServer";
import { createWebsocketServer } from "./servers/websocketServer";

process.on("uncaughtException", (err) => {
  console.log("Server", `Uncaught Exception: ${err}`, err);
});

const createServer = () => {
  createSocketServer();
  createWebsocketServer();
};

createServer();
