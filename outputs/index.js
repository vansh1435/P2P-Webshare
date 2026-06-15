const { spawn } = require("child_process");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  { name: "server", color: "\x1b[36m", args: ["run", "server"] },
  { name: "client", color: "\x1b[35m", args: ["run", "client"] }
];
const reset = "\x1b[0m";
let shuttingDown = false;

function prefixLines(name, color, stream) {
  let pending = "";

  stream.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        process.stdout.write(`${color}[${name}]${reset} ${line}\n`);
      }
    }
  });
}

function stopAll(children, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  setTimeout(() => process.exit(exitCode), 250);
}

const children = processes.map((entry) => {
  const child = spawn(npmCommand, entry.args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  prefixLines(entry.name, entry.color, child.stdout);
  prefixLines(entry.name, entry.color, child.stderr);

  child.on("exit", (code) => {
    if (!shuttingDown) {
      process.stdout.write(`${entry.color}[${entry.name}]${reset} exited with code ${code}\n`);
      stopAll(children, code || 1);
    }
  });

  return child;
});

process.on("SIGINT", () => stopAll(children, 0));
process.on("SIGTERM", () => stopAll(children, 0));
