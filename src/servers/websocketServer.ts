import WebSocket from "ws";
import "dotenv/config";
import { findKeyGCM, findKeyCBC } from "../fileManager";
import { IncomingMessage } from "http";
import { ServerStorage } from "./serverStorage";
import { decryptData, encryptAndPackageData, unpackageAndDecryptData, unpackageData } from "../cbc";
import { wrapperKeys } from "../wrapperKeys";
import fs from "fs";
import https from "https";

const serverStorage: ServerStorage = ServerStorage.getInstance();

export const createWebsocketServer = () => {
  const webPort = +process.env.websocketport || 8090;
  const useWss = process.env.useWss === "true";
  if (useWss) {
    try {
      console.log("WServer:", `Using WSS ${process.env.certPath} ${process.env.keyPath}`)
      const cert = fs.readFileSync(process.env.certPath);
      const key = fs.readFileSync(process.env.keyPath);
      const httpsServer = https.createServer({ cert, key});
      console.log("WServer:", `Using WSS ${process.env.certPath} ${process.env.keyPath}`, cert, key);
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

const handleNewWebsocketConnection = (socket: WebSocket, req: IncomingMessage) => {
  console.log("WServer:", `Socket ${req.socket.remoteAddress} ${req.socket.remotePort} connected.`);
  console.log("WServer:", `Socket ${req.socket.remoteAddress} ${req.socket.remotePort} dasdasadsadadsads.`);
  if (serverStorage.websocketConnections[req.socket.remoteAddress] === undefined) {
    serverStorage.websocketConnections[req.socket.remoteAddress] = {
      connected: 0,
      disconnected: 0,
      lastConnectionTime: new Date().getTime(),
      names: [],
      failedLogins: 0,
      ip: req.socket.remoteAddress,
    };
  }
  serverStorage.websocketConnections[req.socket.remoteAddress].connected++;
  let messageCount = 0;
  let key: Buffer = null;
  let name: string = "NOT SET";
  let interval: NodeJS.Timeout = null;
  const sendData = (data: Buffer) => {
    socket.send(data);
  };

  socket.on("close", () => {
    console.log("WServer:", `${name} disconnected. (IP: ${req.socket.remoteAddress})`);
    serverStorage.websocketConnections[req.socket.remoteAddress].connected--;
    serverStorage.websocketConnections[req.socket.remoteAddress].disconnected++;
    clearInterval(interval);
  });
  const handleFirstMessage = (encryptedData: Buffer) => {
    serverStorage.websocketConnections[req.socket.remoteAddress].lastConnectionTime = new Date().getTime();
    key = findKeyCBC(encryptedData);
    // console.log("FoundKey", key, key.toString("base64"));
    if (key === null || key === undefined) {
      console.log("WServer:", "No key found");
      socket.close();
      return;
    }
    console.log("WServer:", "Key found.", key);
    const data = unpackageAndDecryptData(encryptedData, key);
    name = data.toString();
    if (name === "") {
      sendData(Buffer.from("No name provided"));
      serverStorage.websocketConnections[req.socket.remoteAddress].failedLogins++;
      socket.close();
      return;
    }
    if (serverStorage.websocketConnections[req.socket.remoteAddress].names.indexOf(name) === -1) {
      serverStorage.websocketConnections[req.socket.remoteAddress].names.push(name);
    }
    serverStorage.websocketManager[name] = { socket: req.socket, key, name };
    messageCount++;
    collectAndSendData();
    interval = setInterval(() => {
      collectAndSendData();
    }, 10000);
    return;
  };
  socket.on("message", (hardlyEncryptedData: Buffer) => {
    let unwrappedData = hardlyEncryptedData;
    for (let i = wrapperKeys.length - 1; i >= 0; i--) {
      unwrappedData = unpackageAndDecryptData(unwrappedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    console.log("WServer:", "Received Message.");
    if (messageCount === 0) {
      console.log("WServer:", "Received FIRST Message.");
      handleFirstMessage(unwrappedData);
    }
  });

  const collectAndSendData = () => {
    // console.log("WServer:", `Collect and send data to ${name}.`);
    const data = Buffer.from(JSON.stringify(serverStorage.getConnectInformation()), "utf-8");
    let encryptedData = encryptAndPackageData(data, key);
    for (let i = 0; i < wrapperKeys.length; i++) {
      encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    sendData(encryptedData);
  };
};
