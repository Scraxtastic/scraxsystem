import { randomBytes } from "crypto";
import { ensureKey } from "./fileManager";

ensureKey(randomBytes(32), "pi4b");
ensureKey(randomBytes(32), "pizero");
ensureKey(randomBytes(32), "invader");
ensureKey(randomBytes(32), "pixel7");

let keys = [];
for (let i = 0; i < 20; i++) {
  keys.push(randomBytes(32).toString("base64"));
}
console.log("Keys:", keys);
