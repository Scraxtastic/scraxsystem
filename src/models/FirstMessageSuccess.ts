import { WebsocketManagerEntry } from "./WebsocketManagerEntry";

export interface FirstMessageSuccess {
  success: boolean;
  websocketEntry: WebsocketManagerEntry;
  message: string;
  type: ConnectorType;
}

export type ConnectorType = "NOT SET" | "receiver" | "sender";
