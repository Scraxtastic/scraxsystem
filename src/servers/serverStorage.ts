import { WebsocketManager } from "../models/WebsocketManager";
import { WebsocketConnectionManager } from "../models/WebsocketConnectionManager";
import { SendingData } from "../models/SendingData";

export class ServerStorage {
  private static instance: ServerStorage;
  public static getInstance(): ServerStorage {
    if (!ServerStorage.instance) {
      ServerStorage.instance = new ServerStorage();
    }
    return ServerStorage.instance;
  }

  public sockets: WebsocketManager = {};
  public lastSocketUpdate: number = 0;
  public connections: WebsocketConnectionManager = {};
  public lastConnectionUpdate: number = 0;

  public getConnectInformation(lastUpdate: number): SendingData {
    const shallUpdateSocket: boolean = this.lastSocketUpdate > lastUpdate;
    const shallUpdateConnection: boolean = this.lastConnectionUpdate > lastUpdate;
    const dataToSend: SendingData = {
      sockets: [],
      connections: [],
      type: "data",
    };
    if (shallUpdateSocket) {
      Object.keys(this.sockets).forEach((key) => {
        const { socket, name, data } = this.sockets[key];
        dataToSend.sockets.push({
          name,
          ip: socket.remoteAddress,
          port: socket.remotePort,
          data: data,
        });
      });
    }
    if (shallUpdateConnection) {
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
    }

    if (!shallUpdateSocket) {
      delete dataToSend.sockets;
    }
    if (!shallUpdateConnection) {
      delete dataToSend.connections;
    }
    // Return null if no update is available
    if (!shallUpdateSocket && !shallUpdateConnection) {
      return null;
    }
    return dataToSend;
  }
}
