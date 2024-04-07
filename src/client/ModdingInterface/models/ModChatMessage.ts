import { ModMessageType } from "./ModMessageType";

export interface ModChatMessage {
    name: string;
    message: string;
    type: ModMessageType;
}