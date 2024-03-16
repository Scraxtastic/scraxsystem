// import { sendMessage } from "./mods/ollamaMod";

// For testing
// require("./server");
require("./client/webClient");



// import CryptoJS from "crypto-js";

// const crypto = require('crypto');

// // Generate a pair of public and private keys
// const key1 = crypto.subtle.generateKey({ type: 'oct', size: 256 }, (error, key) => {
//   if (error) {
//     console.error('Error generating key:', error);
//     return;
//   }
//   const publicKey = key.getPublicKey();
//   const privateKey = key.getPrivateKey();
//   // Use the public and private keys to encrypt and decrypt messages
// });

// // ```typescript
// const message = 'Hello, world!';
// const encryptedMessage = CryptoJS.AES.encrypt(message, privateKey).toString();
// // Send the encrypted message to the other party for decryption
// // ```
// // To decrypt the message on the other end, you can use the public key:
// // ```typescript
// const decryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, publicKey).toString();
// // ```
// // 5. Exchange the keys securely:
// // Finally, you'll need to exchange the public and private keys securely between the parties involved in the
// // communication. You can use a secure channel such as HTTPS or an end-to-end encrypted messaging app to exchange the
// // keys.
// // 6. Use CryptoJS for key management:
// // To manage the keys securely, you can use CryptoJS's key management features. For example, you can use the
// // `CryptoJS.key` module to generate and manage keys securely:
// // ```typescript
// const keyManagement = new CryptoJS.key();
// // Generate a new pair of public and private keys
// const newKey = keyManagement.generateKey({ type: 'oct', size: 256 });
// // Save the new keys to a secure storage
// keyManagement.save(newKey);
// // ```