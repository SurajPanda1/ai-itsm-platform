const readline = require('node:readline');
const { Writable } = require('node:stream');
const { hash } = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

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
  const email = String(await ask('User email: ')).trim().toLowerCase();
  muted = true;
  const password = String(await ask('New password (minimum 8 characters): '));
  muted = false;
  process.stdout.write('\n');
  if (password.length < 8) throw new Error('Password must contain at least 8 characters');

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error('No user exists with that email');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(password, 12), updatedAt: new Date() } });
    console.log('Password updated securely.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => rl.close());
