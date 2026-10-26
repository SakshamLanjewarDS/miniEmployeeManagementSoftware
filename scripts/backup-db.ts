import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";

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
  const shaFilePath = path.join(backupsDir, `${filename}.sha256`);

  console.log(`====================================================================`);
  console.log(`📦 100% DESIGN Studio OS — Audited Database Snapshot Engine`);
  console.log(`====================================================================`);
  console.log(`Target Database : ${dbConfig.database} @ ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Output Archive  : ${filePath}`);

  // Safeguard: Never pass database password via command-line arguments (visible in ps -ef)
  const args = [
    `--host=${dbConfig.host}`,
    `--port=${dbConfig.port}`,
    `--user=${dbConfig.user}`,
    `--single-transaction`,
    `--quick`,
    `--routines`,
    `--triggers`,
    `--default-character-set=utf8mb4`,
    dbConfig.database,
  ];

  // Securely pass password via MYSQL_PWD environment variable
  const spawnEnv = {
    ...process.env,
    MYSQL_PWD: dbConfig.password,
  };

  const dumpProc = spawn("mysqldump", args, {
    env: spawnEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const gzipStream = zlib.createGzip({ level: 9 });
  const writeStream = fs.createWriteStream(filePath);
  const hash = crypto.createHash("sha256");

  let stderr = "";
  dumpProc.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  dumpProc.on("error", (err) => {
    console.error(`❌ Failed to start mysqldump: ${err.message}`);
    console.error(`Please ensure mysqldump is installed in PATH.`);
    process.exit(1);
  });

  gzipStream.on("error", (err) => {
    console.error(`❌ Gzip compression failure: ${err.message}`);
    cleanupFailedBackup(filePath, shaFilePath);
    process.exit(1);
  });

  writeStream.on("error", (err) => {
    console.error(`❌ File write failure: ${err.message}`);
    cleanupFailedBackup(filePath, shaFilePath);
    process.exit(1);
  });

  dumpProc.stdout.on("data", (chunk) => {
    hash.update(chunk);
  });

  dumpProc.stdout.pipe(gzipStream).pipe(writeStream);

  dumpProc.on("close", (code) => {
    if (code !== 0) {
      console.error(`❌ mysqldump failed with exit code ${code}`);
      if (stderr) console.error(stderr);
      cleanupFailedBackup(filePath, shaFilePath);
      process.exit(code || 1);
    }

    writeStream.on("finish", () => {
      const stats = fs.statSync(filePath);
      const digest = hash.digest("hex");
      fs.writeFileSync(shaFilePath, `${digest}  ${filename}\n`, "utf8");

      console.log(`✅ Snapshot completed successfully!`);
      console.log(`   Archive Size : ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   SHA-256 Checksum : ${digest}`);
      console.log(`   Checksum File: ${shaFilePath}`);
      console.log(`====================================================================`);
    });
  });
}

function cleanupFailedBackup(filePath: string, shaFilePath: string) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(shaFilePath)) fs.unlinkSync(shaFilePath);
  } catch (_) {}
}

runBackup().catch((err) => {
  console.error("Backup fatal failure:", err);
  process.exit(1);
});
