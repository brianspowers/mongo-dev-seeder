const { spawn } = require('child_process');
const { loadEnv } = require('./env');

const config = loadEnv();

const args = ['exec', '-it', config.containerName, 'mongosh'];

if (config.username && config.password) {
  args.push('-u', config.username, '-p', config.password, '--authenticationDatabase', 'admin');
}

// Pass any query or database passed from CLI
const extraArgs = process.argv.slice(2);
if (extraArgs.length > 0) {
  args.push(...extraArgs);
}

const child = spawn('docker', args, { stdio: 'inherit' });

child.on('error', (err) => {
  console.error(`\x1b[31m[ERROR] Could not connect to container: ${err.message}\x1b[0m`);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code || 0);
});
