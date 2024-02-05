import { Server, Socket } from "net";
import "dotenv/config";
import { findKeyGCM } from "../fileManager";
import { encryptAndPackageData, unpackageAndDecryptData } from "../gcm";
import { ServerStorage } from "./serverStorage";

const serverStorage: ServerStorage = ServerStorage.getInstance();

export const createSocketServer = () => {
  const server = new Server();
  server.on("connection", handleNewConnection);
  server.on("close", () => {
    console.log("Server:", "Server closed.");
  });
  server.on("error", (err) => console.log("Server:", "ServerSocket", err));
  const serverPort = +process.env.serverport || 8989;
  server.listen(serverPort);
  console.log("Server:", "Server listening on port " + serverPort);
};

const handleNewConnection = (socket: Socket) => {
  console.log("Server:", `Socket ${socket.remoteAddress} ${socket.remotePort} connected.`);
  if (serverStorage.socketConnections[socket.remoteAddress] === undefined) {
    serverStorage.socketConnections[socket.remoteAddress] = {
      connected: 0,
      disconnected: 0,
      lastConnectionTime: new Date().getTime(),
      names: [],
      failedLogins: 0,
      ip: socket.remoteAddress,
    };
  }
  serverStorage.socketConnections[socket.remoteAddress].connected++;
  const keyName: { name: string; key: Buffer } = { name: "NOT SET", key: undefined };
  socket.on("error", (err) => {
    handleError(err, keyName.name, socket);
  });
  socket.on("timeout", () => {
    handleTimeout(keyName.name, socket);
  });
  socket.on("close", () => {
    handleClose(keyName.name, socket);
  });
  socket.on("data", (encryptedData: Buffer) => {
    handleData(encryptedData, socket, keyName);
  });
  console.log("Server:", "New Connection End");
};

const handleError = (err: Error, name: string, socket: Socket) => {
  console.log("Server:", `${name} crashed. (IP: ${socket.remoteAddress})`);
};

const handleTimeout = (name: string, socket: Socket) => {
  console.log("Server:", `${name} timed out. (IP: ${socket.remoteAddress})`);
};

const handleClose = (name: string, socket: Socket) => {
  serverStorage.removeSocketInformation(name);
  serverStorage.socketConnections[socket.remoteAddress].connected--;
  serverStorage.socketConnections[socket.remoteAddress].disconnected++;
  console.log("Server:", `${name} disconnected. (IP: ${socket.remoteAddress})`);
};

const handleData = (encryptedData: Buffer, socket: Socket, keyName: { name: string; key: Buffer }) => {
  const sendData = (buf: Buffer) => {
    socket.write(buf);
  };
  // console.log("Server:", "HandleData");
  serverStorage.socketConnections[socket.remoteAddress].lastConnectionTime = new Date().getTime();
  if (keyName.key === undefined) {
    handleLogin(keyName, encryptedData, socket);
    return;
  }
  handleResponse(sendData, encryptedData, keyName.key, keyName.name);
};

const handleResponse = (sendData: (buf: Buffer) => void, encryptedData: Buffer, key: Buffer, name: string) => {
  const data = unpackageAndDecryptData(encryptedData, key);
  if (data === null) {
    return;
  }
  serverStorage.socketManager[name].data = data.toString();
  const response = encryptAndPackageData(Buffer.from("Received data"), key);
  sendData(response);
};

const handleLogin = (keyName: { key: Buffer; name: string }, encryptedData: Buffer, socket: Socket) => {
  const sendData = (buf: Buffer) => {
    socket.write(buf);
  };
  console.log("Server", "HandleLogin");
  keyName.key = findKeyGCM(encryptedData);
  // console.log("FoundKey", key, key.toString("base64"));
  if (keyName.key === null || keyName.key === undefined) {
    console.log("Server:", "No key found");
    serverStorage.socketConnections[socket.remoteAddress].failedLogins++;
    serverStorage.socketConnections[socket.remoteAddress].connected--;
    serverStorage.socketConnections[socket.remoteAddress].disconnected++;
    socket.end();
    return;
  }
  const data = unpackageAndDecryptData(encryptedData, keyName.key);
  const name = data.toString();
  if (name === "") {
    sendData(Buffer.from("No name provided"));
    socket.end();
    return;
  }
  console.log("Server:", `Socket ${socket.remoteAddress} ${socket.remotePort} logged in as ${name}`);
  if (serverStorage.socketConnections[socket.remoteAddress].names.indexOf(name) === -1) {
    serverStorage.socketConnections[socket.remoteAddress].names.push(name);
  }
  if (serverStorage.socketManager[name] !== undefined) {
    sendData(Buffer.from("Name already in use. Please choose another name."));
    socket.end();
    return;
  }
  keyName.name = name;
  serverStorage.socketManager[name] = { socket, key: keyName.key, name: keyName.name, data: "" };
};
