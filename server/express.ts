// Local dev entry — run with: npm run coach
import { loadEnv } from "./loadEnv";
import app from "./app";

loadEnv();

const port = Number(process.env.PORT ?? 8787);
const server = app.listen(port, () => {
  console.log(`coach server on http://localhost:${port}`);
  console.log(`  routes: /api/health /api/coach /api/content/lesson /api/content/scenario`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nPort ${port} is already in use. Run: npm run stop\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
