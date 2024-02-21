import { MessageType } from "./MessageType";

export interface ErrorMessage {
    message: string;
    type: MessageType;
}