import { Socket } from "net";
import WebSocket from "ws";

export interface WebsocketManagerEntry {
  websocket: WebSocket;
  socket: Socket;
  key: Buffer;
  name: string;
  data: string;
  mods: string[];
  lastRegistration: number;
}
