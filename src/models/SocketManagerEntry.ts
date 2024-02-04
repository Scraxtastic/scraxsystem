import { Socket } from "net";

export interface SocketManagerEntry {
  socket: Socket;
  key: Buffer;
  name: string;
  data: string;
}
