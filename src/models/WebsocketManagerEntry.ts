import { Socket } from "net";

export interface WebsocketManagerEntry {
  socket: Socket;
  key: Buffer;
  name: string;
  data: string;
  lastUpdate: number;
}
