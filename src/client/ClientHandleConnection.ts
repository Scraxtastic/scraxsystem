import { WebSocket } from "ws";
import { ModServer } from "./ModdingInterface/ModServer";
import { LoginData } from "../models/LoginData";
import { ErrorMessage } from "../models/ErrorMessage";
import { ConnectionMessage } from "../models/ConnectionMessage";
import { ModMessage } from "../models/ModMessage";
import { getData } from "./ClientGetData";
import fs from "fs";
import { ConnectorType } from "../models/FirstMessageSuccess";

export const handleConnection = (
  socket: WebSocket,
  key: Buffer,
  name: string,
  type: ConnectorType,
  sendEncryptedMessage: (socket: WebSocket, data: Buffer, key: Buffer) => void,
  decryptMessage: (data: Buffer, key: Buffer) => Buffer
) => {
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
            availableMods[name] = { send: sendMessage, running: false, queue: [] };
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
          (modname: string, target: string) => {
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
