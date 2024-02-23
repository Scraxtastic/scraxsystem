import { randomBytes } from "crypto";
import { ensureKey } from "./fileManager";

ensureKey(randomBytes(32), "pi4b");
ensureKey(randomBytes(32), "pizero");
ensureKey(randomBytes(32), "pizero2");
ensureKey(randomBytes(32), "invader");
ensureKey(randomBytes(32), "pixel7");
ensureKey(randomBytes(32), "mi9");
ensureKey(randomBytes(32), "server");
