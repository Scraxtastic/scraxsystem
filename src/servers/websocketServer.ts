import WebSocket from "ws";
import "dotenv/config";
import { findKeyGCM, findKeyCBC } from "../fileManager";
import { IncomingMessage } from "http";
import { ServerStorage } from "./serverStorage";
import { decryptData, encryptAndPackageData, unpackageAndDecryptData, unpackageData } from "../cbc";
import { wrapperKeys } from "../wrapperKeys";

const serverStorage: ServerStorage = ServerStorage.getInstance();

export const createWebsocketServer = () => {
  const webPort = +process.env.websocketport || 8090;
  const webSocketServer = new WebSocket.Server({ port: webPort });
  webSocketServer.on("connection", handleNewWebsocketConnection);
  console.log("WServer:", "Server listening on port " + webPort);
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

  socket.on("close", () => console.log("WServer:", `${name} disconnected. (IP: ${req.socket.remoteAddress})`));
  const handleFirstMessage = (encryptedData: Buffer) => {
    serverStorage.websocketConnections[req.socket.remoteAddress].lastConnectionTime = new Date().getTime();
    key = findKeyCBC(encryptedData);
    // console.log("FoundKey", key, key.toString("base64"));
    if (key === null || key === undefined) {
      console.log("WServer:", "No key found");
      serverStorage.websocketConnections[req.socket.remoteAddress].failedLogins++;
      serverStorage.websocketConnections[req.socket.remoteAddress].connected--;
      serverStorage.websocketConnections[req.socket.remoteAddress].disconnected++;
      socket.close();
      return;
    }
    console.log("WServer:", "Key found.", key);
    const data = unpackageAndDecryptData(encryptedData, key);
    name = data.toString();
    if (name === "") {
      sendData(Buffer.from("No name provided"));
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
    console.log("WServer:", `Collect and send data to ${name}.`);
    const data = Buffer.from(JSON.stringify(serverStorage.getConnectInformation()));
    let encryptedData = encryptAndPackageData(data, key);
    for (let i = 0; i < wrapperKeys.length; i++) {
      encryptedData = encryptAndPackageData(encryptedData, Buffer.from(wrapperKeys[i], "base64"));
    }
    sendData(encryptedData);
  };
};
