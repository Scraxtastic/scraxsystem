import fs from "fs";
import path from "path";
import {
  decryptFileData as decryptFileDataCBC,
  encryptFileData as encryptFileDataCBC,
  unpackageAndDecryptData as unpackageAndDecryptDataCBC,
} from "./cbc";
import { unpackageAndDecryptData as unpackageAndDecryptDataGCM } from "./gcm";

const ensureFile = (filePath: string) => {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }
};

const ensureDir = (folderPath: string) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
};

const getKey = (name: string) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.includes(name)) {
      const filePath = path.join(dir, file);
      const encrypted = fs.readFileSync(filePath);
      const decrypted = decryptFileDataCBC(encrypted);
      return decrypted;
    }
  }
};

const findKeyGCM = (message: Buffer) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const encrypted = fs.readFileSync(filePath);
    //File was encrypted with CBC
    const decrypted = decryptFileDataCBC(encrypted);
    //Message is encrypted with GCM
    const decryptedBuffer = unpackageAndDecryptDataGCM(message, decrypted);
    if (decryptedBuffer) {
      return decrypted;
    }
  }
  return null;
};

const findKeyCBC = (message: Buffer) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const encrypted = fs.readFileSync(filePath);
    const decrypted = decryptFileDataCBC(encrypted);
    try {
      const decryptedBuffer = unpackageAndDecryptDataCBC(message, decrypted);
      if (decryptedBuffer) {
        return decrypted;
      }
    } catch (e) {
      console.log("FileManager:", "No key found");
    }
  }
  return null;
};

const createKey = (key: Buffer, name: string) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const filePath = path.join(dir, name);
  ensureFile(filePath);
  console.log("FileManager:", "Creating key", name, key.toString("base64"));
  const encrypted = encryptFileDataCBC(key);
  fs.writeFileSync(filePath, encrypted);
};

const ensureKey = (key: Buffer, name: string) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const filePath = path.join(dir, name);
  if (!fs.existsSync(filePath)) {
    createKey(key, name);
  }
};

export { findKeyGCM, findKeyCBC, createKey, ensureDir, ensureFile, getKey, ensureKey };
