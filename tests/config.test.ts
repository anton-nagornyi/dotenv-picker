import mock = require('mock-fs');
import { loadConfig } from '../src/utils';

afterEach(() => {
  mock.restore();
});

describe('Loading settings from the process.argv', () => {
  const { argv } = process;

  afterEach(() => {
    process.argv = argv;
  });

  it('Recognizes dotenv_config_path as lastSelection', () => {
    process.argv = [...argv, 'dotenv_config_path=.env.cool'];
    const config = loadConfig();
    expect(config.lastSelection).toBe('.env.cool');
  });

  it('Recognizes dotenv_picker_remember_last as rememberLastSelection', () => {
    process.argv = [...argv, 'dotenv_picker_remember_last'];
    const config = loadConfig();
    expect(config.rememberLastSelection).toBe(true);
  });
});

describe('Load config from both argv and dotenv-picker-state.json', () => {
  const { argv } = process;

  afterEach(() => {
    process.argv = argv;
  });

  beforeEach(() => {
    mock({
      '.dotenv-picker-state.json': JSON.stringify({
        scripts: {
          './node_modules/jest/bin/jest.js': {
            selection: './tests/data/hierarchy/.env',
          },
          './node_modules/jest-worker/build/workers/processChild.js': {
            selection: './tests/data/hierarchy/.env',
          },
        },
      }),
    });
  });
  //
  it('Checks that statements in dotenv-picker-state.json has priority over the argv', () => {
    process.argv = [...argv, 'dotenv_config_path=.env.cool'];
    const config = loadConfig();
    expect(config.lastSelection).toBe('./tests/data/hierarchy/.env');
  });
});

describe('Loading dotenv-picker.json config', () => {
  const { argv } = process;

  afterEach(() => {
    process.argv = argv;
  });

  it('Loads dotenv-picker.json correctly', () => {
    mock({
      'dotenv-picker.json': JSON.stringify({
        scripts: {
          './node_modules/jest/bin/jest.js': {
            searchPath: './tests/data/hierarchy',
            exclude: ['some1', 'some2'],
            rememberLastSelection: true,
          },
          './node_modules/jest-worker/build/workers/processChild.js': {
            searchPath: './tests/data/hierarchy',
            exclude: ['some1', 'some2'],
            rememberLastSelection: true,
          },
        },
      }),
    });
    const config = loadConfig();
    expect(config.lastSelection).toBe(undefined);
    expect(config.searchPath).toBe('./tests/data/hierarchy');
    expect(config.exclude).toStrictEqual(['some1', 'some2']);
    expect(config.rememberLastSelection).toBe(true);
  });

  it('Checks that statements in dotenv-picker.json has priority over the argv', () => {
    mock({
      'dotenv-picker.json': JSON.stringify({
        scripts: {
          './node_modules/jest/bin/jest.js': {
            rememberLastSelection: false,
          },
          './node_modules/jest-worker/build/workers/processChild.js': {
            rememberLastSelection: false,
          },
        },
      }),
    });
    process.argv = [...argv, 'dotenv_picker_remember_last'];
    const config = loadConfig();
    expect(config.rememberLastSelection).toBe(false);
  });
});
