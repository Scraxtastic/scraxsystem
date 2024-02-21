import { MessageType } from "./MessageType";

export interface SendingData {
  sockets: any[];
  connections: any[];
  type: MessageType;
}
