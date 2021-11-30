import * as fs from 'fs';
import * as dotenv from 'dotenv';
import ignore from 'ignore';
import { TextEncoder } from 'util';
import * as path from 'path';
import './polyfills';
import chalk = require('chalk');

export type ScriptConfig = {
  searchPath?: string,
  exclude?: Array<string>
  rememberLastSelection?: boolean
  exitWhenNoSelection?: boolean
  defaultSelection?: string
};

export type ScriptConfigInternal = ScriptConfig & {
  lastSelection?: string,
};

export type Config = {
  searchPath?: string
  defaultSelection?: string
  exclude?: Array<string>
  rememberLastSelection?: boolean
  exitWhenNoSelection?: boolean
  scripts: {
    [key: string]: ScriptConfig
  }
};

export type ScriptState = {
  selection: string
};

export type State = {
  scripts: {
    [key: string]: ScriptState
  }
};

export const IS_WINDOWS = process.platform === 'win32';
const CONFIG_PATH = path.join(process.cwd(), 'dotenv-picker.json');
const STATE_PATH = path.join(process.cwd(), '.dotenv-picker-state.json');

export const print = (text: string): number => {
  const output = new TextEncoder().encode(text);
  process.stdout.write(output);
  return output.length;
};

const doesExist = (checkPath: string): boolean => {
  try {
    fs.statSync(checkPath);
    return true;
  } catch (err) {
    const anyError = err as any;
    return !anyError || anyError.code !== 'ENOENT';
  }
};
const normalizeSlashes = (pathStr: string): string => pathStr.replace(IS_WINDOWS ? /\\/g : '', '/');
const normalizeRelativePath = (pathStr: string): string => {
  if (pathStr.startsWith('/')) {
    return `.${pathStr}`;
  }
  if (!pathStr.startsWith('.')) {
    return `./${pathStr}`;
  }
  return pathStr;
};

export const findDotEnvFiles = (searchPath?: string, exclude?: Array<string>) => {
  if (searchPath && !doesExist(searchPath)) {
    print(`${chalk.bold.red('!')} ${chalk.bold.cyan(`'${searchPath}'`)} ${chalk.bold.white('does not exist')}\n`);
    return [];
  }
  const ig = ignore().add(exclude || []);
  const root = normalizeSlashes(process.cwd());
  const dir = normalizeSlashes(path.join(process.cwd(), searchPath || ''));
  const filesToReturn = new Array<string>();
  const walkDir = (currentPath: string) => {
    const files = fs.readdirSync(currentPath);
    for (const file of files) {
      const curFile = normalizeSlashes(path.join(currentPath, file));
      if (fs.statSync(curFile).isFile() && file.startsWith('.env')) {
        const result = curFile.replace(root, '');
        filesToReturn.push(normalizeRelativePath(result));
      } else if (fs.statSync(curFile).isDirectory()) {
        if (!ig.ignores(path.relative(dir, curFile))) {
          walkDir(curFile);
        }
      }
    }
  };
  walkDir(dir);
  return filesToReturn;
};

const isTsNodeCall = (): boolean => process.argv[1].includes('ts-node') && process.argv[1].endsWith('bin.js');

const getTsScriptName = (): string => {
  const [script] = process.argv.filter((arg) => arg.endsWith('.ts'));
  return script;
};

const getScriptNameField = (obj: { [key: string]: any }): string => {
  const root = process.cwd();
  let scriptPath = isTsNodeCall() ? getTsScriptName() : process.argv[1];
  if (scriptPath.endsWith('dotenv-picker.js')) {
    const [,,exe, param] = process.argv;
    if (exe === 'npx') {
      scriptPath = param || 'unknown';
    } else {
      scriptPath = exe;
    }
  }
  const name = normalizeRelativePath(normalizeSlashes(scriptPath.replace(root, '')));

  const [fieldName] = Object.keys(obj).filter((f) => path.join(root, f) === path.join(root, name));
  return fieldName || name;
};

const loadConfigFromFile = (): ScriptConfig => {
  if (doesExist(CONFIG_PATH)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as Config;
    const { scripts, ...baseConfig } = config;
    const scriptConfig = (scripts && scripts[getScriptNameField(scripts)]) || {};
    const defaults: ScriptConfig = {
      exitWhenNoSelection: true,
    };
    return { ...defaults, ...baseConfig, ...scriptConfig };
  }
  return {};
};

const loadState = (): State => {
  if (doesExist(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  }
  return { scripts: {} };
};

const loadScriptState = (fallback: string | undefined = ''): ScriptState => {
  const state = loadState();
  const { scripts } = state;
  return (scripts && scripts[getScriptNameField(scripts)]) || { selection: fallback };
};

const getDefaultSelection = (configFromFile: ScriptConfig): string | undefined => {
  if (!configFromFile.defaultSelection) {
    return undefined;
  }
  if (doesExist(configFromFile.defaultSelection)) {
    return configFromFile.defaultSelection;
  }
  const relative = path.join(configFromFile.searchPath || '', configFromFile.defaultSelection);
  if (doesExist(relative)) {
    return normalizeRelativePath(normalizeSlashes(relative));
  }
  return undefined;
};

export const loadConfig = (): ScriptConfigInternal => {
  const configFromFile = loadConfigFromFile();
  const lastSelectionFromFile = loadScriptState(getDefaultSelection(configFromFile));

  const interestingOpts = ['dotenv_config_path', 'dotenv_picker_remember_last'];
  const opts = Object.fromEntries(process.argv
    .map((item) => item.split('='))
    .filter((item) => interestingOpts.includes(item[0]))
    .map((item) => (item.length < 2 ? [...item, true] : item)));
  const { dotenv_config_path: lastSelectionArgv, dotenv_picker_remember_last: rememberLastSelection } = opts;
  const exclude = configFromFile.exclude || ['node_modules', '.git', '.idea', '.vscode'];
  const lastSelection = lastSelectionFromFile.selection || lastSelectionArgv;
  return {
    rememberLastSelection, ...configFromFile, lastSelection, exclude,
  };
};

export const saveState = (lastSelection: string) => {
  const state = loadState();
  const { scripts } = state;
  scripts[getScriptNameField(scripts)] = { selection: lastSelection };
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, '  '));
};

export const loadDotEnv = (dotEnvPath: string) => {
  print(`${chalk.bold.yellow('!')} Loading dotenv ${chalk.bold.cyan(dotEnvPath)}\n`);
  dotenv.config({
    path: dotEnvPath,
  });
};
