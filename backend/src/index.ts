import { createServer } from "node:http";

import { createApp } from "@/app";
import { loadConfig } from "@/config/env";
import { createPrismaClient } from "@/db/client";
import { createLogger } from "@/lib/logger";

function loadEnvironment(): void {
  try {
    process.loadEnvFile();
  } catch {
    // .env is optional; deployment environments provide variables directly.
  }
}

loadEnvironment();

const config = loadConfig();
const logger = createLogger(config);
const prisma = createPrismaClient(config.databaseUrl);

const app = createApp({
  config,
  logger,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
});

const server = createServer(app);

server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, "cistem api listening");
});

let isShuttingDown = false;

function shutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "shutting down");

  const forceExit = setTimeout(() => {
    logger.error("graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((error) => {
    void (async () => {
      if (error) {
        logger.error({ err: error }, "error while closing the http server");
      }
      await prisma.$disconnect();
      clearTimeout(forceExit);
      process.exit(error ? 1 : 0);
    })();
  });
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  shutdown("SIGINT");
});
