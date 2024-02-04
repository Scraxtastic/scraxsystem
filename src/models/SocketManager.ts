import { SocketManagerEntry } from "./SocketManagerEntry";

export interface SocketManager {
  [name: string]: SocketManagerEntry;
}
