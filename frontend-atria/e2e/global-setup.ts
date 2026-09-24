import { execSync } from 'child_process';
import { join } from 'path';

export default async function globalSetup() {
  execSync('npm run test:e2e:seed', {
    cwd: join(__dirname, '../../backend-atria'),
    stdio: 'inherit',
    env: process.env,
  });
}
