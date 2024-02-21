import "dotenv/config";
import { createWebsocketServer } from "./servers/websocketServer";

process.on("uncaughtException", (err) => {
  console.log("Server", `Uncaught Exception: ${err}`, err);
});

const createServer = () => {
  // Was the first try, will not be used anymore because of the new protocol and the availability of the websocket server including TLS
  // createSocketServer();
  createWebsocketServer();
};

createServer();
