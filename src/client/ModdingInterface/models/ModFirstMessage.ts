import { ModMessageType } from "./ModMessageType";
import { ModType } from "./ModType";

export interface ModFirstMessage {
    name: string;
    modType: ModType;
    type: ModMessageType;
}