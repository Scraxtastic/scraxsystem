import fs from "fs";
import path from "path";
import { decryptFileData, encryptFileData } from "./cbc";
import { unpackageAndDecryptData } from "./gcm";

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
      const decrypted = decryptFileData(encrypted);
      return decrypted;
    }
  }
};

const findKey = (message: Buffer) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const encrypted = fs.readFileSync(filePath);
    const decrypted = decryptFileData(encrypted);
    const decryptedBuffer = unpackageAndDecryptData(message, decrypted);
    if (decryptedBuffer) {
      return decrypted;
    }
  }
  return null;
};

const createKey = (key: Buffer, name: string) => {
  const dir = path.join(__dirname, "../keys");
  ensureDir(dir);
  const filePath = path.join(dir, name);
  ensureFile(filePath);
  const encrypted = encryptFileData(key);
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

export { findKey, createKey, ensureDir, ensureFile, getKey, ensureKey };
