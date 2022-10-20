import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { baseSelect } from './baseSelect';

const cmdSubstitude = (s: string, vars: { [key: string]: string }) => s.replace(/(\\*)(\$([_a-z0-9]+)|\${([_a-z0-9]+)})/ig, (_, escape, varExpression, variable, bracedVariable) => {
  if (!(escape.length % 2)) {
    return escape.substring(Math.ceil(escape.length / 2)) + (vars[variable || bracedVariable] || '');
  }
  return escape.substring(1) + varExpression;
});

const setEnv = (dotEnvPath: string): void => {
  const result = dotenv.config({
    path: dotEnvPath,
  });

  const cmd = cmdSubstitude(process.argv.slice(2).join(' '), result.parsed || {});
  const { APPDATA, PATH } = process.env;
  execSync(cmd, { stdio: 'inherit', env: { ...result.parsed, APPDATA, PATH } });
};

baseSelect(setEnv);
