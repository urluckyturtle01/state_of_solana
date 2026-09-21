#!/usr/bin/env node
/** Local dev: PORT env or first free port from 3000. PM2 bare metal uses :8137 via restart-bare-metal-app.sh */
const net = require("net");
const { spawn } = require("child_process");
const path = require("path");

function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

async function pickPort(start) {
  for (let p = start; p < start + 50; p++) {
    if (await portFree(p)) return p;
  }
  throw new Error(`No free port in ${start}–${start + 49}`);
}

async function main() {
  const start = Number(process.env.PORT) || 3000;
  const port = process.env.PORT ? start : await pickPort(3000);
  process.env.PORT = String(port);

  require(path.join(__dirname, "..", "show-ip.js"));

  const nextBin = path.join(__dirname, "..", "node_modules", ".bin", "next");
  const child = spawn(nextBin, ["dev", "--hostname", "0.0.0.0", "-p", String(port)], {
    stdio: "inherit",
    env: process.env,
    cwd: path.join(__dirname, ".."),
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
