import { Socket } from "net";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "./gcm";
console.log("Client:", "started client");

const sendEncryptedMessage = (socket: Socket, data: Buffer, key: Buffer) => {
  socket.write(encryptAndPackageData(data, key));
};

const sendMessages = (socket: Socket, key: Buffer, name: string) => {
  let interval: NodeJS.Timeout = null;
  socket.on("connect", () => {
    console.log("Client:", "Connected to server.");
    sendEncryptedMessage(socket, Buffer.from(name), key);

    interval = setInterval(() => {
      const message = "Still alive!";
      console.log("Client:", "->", message);
      sendEncryptedMessage(socket, Buffer.from(message), key);
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
  console.log("Client:", "key");
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
  startClient(name);
}, 1000);
