import { WebsocketConnection } from "./WebsocketConnection";

export interface WebsocketConnectionManager {
  [name: string]: WebsocketConnection;
}
