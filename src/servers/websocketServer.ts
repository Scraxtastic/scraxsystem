import WebSocket from "ws";
import "dotenv/config";
import { findKeyGCM, findKeyCBC } from "../fileManager";
import { IncomingMessage } from "http";
import { ServerStorage } from "./serverStorage";
import { decryptData, encryptAndPackageData, unpackageAndDecryptData, unpackageData } from "../cbc";
import { wrapperKeys } from "../wrapperKeys";
import fs from "fs";
import https from "https";
import { FirstMessageSuccess, ConnectorType } from "../models/FirstMessageSuccess";
import { LoginData } from "../models/LoginData";
import { MessageType } from "../models/MessageType";
import { ErrorMessage } from "../models/ErrorMessage";
import { ConnectionMessage } from "../models/ConnectionMessage";
import { SendingData } from "../models/SendingData";

const serverStorage: ServerStorage = ServerStorage.getInstance();

export const createWebsocketServer = () => {
  const webPort = +process.env.websocketport || 8990;
  const useWss = process.env.useWss === "true";
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
  let conType: ConnectorType = "NOT SET";
  let messageCount: number = 0;
  let lastUpdate: number = 0;
  let lastReceivedMessageTime: number = 0;
  // Interval for sending Messages (if needed to send continously)
  let interval: NodeJS.Timeout = null;
  // Send data to the client
  const sendData = (data: Buffer) => {
    webSocket.send(data);
  };

  const sendDataEncrypted = (data: Buffer) => {
    let encryptedData = encryptAndPackageData(data, key);
    for (let i = 0; i < wrapperKeys.length; i++) {
      encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    sendData(encryptedData);
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
    console.log("WServer:", `Received Message from ${name} as type ${conType} with messages: ${messageCount}`);
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
      conType = firstMessageResult.type;
      if (serverStorage.connections[req.socket.remoteAddress].names.indexOf(name) === -1) {
        serverStorage.connections[req.socket.remoteAddress].names.push(name);
      }
      serverStorage.sockets[name] = { socket: req.socket, key, name, data: "", lastUpdate: new Date().getTime() };
      serverStorage.lastSocketUpdate = new Date().getTime();
      messageCount++;
      conType = firstMessageResult.type;
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
          if(lastReceivedMessageTime + 60000 < new Date().getTime()) {
            console.log("WServer:", "No message received from sender for 60 seconds. Closing connection.");
            webSocket.close();
          }
        }, 10000);
      }
      return;
    }
    messageCount++;
    const data = unpackageAndDecryptData(unwrappedData, key).toString();
    if (conType === "sender") {
      handleSender(name, data);
      return;
    }
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

const handleSender = (name: string, data: string) => {
  console.log("WServer:", "Received data from sender");
  serverStorage.sockets[name].data = data;
  serverStorage.lastSocketUpdate = new Date().getTime();
};

//Handle first message
const handleFirstMessage = (encryptedData: Buffer): FirstMessageSuccess => {
  try {
    const key = findKeyCBC(encryptedData);
    if (key === null || key === undefined) {
      return { success: false, websocketEntry: null, message: "No key found", type: "NOT SET" };
    }
    console.log("WServer:", "Key found");
    const data = unpackageAndDecryptData(encryptedData, key);
    const loginData: LoginData = JSON.parse(data.toString());
    // check if name is given
    if (loginData.name === undefined || loginData.name === null || loginData.name === "") {
      return { success: false, websocketEntry: null, message: "No name provided", type: "NOT SET" };
    }
    // check loginData.type
    let type: ConnectorType = "NOT SET";
    switch (loginData.type) {
      case "receiver":
        type = "receiver";
        break;
      case "sender":
        type = "sender";
        break;
      default:
        return {
          success: false,
          websocketEntry: { socket: null, name: loginData.name, key: key, data: "", lastUpdate: new Date().getTime() },
          message: "No type provided",
          type: "NOT SET",
        };
    }
    // return success
    return {
      success: true,
      websocketEntry: { socket: null, name: loginData.name, key: key, data: "", lastUpdate: new Date().getTime() },
      message: "First message handled successfully",
      type: type,
    };
  } catch (e) {
    return { success: false, websocketEntry: null, message: "Error while handling first message", type: "NOT SET" };
  }
};
