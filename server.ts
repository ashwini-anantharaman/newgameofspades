import { loadEnv } from "./server/loadEnv";
import app from "./server/app";

// Vercel runs this module; local dev uses server/express.ts with listen().
loadEnv();

export default app;
