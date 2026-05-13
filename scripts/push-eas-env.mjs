import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const envLocalPath = join(root, ".env.local");

function parseEnv(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadEnvFiles() {
  const merged = {};
  if (existsSync(envPath)) {
    Object.assign(merged, parseEnv(readFileSync(envPath, "utf8")));
  }
  if (existsSync(envLocalPath)) {
    Object.assign(merged, parseEnv(readFileSync(envLocalPath, "utf8")));
  }
  return merged;
}

const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

if (!existsSync(envPath) && !existsSync(envLocalPath)) {
  console.error(
    `Missing env file. Create ${envPath} and/or ${envLocalPath} (see .env.example).`,
  );
  process.exit(1);
}

const env = loadEnvFiles();
for (const name of required) {
  if (!env[name] || env[name].includes("YOUR_")) {
    console.error(
      `Set ${name} in .env or .env.local to a real value (not a placeholder).`,
    );
    process.exit(1);
  }
}

const environments = ["production", "preview"];

for (const easEnv of environments) {
  for (const name of required) {
    const r = spawnSync(
      "eas",
      [
        "env:create",
        "--name",
        name,
        "--value",
        env[name],
        "--environment",
        easEnv,
        "--non-interactive",
        "--visibility",
        "sensitive",
        "--force",
      ],
      { cwd: root, stdio: "inherit" },
    );
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }
}

console.log(
  "EAS environment variables updated for: production, preview (both Supabase keys).",
);
