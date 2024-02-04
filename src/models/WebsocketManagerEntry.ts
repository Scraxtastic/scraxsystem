import { Socket } from "net";

export interface WebsocketManagerEntry {
  socket: Socket;
  key: Buffer;
  name: string;
}
