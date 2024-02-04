import { getKey } from "./fileManager";

// For testing
require("./server");
require("./client");
require("./webClient");

const key = getKey("pixel7");
console.log("KEY:", key.toString("base64"));

// import { createCipheriv, createDecipheriv } from "crypto";

// const key = Buffer.from("bi7kdNhA7R3ZsMkv5Ct5Ka0o+hDeDq8h4MzDUzEnZh8=", "base64");
// const iv = Buffer.from("oVtoejvQgwxp4h67oKQJ/w==", "base64");
// const data = "Hello, World!";

// const encryptFileData = (data: Buffer): Buffer => {
//   const cipher = createCipheriv("aes-256-cbc", key, iv);
//   return Buffer.concat([cipher.update(data), cipher.final()]);
// };

// const decryptFileData = (encryptedData: Buffer): Buffer => {
//   const decipher = createDecipheriv("aes-256-cbc", key, iv);
//   return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
// };

// const cbcEncrypted = encryptFileData(Buffer.from(data));
// const cbcDecrypted = decryptFileData(cbcEncrypted);
// console.log("CBC:", cbcEncrypted.toString("base64"), cbcDecrypted.toString("utf-8"));
