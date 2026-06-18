import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const app = require("./handler.bundle.cjs");

export default app;
