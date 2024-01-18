import { Server, Socket } from "net";
import WebSocket from "ws";
import "dotenv/config";
import { findKey } from "./fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "./gcm";
import { IncomingMessage } from "http";

let socketManager: any = {};
let socketConnections: any = {};
let websocketManager: any = {};
let websocketConnections: any = {};

process.on("uncaughtException", (err) => {
  console.log(`Uncaught Exception: ${err}`);
  process.exit(1);
});

const createServer = () => {
  const server = new Server();
  server.on("connection", handleNewConnection);
  server.on("error", (err) => console.error("Server:", err));
  server.on("close", () => console.log("Server:", "Server closed."));
  server.on("error", (err) => console.log("Server:", "ServerSocket", err));
  const serverPort = +process.env.serverport || 8989;
  server.listen(serverPort);
  console.log("Server:", "Server listening on port " + serverPort);
  const webPort = +process.env.websocketport || 8090;
  const webSocketServer = new WebSocket.Server({ port: webPort });
  webSocketServer.on("connection", handleNewWebsocketConnection);
  console.log("WServer:", "Server listening on port " + webPort);
};

const handleNewConnection = (socket: Socket) => {
  console.log("Server:", `Socket ${socket.remoteAddress} ${socket.remotePort} connected.`);
  if (socketConnections[socket.remoteAddress] === undefined) {
    socketConnections[socket.remoteAddress] = {
      connected: 0,
      disconnected: 0,
      lastConnectionTime: new Date().getTime(),
      names: [],
      failedLogins: 0,
    };
  }
  socketConnections[socket.remoteAddress].connected++;
  let messageCount = 0;
  let key: Buffer = null;
  let name: string = "NOT SET";
  const sendData = (buf: Buffer) => {
    socket.write(buf);
  };
  socket.on("error", (err) => {
    console.log("Server:", `${name} crashed. (IP: ${socket.remoteAddress})`);
  });
  socket.on("timeout", () => {
    console.log("Server:", `${name} timed out. (IP: ${socket.remoteAddress})`);
  });
  socket.on("close", () => {
    delete socketManager[name];
    socketConnections[socket.remoteAddress].connected--;
    socketConnections[socket.remoteAddress].disconnected++;
    console.log("Server:", `${name} disconnected. (IP: ${socket.remoteAddress})`);
  });
  socket.on("data", (encryptedData: Buffer) => {
    socketConnections[socket.remoteAddress].lastConnectionTime = new Date().getTime();
    if (messageCount === 0) {
      key = findKey(encryptedData);
      // console.log("FoundKey", key, key.toString("base64"));
      if (key === null || key === undefined) {
        console.log("Server:", "No key found");
        socketConnections[socket.remoteAddress].failedLogins++;
        socketConnections[socket.remoteAddress].connected--;
        socketConnections[socket.remoteAddress].disconnected++;
        socket.end();
        return;
      }
      const data = unpackageAndDecryptData(encryptedData, key);
      name = data.toString();
      if (socketConnections[socket.remoteAddress].names.indexOf(name) === -1) {
        socketConnections[socket.remoteAddress].names.push(name);
      }
      socketManager[name] = { socket, key, name };
      messageCount++;
      return;
    }
    handleData(sendData, encryptedData, key);
  });
};

const handleData = (sendData: (buf: Buffer) => void, encryptedData: Buffer, key: Buffer) => {
  const data = unpackageAndDecryptData(encryptedData, key);
  if (data === null) {
    return;
  }
  const response = encryptAndPackageData(Buffer.from("Received data"), key);
  sendData(response);
};

const handleNewWebsocketConnection = (socket: WebSocket, req: IncomingMessage) => {
  console.log("WServer:", `Socket ${req.socket.remoteAddress} ${req.socket.remotePort} connected.`);
  if (websocketConnections[req.socket.remoteAddress] === undefined) {
    websocketConnections[req.socket.remoteAddress] = {
      connected: 0,
      disconnected: 0,
      lastConnectionTime: new Date().getTime(),
      names: [],
      failedLogins: 0,
    };
  }
  websocketConnections[req.socket.remoteAddress].connected++;
  let messageCount = 0;
  let key: Buffer = null;
  let name: string = "NOT SET";
  let interval: NodeJS.Timeout = null;
  const sendData = (buf: Buffer) => {
    socket.send(buf);
  };

  socket.on("close", () => console.log("WServer:", `${name} disconnected. (IP: ${req.socket.remoteAddress})`));
  socket.on("message", (encryptedData: Buffer) => {
    if (messageCount === 0) {
      websocketConnections[req.socket.remoteAddress].lastConnectionTime = new Date().getTime();
      key = findKey(encryptedData);
      // console.log("FoundKey", key, key.toString("base64"));
      if (key === null || key === undefined) {
        console.log("WServer:", "No key found");
        websocketConnections[req.socket.remoteAddress].failedLogins++;
        websocketConnections[req.socket.remoteAddress].connected--;
        websocketConnections[req.socket.remoteAddress].disconnected++;
        socket.close();
        return;
      }
      const data = unpackageAndDecryptData(encryptedData, key);
      name = data.toString();
      if (name === "") {
        sendData(Buffer.from("No name provided"));
        socket.close();
        return;
      }
      if (websocketConnections[req.socket.remoteAddress].names.indexOf(name) === -1) {
        websocketConnections[req.socket.remoteAddress].names.push(name);
      }
      websocketManager[name] = { socket: req.socket, key, name };
      messageCount++;
      collectAndSendData();
      interval = setInterval(() => {
        collectAndSendData();
      }, 10000);
      return;
    }
  });

  const collectAndSendData = () => {
    const dataToSend: any = {
      sockets: [],
      socketConnections: [],
      webSockets: [],
      websocketConnections: [],
    };
    Object.keys(socketManager).forEach((key) => {
      const { socket, name } = socketManager[key];
      dataToSend.sockets.push({
        name,
        ip: socket.remoteAddress,
        port: socket.remotePort,
      });
    });
    Object.keys(socketConnections).forEach((key) => {
      const { connected, disconnected, lastConnectionTime, names, failedLogins } = socketConnections[key];
      dataToSend.socketConnections = {
        connected,
        disconnected,
        lastConnectionTime,
        names,
        failedLogins,
      };
    });

    Object.keys(websocketManager).forEach((key) => {
      const { socket, name } = websocketManager[key];
      dataToSend.webSockets.push({
        name,
        ip: socket.remoteAddress,
        port: socket.remotePort,
      });
    });

    Object.keys(websocketConnections).forEach((key) => {
      const { connected, disconnected, lastConnectionTime, names, failedLogins } = websocketConnections[key];
      dataToSend.websocketConnections = {
        connected,
        disconnected,
        lastConnectionTime,
        names,
        failedLogins,
      };
    });
    sendData(encryptAndPackageData(Buffer.from(JSON.stringify(dataToSend)), key));
  };
};

createServer();
