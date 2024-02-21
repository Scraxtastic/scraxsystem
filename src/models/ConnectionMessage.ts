import { MessageType } from "./MessageType";

export interface ConnectionMessage {
  message: string;
  type: MessageType;
}
