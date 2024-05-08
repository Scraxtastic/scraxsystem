import { AddModType, ModServer, OnFinishedType, OnResponseType } from "./ModServer";
import { ModAliveMessage } from "./models/ModAliveMessage";
import { ModChatMessage } from "./models/ModChatMessage";
import { ModFirstMessage } from "./models/ModFirstMessage";
import WebSocket from "ws";
import { ModType } from "./models/ModType";

export const handleMessage = (
  data: Buffer,
  name: string,
  setName: (name: string) => void,
  webSocket: WebSocket,
  addMod: AddModType,
  onResponse: OnResponseType,
  onFinished: OnFinishedType,
  origin: string,
  setOrigin: (origin: string) => void
) => {
  try {
    const decrypted: ModFirstMessage | ModAliveMessage | ModChatMessage = JSON.parse(data.toString());
    let modType: ModType = "NONE";
    if (decrypted.type === "ModFirstMessage") {
      const firstMessage = decrypted as ModFirstMessage;
      name = firstMessage.name;
      modType = firstMessage.modType;
      setName(name);
      addMod(name, modType, (message: string, messageOrigin: string) => {
        setOrigin(messageOrigin);
        const chatMessage: ModChatMessage = {
          name: "",
          message: message,
          type: "ModChatMessage",
        };
        webSocket.send(JSON.stringify(chatMessage));
      });
      console.log("WMod", `Registered as ${name}`);
    } else if (decrypted.type === "ModAliveMessage") {
      // console.log("Alive", name);
    } else if (decrypted.type === "ModChatMessage") {
      const chatMessage = decrypted as ModChatMessage;
      console.log("WMod", "Chat", chatMessage.name, chatMessage.message);
      onResponse(name, chatMessage.message, origin);
    } else if (decrypted.type === "ModChatFinishedMessage") {
      onFinished(name, origin);
    } else {
      console.error("WMod:", "Mod Server Error: Invalid message type.");
    }
  } catch (e) {
    console.error("WMod:", "Mod Server Decryption failed.", e);
  }
};
