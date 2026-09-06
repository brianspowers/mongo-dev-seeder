const { spawn } = require('child_process');
const fs = require('fs');
const { loadEnv } = require('./env');

const config = loadEnv();

if (!config.atlasUri) {
  console.error('\x1b[31m[ERROR] ATLAS_URI is not set in your .env file.\x1b[0m');
  console.error('Please configure your MongoDB Atlas connection string in .env before running dump:');
  console.error('  ATLAS_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"\n');
  process.exit(1);
}

if (!fs.existsSync(config.dumpDir)) {
  fs.mkdirSync(config.dumpDir, { recursive: true });
}

console.log('\x1b[36m=== MongoDB Atlas Dump ===\x1b[0m');
console.log(`Using Docker Image : ${config.mongoImage}`);
console.log(`Target Dump Folder : ${config.dumpDir}`);
if (config.atlasDbName) {
  console.log(`Database filter    : ${config.atlasDbName}`);
} else {
  console.log(`Database filter    : (All databases)`);
}
console.log('Connecting to Atlas and initiating dump...\n');

const dockerArgs = [
  'run',
  '--rm',
  '-v',
  `${config.dumpDir}:/dump`,
  config.mongoImage,
  'mongodump',
  `--uri=${config.atlasUri}`,
  '--out=/dump',
];

if (config.atlasDbName) {
  dockerArgs.push(`--db=${config.atlasDbName}`);
}

// Forward any additional user arguments (e.g. --gzip, --excludeCollection, etc.)
const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  dockerArgs.push(...extraArgs);
}

const child = spawn('docker', dockerArgs, { stdio: 'inherit' });

child.on('error', (err) => {
  console.error(`\x1b[31mFailed to start Docker process: ${err.message}\x1b[0m`);
  process.exit(1);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n\x1b[32m[SUCCESS] MongoDB Atlas dump completed successfully!\x1b[0m');
    console.log(`Dump files saved to: ${config.dumpDir}`);
    console.log('\nNext steps:');
    console.log('  1. Start local MongoDB : npm run up');
    console.log('  2. Seed local instance : npm run seed');
  } else {
    console.error(`\n\x1b[31m[FAILED] mongodump exited with code ${code}.\x1b[0m`);
    process.exit(code);
  }
});
