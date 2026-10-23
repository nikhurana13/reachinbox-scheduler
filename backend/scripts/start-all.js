const { spawn } = require('child_process');

console.log('Starting API server and BullMQ worker concurrently...');

const server = spawn('node', ['dist/server.js'], { stdio: 'inherit' });
const worker = spawn('node', ['dist/worker.js'], { stdio: 'inherit' });

function shutdown(signal) {
  console.log(`Received ${signal}, stopping services...`);
  try { server.kill(signal); } catch {}
  try { worker.kill(signal); } catch {}
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`API server exited with code ${code}`);
    try { worker.kill('SIGTERM'); } catch {}
    process.exit(code);
  }
});

worker.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`BullMQ worker exited with code ${code}`);
  }
});
