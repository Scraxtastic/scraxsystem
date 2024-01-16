import { Server, Socket } from "net";
import "dotenv/config";
import { findKey } from "./fileManager";
import { unpackageAndDecryptData } from "./gcm";

const createServer = () => {
  const server = new Server();
  server.on("connection", handleNewConnection);
  server.on("error", (err) => console.error("Server:", err));
  server.on("close", () => console.log("Server:", "Server closed."));
  server.listen(process.env.PORT || 8989);
  console.log("Server:", "Server listening on port " + (process.env.PORT || 8989));
};

const handleNewConnection = (socket: Socket) => {
  console.log("Server:", `Socket ${socket.remoteAddress} ${socket.remotePort} connected.`);
  let messageCount = 0;
  let key: Buffer = null;
  let name: string = "NOT SET";
  socket.on("close", () => console.log("Server:", `${name} disconnected. (IP: ${socket.remoteAddress})`));
  socket.on("data", (encryptedData: Buffer) => {
    if (messageCount === 0) {
      key = findKey(encryptedData);
      console.log("FoundKey", key, key.toString("base64"));
      if (key === null || key === undefined) {
        console.log("Server:", "No key found");
        socket.end();
        return;
      }
      const data = unpackageAndDecryptData(encryptedData, key);
      console.log("Data", data.toString(), encryptedData.toString("base64"));
      name = data.toString();
      messageCount++;
      return;
    }
    handleData(socket, encryptedData, key);
  });
};

const handleData = (socket: Socket, encryptedData: Buffer, key: Buffer) => {
  const data = unpackageAndDecryptData(encryptedData, key);
  if (data === null) {
    console.log("Server:", "Error decrypting data");
    return;
  }
  console.log("Server:", "Received data:", data.toString());
  socket.write(encryptedData);
};

createServer();
