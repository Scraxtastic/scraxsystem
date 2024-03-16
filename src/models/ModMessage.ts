import { MessageType } from "./MessageType";

export interface ModMessage {
    message: string;
    target: any;
    origin: any;
    modname: string;
    type: MessageType;
}