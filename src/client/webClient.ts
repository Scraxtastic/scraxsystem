import { WebSocket } from "ws";
import "dotenv/config";
import { getKey } from "../fileManager";
import { encryptAndPackageData, iv, unpackageAndDecryptData } from "../cbc";
import { wrapperKeys } from "../wrapperKeys";
import { ConnectorType } from "../models/FirstMessageSuccess";
import { handleConnection } from "./ClientHandleConnection";
console.log("WClient:", "started client");

const sendEncryptedMessage = (socket: WebSocket, data: Buffer, key: Buffer) => {
  // console.log("WClient:", "sending data", data.toString());
  let encryptedData = encryptAndPackageData(data, key);
  for (let i = 0; i < wrapperKeys.length; i++) {
    encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
  }
  socket.send(encryptedData);
  console.log("Sending Message");
};

const decryptMessage = (hardlyEncryptedData: Buffer, key: Buffer) => {
  let unwrappedData = hardlyEncryptedData;
  for (let i = wrapperKeys.length - 1; i >= 0; i--) {
    unwrappedData = unpackageAndDecryptData(unwrappedData, Buffer.from(wrapperKeys[i], "base64"));
  }
  const data = unpackageAndDecryptData(unwrappedData, key);
  return data;
};

const startClient = (name: string) => {
  const serverip = process.env.wsAddress || "localhost";
  console.log("WClient:", "connecting to ", serverip);
  const key = getKey(name);
  console.log("WClient", `key ${name} retrieved`);
  const socket = new WebSocket(serverip);
  handleConnection(socket, key, name, sendEncryptedMessage, decryptMessage);
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
  startClient(name);
}, 1000);
