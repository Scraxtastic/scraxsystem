import { createCipheriv, createDecipheriv } from "crypto";

const key = Buffer.from("bi7kdNhA7R3ZsMkv5Ct5Ka0o+hDeDq8h4MzDUzEnZh8=", "base64");
const iv = Buffer.from("oVtoejvQgwxp4h67oKQJ/w==", "base64");

const encryptFileData = (data: Buffer): Buffer => {
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
};

const decryptFileData = (encryptedData: Buffer): Buffer => {
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
};

export { encryptFileData, decryptFileData };
