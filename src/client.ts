import { Socket } from "net";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData } from "./gcm";
import { randomBytes } from "crypto";
console.log("Client:", "started client");

const startClient = () => {
  const serverip = process.env.serverip || "localhost";
  console.log("Client:", "connecting to ", serverip);
  createConnection(serverip, "pizero");
};

const sendEncryptedMessage = (socket: Socket, data: Buffer, key: Buffer) => {
  socket.write(encryptAndPackageData(data, key));
};

const sendMessages = (socket: Socket, key: Buffer) => {
  socket.on("connect", () => {
    console.log("Client:", "Connected to server.", key.toString("base64"));
    console.log("Client:", "pizero");
    sendEncryptedMessage(socket, Buffer.from("pizero"), key);
  });
  const interval = setInterval(() => {
    const message = "Still alive!";
    console.log("Client:", message);
    sendEncryptedMessage(socket, Buffer.from(message), key);
  }, 5500);

  socket.on("close", () => {
    console.log("Client:", "Socket closed.");
    clearInterval(interval);
  });
};

const createConnection = (ip: string, name: string) => {
  const socket = new Socket();
  const key = getKey(name);
  // const key = randomBytes(32);
  const serverPort = +process.env.PORT || 8989;
  socket.connect(serverPort, ip);
  sendMessages(socket, key);
};

setTimeout(() => {
  startClient();
}, 1000);
