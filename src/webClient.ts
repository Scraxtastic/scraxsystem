import { WebSocket } from "ws";
import "dotenv/config";
import { getKey } from "./fileManager";
import { encryptAndPackageData, iv, unpackageAndDecryptData } from "./cbc";
import fs from "fs";
import { wrapperKeys } from "./wrapperKeys";
import { ConnectorType } from "./models/FirstMessageSuccess";
import { LoginData } from "./models/LoginData";
import { ErrorMessage } from "./models/ErrorMessage";
import { ConnectionMessage } from "./models/ConnectionMessage";
console.log("WClient:", "started client");

const sendEncryptedMessage = (socket: WebSocket, data: Buffer, key: Buffer) => {
  console.log("WClient:", "sending data", data.toString());
  let encryptedData = encryptAndPackageData(data, key, iv);
  for (let i = 0; i < wrapperKeys.length; i++) {
    encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"), iv);
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

const getData = (name: string) => {
  const data = {
    name: name,
  };
  return JSON.stringify(data);
};

const handleConnection = (socket: WebSocket, key: Buffer, name: string, type: ConnectorType) => {
  let interval: NodeJS.Timeout = null;
  let lastData: string = "";
  socket.on("open", () => {
    console.log("WClient:", type, "Connected to server.");
    const loginMessage: LoginData = { name, type };
    sendEncryptedMessage(socket, Buffer.from(JSON.stringify(loginMessage)), key);
  });

  socket.on("error", (err) => {
    console.log("WClient:", type, "Socket error:", err.name, err.message);
    console.log(err.stack);
  });

  socket.on("unexpected-response", (req, res) => {
    console.log("WClient:", type, "Unexpected response:", res);
  });

  socket.on("message", (data: Buffer) => {
    try {
      const decrypted: ErrorMessage | ConnectionMessage = JSON.parse(decryptMessage(data, key).toString());
      if (decrypted.type === "error") {
        console.error("WClient:", type, "Error:", decrypted.message);
        socket.close();
      }
      if (decrypted.type === "success") {
        handleSuccess();
      }
      if (type === "receiver") {
        console.log("WClient:", type, "Received data:", decrypted.type, decrypted.message);
        fs.writeFileSync("./output.json", JSON.stringify(decrypted));
      }
    } catch (e) {
      const errorMessage: ErrorMessage = { message: "Decryption failed.", type: "error" };
      sendEncryptedMessage(socket, Buffer.from(JSON.stringify(errorMessage)), key);
      socket.close();
    }
  });

  socket.on("close", () => {
    console.log("WClient:", type, "Socket closed.");
    clearInterval(interval);
  });
  const handleSuccess = () => {
    if (type !== "sender") {
      return;
    }
    if (interval !== null) {
      return;
    }
    console.log("WClient:", type, "Handling success");

    sendEncryptedMessage(socket, Buffer.from(getData(name)), key);
    interval = setInterval(() => {
      const currentData = getData(name);
      if (currentData === lastData) {
        return;
      }
      lastData = currentData;
      sendEncryptedMessage(socket, Buffer.from(currentData), key);
    }, 10000);
  };
};

const createConnection = (ip: string, name: string, type: ConnectorType) => {
  const key = getKey(name);
  console.log("WClient", `key ${name} retrieved`);
  const socket = new WebSocket(ip);
  handleConnection(socket, key, name, type);
};

const startClient = (name: string, type: ConnectorType) => {
  const serverip = process.env.wsAddress || "localhost";
  console.log("WClient:", "connecting to ", serverip);
  createConnection(serverip, name, type);
};

setTimeout(() => {
  let name = "";
  let hasSender = false;
  let hasReceiver = false;
  process.argv.forEach(function (val, index, array) {
    if (val.includes("name=")) {
      name = val.split("=")[1];
    }
    if (val.includes("sender")) {
      hasSender = true;
    }
    if (val.includes("receiver")) {
      hasReceiver = true;
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
  if (hasSender) {
    startClient(name, "sender");
  }
  if (hasReceiver) {
    startClient(name, "receiver");
  }
}, 1000);
