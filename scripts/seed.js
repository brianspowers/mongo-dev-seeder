const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./env');

const config = loadEnv();

function isContainerRunning(containerName) {
  const result = spawnSync('docker', ['ps', '--filter', `name=^/${containerName}$`, '--format', '{{.ID}}'], {
    encoding: 'utf-8',
  });
  return Boolean(result.stdout && result.stdout.trim());
}

function ensureContainerRunning() {
  if (!isContainerRunning(config.containerName)) {
    console.log(`\x1b[33m[INFO] Container '${config.containerName}' is not running. Starting via docker compose...\x1b[0m`);
    const up = spawnSync('docker', ['compose', 'up', '-d', 'mongodb'], {
      cwd: config.rootDir,
      stdio: 'inherit',
    });
    if (up.status !== 0) {
      console.error('\x1b[31m[ERROR] Failed to start local MongoDB container.\x1b[0m');
      process.exit(1);
    }
  }
}

function waitForMongoReady(maxAttempts = 30) {
  process.stdout.write('Waiting for MongoDB to be ready');
  for (let i = 0; i < maxAttempts; i++) {
    const pingArgs = ['exec', config.containerName, 'mongosh', '--quiet', '--eval', "db.adminCommand('ping')"];
    const ping = spawnSync('docker', pingArgs, { encoding: 'utf-8' });
    if (ping.status === 0 && ping.stdout && ping.stdout.includes('1')) {
      process.stdout.write(' [Ready!]\n\n');
      return true;
    }
    process.stdout.write('.');
    spawnSync('node', ['-e', 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)']);
  }
  process.stdout.write('\n');
  console.error('\x1b[31m[ERROR] Timed out waiting for MongoDB container to accept connections.\x1b[0m');
  return false;
}

function runSeed() {
  if (!fs.existsSync(config.dumpDir)) {
    console.error(`\x1b[31m[ERROR] Dump directory does not exist at: ${config.dumpDir}\x1b[0m`);
    console.error("Run 'npm run dump' first to pull from Atlas, or place a MongoDB dump folder inside ./dump\n");
    process.exit(1);
  }

  const dumpEntries = fs.readdirSync(config.dumpDir);
  if (dumpEntries.length === 0) {
    console.error(`\x1b[31m[ERROR] Dump directory is empty: ${config.dumpDir}\x1b[0m`);
    console.error("Run 'npm run dump' first to pull from Atlas, or place a MongoDB dump folder inside ./dump\n");
    process.exit(1);
  }

  console.log('\x1b[36m=== Seeding Local MongoDB Instance ===\x1b[0m');
  ensureContainerRunning();

  if (!waitForMongoReady()) {
    process.exit(1);
  }

  const restoreArgs = ['exec', config.containerName, 'mongorestore', '--drop'];

  if (config.username && config.password) {
    restoreArgs.push('-u', config.username, '-p', config.password, '--authenticationDatabase', 'admin');
  }

  // Handle db renaming if LOCAL_DB_NAME is specified
  if (config.localDbName) {
    const sourceDb = config.atlasDbName || (dumpEntries.length === 1 && fs.statSync(path.join(config.dumpDir, dumpEntries[0])).isDirectory() ? dumpEntries[0] : null);
    if (sourceDb) {
      console.log(`Mapping database: ${sourceDb} -> ${config.localDbName}`);
      restoreArgs.push(`--nsInclude=${sourceDb}.*`, `--nsFrom=${sourceDb}.*`, `--nsTo=${config.localDbName}.*`);
    } else {
      restoreArgs.push(`--nsInclude=*.${config.localDbName}`);
    }
  }

  // Forward extra user CLI arguments
  const extraArgs = process.argv.slice(2);
  if (extraArgs.length > 0) {
    restoreArgs.push(...extraArgs);
  }

  restoreArgs.push('/dump');

  console.log('Restoring dump into local MongoDB container...\n');
  const child = spawn('docker', restoreArgs, { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error(`\x1b[31mFailed to run mongorestore: ${err.message}\x1b[0m`);
    process.exit(1);
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n\x1b[32m[SUCCESS] Local database seeded successfully!\x1b[0m');
      console.log('\nConnection Information:');
      if (config.username && config.password) {
        console.log(`  URI  : mongodb://${config.username}:${config.password}@localhost:${config.localPort}/admin`);
      } else {
        console.log(`  URI  : mongodb://localhost:${config.localPort}`);
      }
      console.log(`  Port : ${config.localPort}`);
      console.log('\nUseful commands:');
      console.log('  npm run mongosh  - Open interactive MongoDB shell');
      console.log('  npm run reset    - Wipe and re-seed from scratch');
      console.log('  npm run down     - Stop container');
    } else {
      console.error(`\n\x1b[31m[FAILED] mongorestore exited with code ${code}.\x1b[0m`);
      process.exit(code);
    }
  });
}

runSeed();
