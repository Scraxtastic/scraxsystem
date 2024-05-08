import { WebSocket } from "ws";
import { ModFirstMessage } from "./models/ModFirstMessage";
import { ModAliveMessage } from "./models/ModAliveMessage";
import { ModChatMessage } from "./models/ModChatMessage";
import { handleMessage } from "./ModHandleMessage";
import { ModType } from "./models/ModType";
export type AddModType = (name: string, type: ModType, sendMessage: (message: string, origin: string) => void) => void;
export type RemoveModType = (name: string) => void;
export type OnResponseType = (name: string, message: string, target: string) => void;
export type OnFinishedType = (modname: string, target: string) => void;
export class ModServer {
  addMod: AddModType;
  removeMod: RemoveModType;
  onResponse: OnResponseType;
  onFinished: OnFinishedType;
  constructor(addMod: AddModType, removeMod: RemoveModType, onResponse: OnResponseType, onFinished: OnFinishedType) {
    this.addMod = addMod;
    this.removeMod = removeMod;
    this.onResponse = onResponse;
    this.onFinished = onFinished;
    const webPort = +process.env.modserverport || 8989;
    const webSocketServer = new WebSocket.Server({ port: webPort });
    webSocketServer.on("connection", (webSocket: WebSocket, req: any) => {
      this.handleNewWebsocketConnection(webSocket, req);
    });
    console.log("WMod:", "Mod Server listening on port " + webPort);
  }

  private handleNewWebsocketConnection(webSocket: WebSocket, req: any) {
    console.log(this.addMod, this.removeMod, this.onResponse);
    console.log("WMod:", `Mod Socket ${req.socket.remoteAddress} ${req.socket.remotePort} connected.`);
    let name: string = "NOT SET";
    let origin: string = "NOT SET";
    let interval: NodeJS.Timeout = setInterval(() => {
      const aliveMessage: ModAliveMessage = {
        name: "Server",
        type: "ModAliveMessage",
      };
      webSocket.send(JSON.stringify(aliveMessage));
    }, 1000);

    webSocket.on("message", (data: Buffer) => {
      handleMessage(
        data,
        name,
        (newName: string) => {
          name = newName;
        },
        webSocket,
        this.addMod,
        this.onResponse,
        this.onFinished,
        origin,
        (newOrigin: string) => {
          origin = newOrigin;
        }
      );
    });
    webSocket.on("close", () => {
      console.log("WMod:", "Mod Socket closed.", name);
      this.removeMod(name);
      clearInterval(interval);
    });
  }
}
