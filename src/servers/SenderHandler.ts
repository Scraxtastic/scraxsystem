import { ModMessage } from "../models/ModMessage";
import { UpdateMods } from "../models/UpdateMods";
import { ServerStorage } from "./serverStorage";

export const handleSender = (
  data: string,
  serverStorage: ServerStorage,
  name: string,
  encryptData: (data: Buffer, key: Buffer) => Buffer
) => {
  const parsedData: ModMessage | UpdateMods = JSON.parse(data);
  if (parsedData.type === "updateMods") {
    serverStorage.sockets[name].mods = (parsedData as UpdateMods).mods;
    console.log("WServer:", "Updated mods for", name, serverStorage.sockets[name].mods);
  }
  if (parsedData.type === "mod") {
    const modMessage: ModMessage = parsedData as ModMessage;

    const manager = serverStorage.sockets[modMessage.target];
    manager.websocket.send(encryptData(Buffer.from(JSON.stringify(modMessage)), manager.key));
  } else {
    serverStorage.sockets[name].data = data;
    serverStorage.lastSocketUpdate = new Date().getTime();
  }
};
