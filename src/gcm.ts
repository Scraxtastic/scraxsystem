import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ivLength = 24;
const authTagLength = 16; // 16 bytes authentication tag is recommended for GCM

const encryptData = (data: Buffer, key: Buffer, iv: Buffer): { encryptedData: Buffer; authTag: Buffer } => {
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { encryptedData: encrypted, authTag: authTag };
};

const decryptData = (encryptedData: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer => {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const buffer = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return buffer;
  } catch (e) {
    // console.error("Error decrypting data", e);
    return null;
  }
};

const packageData = (iv: Buffer, encryptedData: Buffer, authTag: Buffer): Buffer => {
  return Buffer.concat([iv, encryptedData, authTag]);
};

const unpackageData = (dataPackage: Buffer): { iv: Buffer; encryptedData: Buffer; authTag: Buffer } => {
  const iv = dataPackage.subarray(0, ivLength);
  const authTag = dataPackage.subarray(dataPackage.length - authTagLength); // authTag is 16 bytes
  const encryptedData = dataPackage.subarray(ivLength, dataPackage.length - authTagLength);

  return { iv, encryptedData, authTag };
};

const encryptAndPackageData = (data: Buffer, key: Buffer, iv: Buffer = randomBytes(ivLength)): Buffer => {
  const { encryptedData, authTag } = encryptData(data, key, iv);
  return packageData(iv, encryptedData, authTag);
};

const unpackageAndDecryptData = (dataPackage: Buffer, key: Buffer): Buffer => {
  const { iv, encryptedData, authTag } = unpackageData(dataPackage);
  return decryptData(encryptedData, key, iv, authTag);
};

export { encryptAndPackageData, unpackageAndDecryptData };
