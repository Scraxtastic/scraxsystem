import { WebSocket } from "ws";
import { ModServer } from "./ModdingInterface/ModServer";
import { LoginData } from "../models/LoginData";
import { ErrorMessage } from "../models/ErrorMessage";
import { ConnectionMessage } from "../models/ConnectionMessage";
import { ModMessage } from "../models/ModMessage";
import { getData } from "./ClientGetData";
import fs from "fs";
import { ConnectorType } from "../models/FirstMessageSuccess";
import { ModType } from "./ModdingInterface/models/ModType";

export const handleConnection = (
  socket: WebSocket,
  key: Buffer,
  name: string,
  sendEncryptedMessage: (socket: WebSocket, data: Buffer, key: Buffer) => void,
  decryptMessage: (data: Buffer, key: Buffer) => Buffer
) => {
  let interval: NodeJS.Timeout = null;
  let lastData: string = "";
  let lastMessageSent: number = 0;
  let modServer: ModServer = null;
  let availableMods: any = {};
  socket.on("open", () => {
    console.log("WClient:", "Connected to server.");
    const loginMessage: LoginData = { name, type: "sender" };
    sendEncryptedMessage(socket, Buffer.from(JSON.stringify(loginMessage)), key);
  });

  socket.on("error", (err) => {
    console.log("WClient:", "Socket error:", err.name, err.message);
    console.log(err.stack);
    process.exit(1);
  });

  socket.on("unexpected-response", (req, res) => {
    console.log("WClient:", "Unexpected response:", res);
  });

  socket.on("message", (data: Buffer) => {
    console.log("Creating ModServer");
    try {
      const decrypted: ErrorMessage | ConnectionMessage | ModMessage = JSON.parse(decryptMessage(data, key).toString());
      // console.log("WClient:", type, "Received data:", decrypted, "\n");
      if (decrypted.type === "error") {
        console.error("WClient:", "Error:", decrypted.message);
        // socket.close();
      }
      if (decrypted.type === "success") {
        handleSuccess();
        modServer = new ModServer(
          (name: string, modType: ModType, sendMessage: (message: string, origin: string) => void) => {
            //Add Mod
            console.log("Adding", name, modType);
            availableMods[name] = { modType: modType, send: sendMessage, running: false, queue: [] };
            console.log("WClient", "ClienHandleConnection", "Available Mods", availableMods);
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
            console.log("Sending response", modMessage);
            sendEncryptedMessage(socket, Buffer.from(JSON.stringify(modMessage)), key);
          },
          (modname: string, target: string) => {
            //On Finished
            const modMessage: ModMessage = {
              message: "",
              target: target,
              origin: name,
              modname: modname,
              type: "modFinished",
            };
            console.log("Finished", modMessage);
            sendEncryptedMessage(socket, Buffer.from(JSON.stringify(modMessage)), key);
          }
        );
      }
      if (decrypted.type === "mod" || decrypted.type === "modFinished") {
        console.log("WServer", "Received mod message:", decrypted);
        try {
          const modMessage = decrypted as ModMessage;
          console.log("WClient:", "Received mod message:", modMessage);
          console.log(
            "WClient:",
            "Available mods:",
            availableMods,
            availableMods[modMessage.modname],
            modMessage.modname
          );
          console.log("Sending to", availableMods[modMessage.modname], availableMods);
          availableMods[modMessage.modname]?.send(modMessage.message, modMessage.origin);
        } catch (e) {
          console.log("WClient:", "Mod", "Error:", e.message, e.stack);
        }
      }
      // console.log("WClient:", type, "Received data:", decrypted);
      fs.writeFileSync("./output.json", JSON.stringify(decrypted));
    } catch (e) {
      //TODO: Implement server side error handling
      console.log("WClient:", "Error:", e.message, e.stack);
      const errorMessage: ErrorMessage = { message: "Decryption failed.", type: "error" };
      sendEncryptedMessage(socket, Buffer.from(JSON.stringify(errorMessage)), key);
      // socket.close();
    }
  });

  socket.on("close", () => {
    console.log("WClient:", "Socket closed.");
    clearInterval(interval);
    process.exit(1);
  });
  const handleSuccess = async () => {
    if (interval !== null) {
      return;
    }
    console.log("WClient:", "Handling success");

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
