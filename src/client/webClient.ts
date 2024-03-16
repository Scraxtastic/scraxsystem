import { WebSocket } from "ws";
import "dotenv/config";
import { getKey } from "../fileManager";
import { encryptAndPackageData, iv, unpackageAndDecryptData } from "../cbc";
import fs from "fs";
import { wrapperKeys } from "../wrapperKeys";
import { ConnectorType } from "../models/FirstMessageSuccess";
import { LoginData } from "../models/LoginData";
import { ErrorMessage } from "../models/ErrorMessage";
import { ConnectionMessage } from "../models/ConnectionMessage";
import {
  cpu,
  cpuCurrentSpeed,
  cpuTemperature,
  currentLoad,
  fsSize,
  fsStats,
  networkStats,
  mem,
} from "systeminformation";
import { ModServer } from "./ModServer";
import { ModMessage } from "../models/ModMessage";
import { UpdateMods } from "../models/UpdateMods";
console.log("WClient:", "started client");

const sendEncryptedMessage = (socket: WebSocket, data: Buffer, key: Buffer) => {
  console.log("WClient:", "sending data", data.toString());
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

const toFixedAsFloat = (value: number, fixed: number) => {
  if (value === null) {
    return null;
  }
  return parseFloat(value.toFixed(fixed));
};

const getData = async (name: string, availableMods: {}) => {
  let data: any = {
    name: name,
  };
  data.cpuSpeed = { value: toFixedAsFloat((await cpuCurrentSpeed()).avg, 1), unit: "GHz" };
  if (data.cpuSpeed.value === null) {
    delete data.cpuSpeed;
  }

  data.cpuTemp = (await cpuTemperature()).main;
  data.cpuTemp = { value: toFixedAsFloat(data.cpuTemp, 1), unit: "°C" };
  if (data.cpuTemp.value === null) {
    delete data.cpuTemp;
  }

  data.cpuLoad = { value: toFixedAsFloat((await currentLoad()).avgLoad * 100, 1), unit: "%" };
  if (data.cpuLoad.value === null || data.cpuLoad.value === 0) {
    delete data.cpuLoad;
  }
  data.latency = { value: toFixedAsFloat((await networkStats())[0].ms / 1000, 1), unit: "s" };
  const memData = await mem();
  const gb = Math.pow(10, 9);
  const mb = Math.pow(10, 6);
  let unit = gb;
  let unitName = "GB";
  if (memData.total < gb) {
    unit = mb;
    unitName = "MB";
  }
  data.ram = {
    used: toFixedAsFloat(memData.active / unit, 1),
    total: toFixedAsFloat((memData.active + memData.available) / unit, 1),
    unit: unitName,
  };

  // MODS
  data.mods = Object.keys(availableMods).map((key) => {
    return { name: key };
  });
  return JSON.stringify(data);
};

const handleConnection = (socket: WebSocket, key: Buffer, name: string, type: ConnectorType) => {
  let interval: NodeJS.Timeout = null;
  let lastData: string = "";
  let lastMessageSent: number = 0;
  let modServer: ModServer = null;
  const availableMods: any = {};
  socket.on("open", () => {
    console.log("WClient:", type, "Connected to server.");
    const loginMessage: LoginData = { name, type };
    sendEncryptedMessage(socket, Buffer.from(JSON.stringify(loginMessage)), key);
  });

  socket.on("error", (err) => {
    console.log("WClient:", type, "Socket error:", err.name, err.message);
    console.log(err.stack);
    process.exit(1);
  });

  socket.on("unexpected-response", (req, res) => {
    console.log("WClient:", type, "Unexpected response:", res);
  });

  socket.on("message", (data: Buffer) => {
    try {
      const decrypted: ErrorMessage | ConnectionMessage | ModMessage = JSON.parse(decryptMessage(data, key).toString());
      if (decrypted.type === "error") {
        console.error("WClient:", type, "Error:", decrypted.message);
        // socket.close();
      }
      if (decrypted.type === "success") {
        handleSuccess();
        modServer = new ModServer(
          (name: string, sendMessage: (message: string, origin: string) => void) => {
            //Add Mod
            console.log("Adding", name);
            availableMods[name] = {send: sendMessage, running: false, queue: []};
            // const modUpdate: UpdateMods = { mods: Object.keys(availableMods), type: "updateMods" };
            // sendEncryptedMessage(socket, Buffer.from(JSON.stringify(modUpdate)), key);
          },
          (name: string) => {
            //Remove Mod
            console.log("Removing", name);
            delete availableMods[name];
          },
          (modname: string, message: string, target: string) => {
            //On Response
            console.log("Response", message);
            const modMessage: ModMessage = {
              message: message,
              target: target,
              origin: name,
              modname: modname,
              type: "mod",
            };
            sendEncryptedMessage(socket, Buffer.from(JSON.stringify(modMessage)), key);
          },
          (modname: string, target:string) => {
            //On Finished
            console.log("Finished");
            const modMessage: ModMessage = {
              message: "\n",
              target: target,
              origin: name,
              modname: modname,
              type: "mod",
            };
            sendEncryptedMessage(socket, Buffer.from(JSON.stringify(modMessage)), key);
          
          }
        );
      }
      if (decrypted.type === "mod") {
        try {
          const modMessage = decrypted as ModMessage;
          console.log("WClient:", type, "Received mod message:", modMessage);
          console.log(
            "WClient:",
            type,
            "Available mods:",
            availableMods,
            availableMods[modMessage.modname],
            modMessage.modname
          );
          availableMods[modMessage.modname].send(modMessage.message, modMessage.origin);
        } catch (e) {
          console.log("WClient:", type, "Mod", "Error:", e.message, e.stack);
        }
      }
      if (type === "receiver") {
        console.log("WClient:", type, "Received data:", decrypted);
        fs.writeFileSync("./output.json", JSON.stringify(decrypted));
      }
    } catch (e) {
      //TODO: Implement server side error handling
      console.log("WClient:", type, "Error:", e.message, e.stack);
      const errorMessage: ErrorMessage = { message: "Decryption failed.", type: "error" };
      sendEncryptedMessage(socket, Buffer.from(JSON.stringify(errorMessage)), key);
      // socket.close();
    }
  });

  socket.on("close", () => {
    console.log("WClient:", type, "Socket closed.");
    clearInterval(interval);
    process.exit(1);
  });
  const handleSuccess = async () => {
    if (type !== "sender") {
      return;
    }
    if (interval !== null) {
      return;
    }
    console.log("WClient:", type, "Handling success");

    sendEncryptedMessage(socket, Buffer.from(await getData(name, availableMods)), key);
    const intervalTime = +process.env.clientSendInterval || 1000;
    interval = setInterval(async () => {
      const currentData = await getData(name, availableMods);
      const now = new Date().getTime();
      if (currentData === lastData && lastMessageSent + 50000 > now) {
        return;
      }
      lastData = currentData;
      lastMessageSent = now;
      sendEncryptedMessage(socket, Buffer.from(currentData), key);
    }, intervalTime);
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
