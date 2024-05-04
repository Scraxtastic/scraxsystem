import { ModType } from "../ModServer";
import { ModMessageType } from "./ModMessageType";

export interface ModFirstMessage {
    name: string;
    modType: ModType;
    type: ModMessageType;
}