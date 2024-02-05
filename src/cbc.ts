import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const key = Buffer.from("bi7kdNhA7R3ZsMkv5Ct5Ka0o+hDeDq8h4MzDUzEnZh8=", "base64");
export const iv = Buffer.from("oVtoejvQgwxp4h67oKQJ/w==", "base64");
const ivLength = 16;

const encryptFileData = (data: Buffer): Buffer => {
  return encryptData(data, key, iv);
};

const decryptFileData = (encryptedData: Buffer): Buffer => {
  return decryptData(encryptedData, key, iv);
};

const encryptData = (data: Buffer, key: Buffer, iv: Buffer): Buffer => {
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
};

const decryptData = (encryptedData: Buffer, key: Buffer, iv: Buffer): Buffer => {
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
};

const packageData = (iv: Buffer, encryptedData: Buffer): Buffer => {
  return Buffer.concat([iv, encryptedData]);
};

const unpackageData = (dataPackage: Buffer): { iv: Buffer; encryptedData: Buffer } => {
  const iv = dataPackage.subarray(0, ivLength);
  const encryptedData = dataPackage.subarray(ivLength, dataPackage.length);

  return { iv, encryptedData };
};

const encryptAndPackageData = (data: Buffer, key: Buffer, iv: Buffer = randomBytes(ivLength)): Buffer => {
  const encryptedData = encryptData(data, key, iv);
  return packageData(iv, encryptedData);
};

const unpackageAndDecryptData = (dataPackage: Buffer, key: Buffer): Buffer => {
  const { iv, encryptedData } = unpackageData(dataPackage);
  return decryptData(encryptedData, key, iv);
};

export {
  encryptFileData,
  decryptFileData,
  encryptData,
  decryptData,
  packageData,
  unpackageData,
  encryptAndPackageData,
  unpackageAndDecryptData,
};
