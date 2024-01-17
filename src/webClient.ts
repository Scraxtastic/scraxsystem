import { WebSocket } from "ws";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "./gcm";
import fs from "fs";
console.log("WClient:", "started client");

const sendEncryptedMessage = (socket: WebSocket, data: Buffer, key: Buffer) => {
  socket.send(encryptAndPackageData(data, key));
};

const sendMessages = (socket: WebSocket, key: Buffer, name: string) => {
  socket.on("open", () => {
    console.log("WClient:", "Connected to server.");
    sendEncryptedMessage(socket, Buffer.from(name), key);
  });

  socket.on("message", (data: Buffer) => {
    const decrypted = unpackageAndDecryptData(data, key);
    console.log("WClient:", "Received data:", decrypted.toString());
    fs.writeFileSync("./output.json", decrypted.toString());
  });

  socket.on("close", () => {
    console.log("WClient:", "Socket closed.");
  });
};

const createConnection = (ip: string, name: string) => {
  const serverPort = +process.env.PORT || 8990;
  const key = getKey(name);
  const socket = new WebSocket(ip);
  //   console.log("key", key);
  // const key = randomBytes(32);
  sendMessages(socket, key, name);
};

const startClient = (name: string) => {
  const serverip = process.env.wsAddress || "localhost";
  console.log("WClient:", "connecting to ", serverip);
  createConnection(serverip, name);
};

setTimeout(() => {
  let name = "";
  process.argv.forEach(function (val, index, array) {
    if (val.includes("name=")) {
      name = val.split("=")[1];
    }
  });
  startClient(name);
}, 1000);
