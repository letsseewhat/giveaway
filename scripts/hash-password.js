'use strict';
const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

(async () => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const password = await rl.question('New admin password (minimum 14 characters): ', { hideEchoBack: true });
    if (password.length < 14) throw new Error('Password must be at least 14 characters.');
    console.log(`\nADMIN_PASSWORD_HASH=${await bcrypt.hash(password, 12)}`);
    console.log('Copy the hash into your backend host secret settings. Do not commit it.');
  } finally { rl.close(); }
})().catch((error) => { console.error(error.message); process.exit(1); });
