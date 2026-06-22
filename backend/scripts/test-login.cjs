const readline = require('node:readline');
const { Writable } = require('node:stream');

let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
  muted = true;
  const password = String(await ask('Password for suraj@abc.com: '));
  muted = false;
  process.stdout.write('\n');

  const login = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'suraj@abc.com', password }),
  });
  if (!login.ok) throw new Error(`Login failed (HTTP ${login.status})`);
  const session = await login.json();
  const incidents = await fetch('http://localhost:3000/api/incidents', {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  if (!incidents.ok) throw new Error(`Protected request failed (HTTP ${incidents.status})`);
  const records = await incidents.json();
  console.log(`Login successful as ${session.user.name} (${session.user.role}).`);
  console.log(`Protected incident API returned ${records.length} record(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => rl.close());
