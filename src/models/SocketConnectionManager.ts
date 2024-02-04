import { SocketConnection } from "./SocketConnection";

export interface SocketConnectionManager {
  [name: string]: SocketConnection;
}
