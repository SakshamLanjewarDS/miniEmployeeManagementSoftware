import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";

function parseDatabaseUrl(urlStr: string) {
  try {
    const parsed = new URL(urlStr);
    return {
      user: decodeURIComponent(parsed.username || "root"),
      password: decodeURIComponent(parsed.password || ""),
      host: parsed.hostname || "localhost",
      port: parsed.port || "3306",
      database: parsed.pathname.replace(/^\//, "").split("?")[0],
    };
  } catch (err) {
    throw new Error(`Failed to parse DATABASE_URL: ${err}`);
  }
}

async function runBackup() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found.");
    process.exit(1);
  }

  // Read .env if not already in process.env
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  const databaseUrl = process.env.DATABASE_URL || (match ? match[1] : "");

  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL not found in .env or environment.");
    process.exit(1);
  }

  const dbConfig = parseDatabaseUrl(databaseUrl);
  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .replace(/\..+/, "");
  const filename = `pre_deploy_backup_${timestamp}.sql.gz`;
  const filePath = path.join(backupsDir, filename);

  console.log(`📦 Starting pre-migration database snapshot...`);
  console.log(`Database: ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Output:   ${filePath}`);

  const args = [
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--user=${dbConfig.user}`,
    `--single-transaction`,
    `--quick`,
    `--routines`,
    `--triggers`,
    `--default-character-set=utf8mb4`,
  ];

  if (dbConfig.password) {
    args.push(`--password=${dbConfig.password}`);
  }

  args.push(dbConfig.database);

  const dumpProc = spawn("mysqldump", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const gzipStream = zlib.createGzip();
  const writeStream = fs.createWriteStream(filePath);

  let stderr = "";
  dumpProc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  dumpProc.stdout.pipe(gzipStream).pipe(writeStream);

  dumpProc.on("error", (err) => {
    console.error(`❌ Failed to start mysqldump: ${err.message}`);
    console.error(`Please ensure mysqldump is installed and accessible in PATH.`);
    process.exit(1);
  });

  dumpProc.on("close", (code) => {
    if (code !== 0) {
      console.error(`❌ mysqldump failed with exit code ${code}`);
      if (stderr) console.error(stderr);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      process.exit(code || 1);
    }

    const stats = fs.statSync(filePath);
    console.log(`✅ Snapshot completed successfully!`);
    console.log(`File: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
  });
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
