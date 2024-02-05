import { Socket } from "net";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "./gcm";
import path from "path";
import fs from "fs";
console.log("Client:", "started client");

const sendEncryptedMessage = (socket: Socket, data: Buffer, key: Buffer) => {
  socket.write(encryptAndPackageData(data, key));
};

const getFileData = (): string => {
  const filesPath = path.join(__dirname, "..", "files");
  if (!fs.existsSync(filesPath)) {
    fs.mkdirSync(filesPath);
  }
  const files = fs.readdirSync(filesPath);
  let filesData: any = {};
  for (const file of files) {
    const filePath = path.join(filesPath, file);
    const fileData = fs.readFileSync(filePath, "utf-8");
    filesData[file] = fileData;
  }
  return JSON.stringify(filesData);
};

const sendMessages = (socket: Socket, key: Buffer, name: string) => {
  let interval: NodeJS.Timeout = null;
  socket.on("connect", () => {
    console.log("Client:", "Connected to server.");
    sendEncryptedMessage(socket, Buffer.from(name), key);

    interval = setInterval(() => {
      const fileText = Buffer.from(getFileData(), "utf-8").toString("base64");
      console.log("Client:", "->", "Sending data:", fileText);
      sendEncryptedMessage(socket, Buffer.from(fileText, "utf-8"), key);
    }, 5500);
  });

  socket.on("data", (data: Buffer) => {
    const decrypted = unpackageAndDecryptData(data, key);
    // if (decrypted === null) {
    //   return;
    // }
    console.log("Client:", "<-", "Received data:", decrypted.toString());
  });

  socket.on("close", () => {
    console.log("Client:", "Socket closed.");
    clearInterval(interval);
  });
};

const createConnection = (ip: string, name: string) => {
  const socket = new Socket();
  const key = getKey(name);
  console.log("Client:", `key ${name} retrieved`);
  // const key = randomBytes(32);
  const serverPort = +process.env.PORT || 8989;
  socket.connect(serverPort, ip);
  sendMessages(socket, key, name);
};

const startClient = (name: string) => {
  const serverip = process.env.serverip || "localhost";
  console.log("Client:", "connecting to ", serverip);
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
  startClient(name);
}, 1000);
