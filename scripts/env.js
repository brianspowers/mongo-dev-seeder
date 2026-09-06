const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const dumpDir = path.join(rootDir, 'dump');

function loadEnv() {
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(envPath);
      } catch (err) {
        // Fallback manual parsing if loadEnvFile encounters format issues
        parseEnvFile(envPath);
      }
    } else {
      parseEnvFile(envPath);
    }
  } else {
    console.warn('\x1b[33m[WARN] No .env file found. Using default environment configuration.\x1b[0m');
    console.warn('\x1b[33m[INFO] Copy .env.example to .env to configure Atlas URI and credentials.\x1b[0m\n');
  }

  return {
    rootDir,
    dumpDir,
    atlasUri: process.env.ATLAS_URI || '',
    atlasDbName: process.env.ATLAS_DB_NAME || '',
    localDbName: process.env.LOCAL_DB_NAME || '',
    mongoImage: process.env.MONGO_IMAGE || 'mongo:7.0',
    containerName: process.env.LOCAL_MONGO_CONTAINER_NAME || 'mongodb-local',
    localPort: process.env.LOCAL_MONGO_PORT || '27017',
    username: process.env.LOCAL_MONGO_USERNAME || '',
    password: process.env.LOCAL_MONGO_PASSWORD || '',
    expressPort: process.env.MONGO_EXPRESS_PORT || '8081',
  };
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

module.exports = {
  loadEnv,
};
