// hash.js
import bcrypt from "bcryptjs";

const password = "Aceh@Admin2026!";
const hash = await bcrypt.hash(password, 10);
console.log(hash);
