import 'dotenv/config';
import { initPool, query, closePool } from './index.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node src/db/seed-admin.js user@example.com');
  process.exit(1);
}

const run = async () => {
  await initPool();

  const { rows: [user] } = await query(
    'SELECT id FROM users WHERE email = :email FETCH FIRST 1 ROWS ONLY',
    { email: email.toLowerCase().trim() }
  );

  if (!user) {
    console.error(`No user found with email: ${email}`);
    console.error('Sign up first at /signup, then run this script.');
    await closePool();
    process.exit(1);
  }

  await query(
    'UPDATE user_roles SET role = :role WHERE user_id = :userId',
    { role: 'admin', userId: user.id }
  );

  console.log(`✓ ${email} has been promoted to admin.`);
  await closePool();
};

run().catch(async (err) => {
  console.error(err.message);
  await closePool();
  process.exit(1);
});
