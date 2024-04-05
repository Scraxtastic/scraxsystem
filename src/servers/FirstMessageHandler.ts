import { unpackageAndDecryptData } from "../cbc";
import { findKeyCBC } from "../fileManager";
import { ConnectorType, FirstMessageSuccess } from "../models/FirstMessageSuccess";
import { LoginData } from "../models/LoginData";

export const handleFirstMessage = (encryptedData: Buffer): FirstMessageSuccess => {
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
          websocketEntry: {
            websocket: null,
            socket: null,
            name: loginData.name,
            key: key,
            data: "",
            lastRegistration: new Date().getTime(),
            mods: [],
          },
          message: "No type provided",
          type: "NOT SET",
        };
    }
    // return success
    return {
      success: true,
      websocketEntry: {
        websocket: null,
        socket: null,
        name: loginData.name,
        key: key,
        data: "",
        lastRegistration: new Date().getTime(),
        mods: [],
      },
      message: "First message handled successfully",
      type: type,
    };
  } catch (e) {
    return { success: false, websocketEntry: null, message: "Error while handling first message", type: "NOT SET" };
  }
};
