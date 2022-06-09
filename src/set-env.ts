import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { baseSelect } from './baseSelect';

const setEnv = (dotEnvPath: string): void => {
  const result = dotenv.config({
    path: dotEnvPath,
  });

  const cmd = process.argv.slice(2).join(' ');
  const { APPDATA, PATH } = process.env;
  execSync(cmd, { stdio: 'inherit', env: { ...result.parsed, APPDATA, PATH } });
};

baseSelect(setEnv);
