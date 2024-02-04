import { SocketManager } from "../models/SocketManager";
import { SocketManagerEntry } from "../models/SocketManagerEntry";
import { SocketConnectionManager } from "../models/SocketConnectionManager";
import { SocketConnection } from "../models/SocketConnection";
import { WebsocketManager } from "../models/WebsocketManager";
import { WebsocketConnectionManager } from "../models/WebsocketConnectionManager";
import { WebsocketManagerEntry } from "../models/WebsocketManagerEntry";
import { WebsocketConnection } from "../models/WebsocketConnection";

export class ServerStorage {
  private static instance: ServerStorage;
  public static getInstance(): ServerStorage {
    if (!ServerStorage.instance) {
      ServerStorage.instance = new ServerStorage();
    }
    return ServerStorage.instance;
  }

  public socketManager: SocketManager = {};
  public socketConnections: SocketConnectionManager = {};
  public websocketManager: WebsocketManager = {};
  public websocketConnections: WebsocketConnectionManager = {};

  public getConnectInformation(): any {
    const dataToSend: any = {
      sockets: [],
      socketConnections: [],
      webSockets: [],
      websocketConnections: [],
    };

    Object.keys(this.socketManager).forEach((key) => {
      const { socket, name, data } = this.socketManager[key];
      dataToSend.sockets.push({
        name,
        ip: socket.remoteAddress,
        port: socket.remotePort,
        data: data,
      });
    });

    Object.keys(this.socketConnections).forEach((key) => {
      const { connected, disconnected, lastConnectionTime, names, failedLogins, ip } = this.socketConnections[key];
      dataToSend.socketConnections.push({
        connected,
        disconnected,
        lastConnectionTime,
        names,
        failedLogins,
        ip,
      });
    });

    Object.keys(this.websocketManager).forEach((key) => {
      const { socket, name } = this.websocketManager[key];
      dataToSend.webSockets.push({
        name,
        ip: socket.remoteAddress,
        port: socket.remotePort,
      });
    });

    Object.keys(this.websocketConnections).forEach((key) => {
      const { connected, disconnected, lastConnectionTime, names, failedLogins } = this.websocketConnections[key];
      dataToSend.websocketConnections.push({
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

  //#region SocketManager
  public addSocketInformation(socketEntry: SocketManagerEntry): void {
    this.socketManager[socketEntry.name] = socketEntry;
  }

  public removeSocketInformation(name: string): void {
    delete this.socketManager[name];
  }

  public getSocketInformation(name: string): SocketManagerEntry {
    return this.socketManager[name];
  }
  //#endregion

  //#region SocketConnectionManager
  public addSocketConnectionInformation(socketConnection: SocketConnection): void {
    this.socketConnections[socketConnection.ip] = socketConnection;
  }

  public removeSocketConnectionInformation(ip: string): void {
    delete this.socketConnections[ip];
  }

  public getSocketConnectionInformation(ip: string): SocketConnection {
    return this.socketConnections[ip];
  }
  //#endregion

  //#region WebsocketManager
  public addWebsocketInformation(websocketEntry: WebsocketManagerEntry): void {
    this.websocketManager[websocketEntry.name] = websocketEntry;
  }
  public removeWebsocketInformation(name: string): void {
    delete this.websocketManager[name];
  }
  public getWebsocketInformation(name: string): WebsocketManagerEntry {
    return this.websocketManager[name];
  }
  //#endregion

  //#region WebsocketConnectionManager
  public addWebsocketConnectionInformation(websocketConnection: WebsocketConnection): void {
    this.websocketConnections[websocketConnection.ip] = websocketConnection;
  }
  public removeWebsocketConnectionInformation(ip: string): void {
    delete this.websocketConnections[ip];
  }
  public getWebsocketConnectionInformation(ip: string): WebsocketConnection {
    return this.websocketConnections[ip];
  }
  //#endregion
}
