import { ModMessage } from "../models/ModMessage";
import { ServerStorage } from "./serverStorage";

export const handleReceiver = (
  data: string,
  serverStorage: ServerStorage,
  encryptData: (data: Buffer, key: Buffer) => Buffer
) => {
  const modMessage: ModMessage = JSON.parse(data);
  if (modMessage.type === "mod") {
    const manager = serverStorage.sockets[modMessage.target];
    manager.websocket.send(encryptData(Buffer.from(JSON.stringify(modMessage)), manager.key));
  }
};
