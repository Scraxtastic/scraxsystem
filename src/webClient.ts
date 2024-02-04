import { WebSocket } from "ws";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "./cbc";
import fs from "fs";
import { wrapperKeys } from "./wrapperKeys";
console.log("WClient:", "started client");

const sendEncryptedMessage = (socket: WebSocket, data: Buffer, key: Buffer) => {
  let encryptedData = encryptAndPackageData(data, key);
  for (let i = 0; i < wrapperKeys.length; i++) {
    encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
  }
  socket.send(encryptedData);
};

const decryptMessage = (hardlyEncryptedData: Buffer, key: Buffer) => {
  let unwrappedData = hardlyEncryptedData;
  for (let i = wrapperKeys.length - 1; i >= 0; i--) {
    unwrappedData = unpackageAndDecryptData(unwrappedData, Buffer.from(wrapperKeys[i], "base64"));
  }
  const data = unpackageAndDecryptData(unwrappedData, key);
  return data;
};

const sendMessages = (socket: WebSocket, key: Buffer, name: string) => {
  socket.on("open", () => {
    console.log("WClient:", "Connected to server.");
    sendEncryptedMessage(socket, Buffer.from(name), key);
  });

  socket.on("error", (err) => {
    console.log("WClient:", "Socket error:", err.name, err.message);
  });

  socket.on("unexpected-response", (req, res) => {
    console.log("WClient:", "Unexpected response:", res);
  });

  socket.on("message", (data: Buffer) => {
    const decrypted = decryptMessage(data, key);
    console.log("WClient:", "Received data:", decrypted.toString());
    fs.writeFileSync("./output.json", decrypted.toString());
  });

  socket.on("close", () => {
    console.log("WClient:", "Socket closed.");
  });
};

const createConnection = (ip: string, name: string) => {
  const key = getKey(name);
  const socket = new WebSocket(ip);
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
  if (name == "") {
    name = process.env.name;
  }
  if (name == "") {
    console.log("WClient:", "name not set");
    process.exit(1);
  }
  console.log("WClient:", "name:", name);
  startClient(name);
}, 1000);
