import WebSocket from "ws";
import "dotenv/config";
import { IncomingMessage } from "http";
import { ServerStorage } from "./serverStorage";
import { encryptAndPackageData, unpackageAndDecryptData } from "../cbc";
import { wrapperKeys } from "../wrapperKeys";
import fs from "fs";
import https from "https";
import { FirstMessageSuccess, ConnectorType } from "../models/FirstMessageSuccess";
import { ConnectionMessage } from "../models/ConnectionMessage";
import { SendingData } from "../models/SendingData";
import { handleFirstMessage } from "./FirstMessageHandler";
import { handleMessage } from "./MessageHandler";

const serverStorage: ServerStorage = ServerStorage.getInstance();

export const createWebsocketServer = () => {
  const webPort = +process.env.websocketport || 8990;
  const useWss = process.env.useWss === "true";
  console.log("WServer:", `useWss: ${useWss}`);
  if (useWss) {
    try {
      console.log("WServer:", `Using WSS`);
      const cert = fs.readFileSync(process.env.certPath);
      const key = fs.readFileSync(process.env.keyPath);
      const httpsServer = https.createServer({ cert, key });
      const webSocketServer = new WebSocket.Server({ server: httpsServer });
      webSocketServer.on("connection", handleNewWebsocketConnection);
      httpsServer.listen(webPort);
      console.log("WServer:", "Server listening on port " + webPort);
    } catch (e) {
      console.log("WServer:", "Error creating WSS server", e);
    }
  } else {
    const webSocketServer = new WebSocket.Server({ port: webPort });
    webSocketServer.on("connection", handleNewWebsocketConnection);
    console.log("WServer:", "Server listening on port " + webPort);
  }
};

const handleNewWebsocketConnection = (webSocket: WebSocket, req: IncomingMessage) => {
  console.log("WServer:", `Socket ${req.socket.remoteAddress} ${req.socket.remotePort} connected.`);
  // Create remoteAddress entry if it doesn't exist
  if (serverStorage.connections[req.socket.remoteAddress] === undefined) {
    serverStorage.connections[req.socket.remoteAddress] = {
      connected: 0,
      disconnected: 0,
      lastConnectionTime: new Date().getTime(),
      names: [],
      failedLogins: 0,
      ip: req.socket.remoteAddress,
    };
  }
  // new connection established
  serverStorage.connections[req.socket.remoteAddress].connected++;
  let key: Buffer = null;
  let name: string = "NOT SET";
  let mods: string[] = [];
  let connectionType: ConnectorType = "NOT SET";
  let messageCount: number = 0;
  let lastUpdate: number = 0;
  let lastReceivedMessageTime: number = 0;
  // Interval for sending Messages (if needed to send continously)
  let interval: NodeJS.Timeout = null;
  // Send data to the client
  const sendData = (data: Buffer) => {
    webSocket.send(data);
  };

  const encryptData = (data: Buffer, key: Buffer) => {
    let encryptedData = encryptAndPackageData(data, key);
    for (let i = 0; i < wrapperKeys.length; i++) {
      encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    return encryptedData;
  };

  const sendDataEncrypted = (data: Buffer) => {
    sendData(encryptData(data, key));
  };

  // Handle connection close
  webSocket.on("close", () => {
    console.log("WServer:", `${name} disconnected. (IP: ${req.socket.remoteAddress})`);
    serverStorage.connections[req.socket.remoteAddress].connected--;
    serverStorage.connections[req.socket.remoteAddress].disconnected++;
    delete serverStorage.sockets[name];
    clearInterval(interval);
  });

  webSocket.on("message", (hardlyEncryptedData: Buffer) => {
    // console.log("WServer:", `Received Message from ${name} as type ${conType} with messages: ${messageCount}`);
    let unwrappedData = hardlyEncryptedData;
    for (let i = wrapperKeys.length - 1; i >= 0; i--) {
      unwrappedData = unpackageAndDecryptData(unwrappedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    lastReceivedMessageTime = new Date().getTime();
    if (messageCount === 0) {
      console.log("WServer:", "Received FIRST Message.");
      const firstMessageResult: FirstMessageSuccess = handleFirstMessage(unwrappedData);
      serverStorage.lastConnectionUpdate = new Date().getTime();
      serverStorage.connections[req.socket.remoteAddress].lastConnectionTime = new Date().getTime();
      if (firstMessageResult.success === false) {
        // sendDataEncrypted(
        //   Buffer.from(JSON.stringify({ message: firstMessageResult.message, type: errorMessageType }), "utf-8")
        // );
        console.log("WServer:", "Error:", firstMessageResult.message);
        serverStorage.connections[req.socket.remoteAddress].failedLogins++;
        webSocket.close();
        return;
      }
      console.log("WServer:", `${firstMessageResult.websocketEntry.name} logged in as ${firstMessageResult.type}.`);
      key = firstMessageResult.websocketEntry.key;
      name = firstMessageResult.websocketEntry.name;
      mods = firstMessageResult.websocketEntry.mods;
      connectionType = firstMessageResult.type;
      if (serverStorage.connections[req.socket.remoteAddress].names.indexOf(name) === -1) {
        serverStorage.connections[req.socket.remoteAddress].names.push(name);
      }
      serverStorage.sockets[name] = {
        websocket: webSocket,
        socket: req.socket,
        key,
        name,
        data: "",
        lastRegistration: new Date().getTime(),
        mods: mods,
      };
      serverStorage.lastSocketUpdate = new Date().getTime();
      messageCount++;
      connectionType = firstMessageResult.type;
      if (firstMessageResult.type === "receiver") {
        console.log("WServer:", "Receiver connected.");
        collectAndSendData();
        interval = setInterval(() => {
          collectAndSendData();
        }, 1000);
      } else {
        console.log("WServer:", "Sender connected.");
        const response: ConnectionMessage = { message: "Hello, World!", type: "success" };
        sendDataEncrypted(Buffer.from(JSON.stringify(response), "utf-8"));
        interval = setInterval(() => {
          if (lastReceivedMessageTime + 60000 < new Date().getTime()) {
            console.log("WServer:", `No message received from sender for 60 seconds by ${name}. Closing connection.`);
            webSocket.close();
          }
        }, 10000);
      }
      return;
    }
    messageCount++;
    const data = unpackageAndDecryptData(unwrappedData, key).toString();
    handleMessage(connectionType, serverStorage, encryptData, data, name);
  });

  const collectAndSendData = () => {
    const sendingData: SendingData = serverStorage.getConnectInformation(lastUpdate);
    if (sendingData === null) {
      // No update available -> not sending anything
      return;
    }
    // console.log("WServer:", "Sending Message to", name);
    const message: ConnectionMessage = { message: JSON.stringify(sendingData), type: "data" };
    // console.log("WServer:", "Sending data to", name, message.message);
    const data = Buffer.from(JSON.stringify(message), "utf-8");
    sendDataEncrypted(data);
    lastUpdate = new Date().getTime();
  };
};
