#!/usr/bin/env node
/**
 * Root dev runner — starts PostgreSQL (best effort), the backend API, and the Vite
 * frontend in one command. No additional dependency; kills the whole tree on exit.
 *
 *   npm run dev
 */
import { spawn, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

function log(message) {
  process.stdout.write(`\x1b[36m[cistem]\x1b[0m ${message}\n`);
}

function isPortOpen(port, timeoutMs) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const attempt = () => {
      const socket = createConnection({ host: "127.0.0.1", port }, () => {
        socket.end();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) resolve(false);
        else setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function composeUp(useSudo) {
  const args = ["compose", "up", "-d", "postgres"];
  return useSudo
    ? spawnSync("sudo", ["-n", "docker", ...args], { cwd: rootDir, stdio: "inherit" })
    : spawnSync("docker", args, { cwd: rootDir, stdio: "inherit" });
}

async function ensureDatabase() {
  if (await isPortOpen(5432, 750)) {
    log("PostgreSQL is already running on :5432.");
    return;
  }

  log("PostgreSQL is not reachable — starting it with docker compose…");
  let result = composeUp(false);

  if (result.error || result.status !== 0) {
    result = composeUp(true);
  }

  if (result.error || result.status !== 0) {
    log("Could not start PostgreSQL automatically. Run: sudo docker compose up -d postgres");
    return;
  }

  const isUp = await isPortOpen(5432, 30_000);
  log(
    isUp
      ? "PostgreSQL is up."
      : "PostgreSQL is still starting; /readyz will be unavailable until it is ready.",
  );
}

async function assertDevPortsFree() {
  const busyPorts = [];
  if (await isPortOpen(4000, 250)) busyPorts.push(4000);
  if (await isPortOpen(5173, 250)) busyPorts.push(5173);

  if (busyPorts.length === 0) return;

  log(`Port ${busyPorts.join(" and ")} already in use — Cistem may already be running.`);
  log("Stop the existing instance (Ctrl+C in its terminal), then run `npm run dev` again.");
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function terminate(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = code;

  for (const { child } of children) terminate(child);

  const hardExit = setTimeout(() => process.exit(process.exitCode ?? 0), 3_000);
  hardExit.unref();
}

function start(name, args) {
  const child = spawn("npm", args, {
    cwd: rootDir,
    stdio: "inherit",
    detached: !isWindows,
    shell: isWindows,
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
  });

  children.push({ name, child });

  child.on("error", (error) => {
    log(`${name} failed to start: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    log(`${name} exited (${signal ?? code}). Shutting everything down.`);
    shutdown(code ?? 1);
  });

  log(`started ${name}`);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

await ensureDatabase();
await assertDevPortsFree();

log("Backend  → http://localhost:4000  (/healthz, /readyz)");
log("Frontend → http://localhost:5173  (open this)");

start("backend", ["--prefix", "backend", "run", "dev"]);
start("frontend", ["--prefix", "frontend", "run", "dev"]);
