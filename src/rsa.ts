import { generateKeyPairSync, privateDecrypt, publicEncrypt, constants } from "crypto";
import fs from "fs";

function generateRSAKeys() {
  const key = generateKeyPairSync("rsa", {
    modulusLength: 512,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase: "your-secure-passphrase",
    },
  });
  console.log("key keys:", Object.keys(key));
  const { privateKey, publicKey } = key;

  return { privateKey, publicKey };
}

function encryptWithPublicKey(publicKey: string, message: string) {
  const buffer = Buffer.from(message, "utf8");
  const encrypted = publicEncrypt(publicKey, buffer);
  return encrypted.toString("base64");
}

function decryptWithPrivateKey(privateKey: string, encryptedMessage: string) {
  const buffer = Buffer.from(encryptedMessage, "base64");
  const decrypted = privateDecrypt(
    {
      key: privateKey,
      passphrase: "your-secure-passphrase",
      padding: constants.RSA_PKCS1_OAEP_PADDING,
    },
    buffer
  );
  return decrypted.toString("utf8");
}

const encryptMessage = (publicKey: string, message: string, keysize: number) => {
  const parts = [];
  const subArrayLength = keysize / 8 - constants.RSA_PKCS1_OAEP_PADDING;
  console.log(constants.RSA_PKCS1_OAEP_PADDING);
  const buffer = Buffer.from(message, "utf8");
  for (let i = 0; i < buffer.length; i += keysize) {
    const currentBuffer = buffer.subarray(i, i + subArrayLength);
    console.log(currentBuffer.length);
    const encrypted = publicEncrypt(publicKey, currentBuffer);
    const currentPart = encrypted.toString("base64");
    parts.push(currentPart);
  }
  return Buffer.from(JSON.stringify(parts)).toString("base64");
};

const decryptMessage = (privateKey: string, encryptedMessage: string) => {
  const parts = JSON.parse(Buffer.from(encryptedMessage, "base64").toString("utf8"));
  const decryptedParts = [];
  for (let i = 0; i < parts.length; i++) {
    const decrypted = decryptWithPrivateKey(privateKey, parts[i]);
    decryptedParts.push(decrypted);
  }
  return decryptedParts.join("");
};

function main() {
  console.time("generateRSAKeys");
  const { privateKey, publicKey } = generateRSAKeys();
  console.timeEnd("generateRSAKeys");

  //   const message = fs.readFileSync("./package.json", "utf8");
  let message = "";
  for (let i = 0; i < 5; i++) {
    message += "1234567890";
  }
  // console.log('Original Message:', message);

  console.time("encryptWithPublicKey");
  const encryptedMessage = encryptMessage(publicKey, message, 4096);
  //   const encryptedMessage = encryptWithPublicKey(publicKey, message);
  // console.log('Encrypted Message:', encryptedMessage);
  console.timeEnd("encryptWithPublicKey");

  console.time("decryptWithPrivateKey");
  const decryptedMessage = decryptMessage(privateKey, encryptedMessage);
  console.log("Decrypted Message:", decryptedMessage);
  console.timeEnd("decryptWithPrivateKey");

  // console.log("Keys: ", privateKey, publicKey);
}

main();
