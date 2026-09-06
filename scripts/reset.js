const { spawnSync } = require('child_process');
const path = require('path');
const { loadEnv } = require('./env');

const config = loadEnv();

console.log('\x1b[36m=== Resetting Local MongoDB Instance ===\x1b[0m');
console.log('Tearing down existing container and wiping volume data...');

const downResult = spawnSync('docker', ['compose', 'down', '-v'], {
  cwd: config.rootDir,
  stdio: 'inherit',
});

if (downResult.status !== 0) {
  console.error('\x1b[31m[ERROR] Failed to tear down existing containers.\x1b[0m');
  process.exit(1);
}

console.log('\nStarting fresh MongoDB container...');
const upResult = spawnSync('docker', ['compose', 'up', '-d', 'mongodb'], {
  cwd: config.rootDir,
  stdio: 'inherit',
});

if (upResult.status !== 0) {
  console.error('\x1b[31m[ERROR] Failed to launch fresh container.\x1b[0m');
  process.exit(1);
}

console.log('\nSeeding fresh database with dump data...');
const seedScript = path.join(__dirname, 'seed.js');
const seedResult = spawnSync('node', [seedScript, ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (seedResult.status === 0) {
  console.log('\n\x1b[32m[SUCCESS] Local MongoDB has been completely reset and re-seeded!\x1b[0m');
} else {
  console.error('\x1b[31m[ERROR] Reset encountered issues during seeding.\x1b[0m');
  process.exit(seedResult.status || 1);
}
