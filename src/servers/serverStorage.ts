import { WebsocketManager } from "../models/WebsocketManager";
import { WebsocketConnectionManager } from "../models/WebsocketConnectionManager";

export class ServerStorage {
  private static instance: ServerStorage;
  public static getInstance(): ServerStorage {
    if (!ServerStorage.instance) {
      ServerStorage.instance = new ServerStorage();
    }
    return ServerStorage.instance;
  }

  public sockets: WebsocketManager = {};
  public connections: WebsocketConnectionManager = {};

  public getConnectInformation(): any {
    const dataToSend: any = {
      sockets: [],
      connections: [],
    };

    Object.keys(this.sockets).forEach((key) => {
      const { socket, name } = this.sockets[key];
      dataToSend.sockets.push({
        name,
        ip: socket.remoteAddress,
        port: socket.remotePort,
      });
    });

    Object.keys(this.connections).forEach((key) => {
      const { connected, disconnected, lastConnectionTime, names, failedLogins } = this.connections[key];
      dataToSend.connections.push({
        connected,
        disconnected,
        lastConnectionTime,
        names,
        failedLogins,
      });
    });
    dataToSend.type = "connectInformation";
    return dataToSend;
  }
}
