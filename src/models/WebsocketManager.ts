import { WebsocketManagerEntry } from "./WebsocketManagerEntry";

export interface WebsocketManager {
  [name: string]: WebsocketManagerEntry;
}
