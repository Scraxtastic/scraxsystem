import { WebSocket } from "ws";
import { ModFirstMessage } from "./models/ModFirstMessage";
import { ModAliveMessage } from "./models/ModAliveMessage";
import { ModChatMessage } from "./models/ModChatMessage";
export class ModServer {
  addMod: (name: string, sendMessage: (message: string, origin: string) => void) => void;
  removeMod: (name: string) => void;
  onResponse: (name: string, message: string, target: string) => void;
  onFinished: (modname: string, target: string) => void;
  constructor(
    addMod: (name: string, sendMessage: (message: string, origin: string) => void) => void,
    removeMod: (name: string) => void,
    onResponse: (name: string, message: string, target: string) => void,
    onFinished: (modname: string, target: string) => void
  ) {
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
      try {
        const decrypted: ModFirstMessage | ModAliveMessage | ModChatMessage = JSON.parse(data.toString());
        if (decrypted.type === "ModFirstMessage") {
          name = decrypted.name;
          this.addMod(name, (message: string, messageOrigin: string) => {
            origin = messageOrigin;
            const chatMessage: ModChatMessage = {
              name: "",
              message: message,
              type: "ModChatMessage",
            };
            webSocket.send(JSON.stringify(chatMessage));
          });
          console.log("WMod", `Registered as ${name}`);
        } else if (decrypted.type === "ModAliveMessage") {
          // console.log("Alive", name);
        } else if (decrypted.type === "ModChatMessage") {
          const chatMessage = decrypted as ModChatMessage;
          // console.log("WMod", "Chat", chatMessage.name, chatMessage.message);
          this.onResponse(name, chatMessage.message, origin);
        } else if (decrypted.type === "ModChatFinishedMessage") {
          this.onFinished(name, origin);
        } else {
          console.error("WMod:", "Mod Server Error: Invalid message type.");
        }
      } catch (e) {
        console.error("WMod:", "Mod Server Decryption failed.", e);
      }
    });
    webSocket.on("close", () => {
      console.log("WMod:", "Mod Socket closed.", name);
      this.removeMod(name);
      clearInterval(interval);
    });
  }
}
