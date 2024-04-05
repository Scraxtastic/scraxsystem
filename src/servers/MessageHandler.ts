import { ConnectorType } from "../models/FirstMessageSuccess";
import { ModMessage } from "../models/ModMessage";
import { UpdateMods } from "../models/UpdateMods";
import { handleReceiver } from "./ReceiverHandler";
import { handleSender } from "./SenderHandler";
import { ServerStorage } from "./serverStorage";

export const handleMessage = (
  connectionType: ConnectorType,
  serverStorage: ServerStorage,
  encryptData: (data: Buffer, key: Buffer) => Buffer,
  data: string,
  name: string
) => {
  if (connectionType === "receiver") {
    handleReceiver(data, serverStorage, encryptData);
  }
  if (connectionType === "sender") {
    handleSender(data, serverStorage, name, encryptData);
  }
};
