import mock = require('mock-fs');
import { findDotEnvFiles } from '../src/utils';

beforeEach(() => {
  mock({
    '.env': '',
    '.not.env': '',
    'h1.1': {
      '.env.h1.1': '',
      'h2.1': {
        '.env.h2.1': '',
      },
    },
    'h1.2': {
      '.env.h1.2': '',
    },
  });
});

afterEach(() => {
  mock.restore();
});

it('Checks if all .env files were found', () => {
  const found = findDotEnvFiles('./');
  expect(found).toStrictEqual([
    './.env',
    './h1.1/.env.h1.1',
    './h1.1/h2.1/.env.h2.1',
    './h1.2/.env.h1.2',
  ]);
});

it('Checks if exclusion works', () => {
  const found = findDotEnvFiles('./', ['/h1.1/h2.1', 'h1.2']);
  expect(found).toStrictEqual([
    './.env',
    './h1.1/.env.h1.1',
  ]);
});

it('Checks if search path is used', () => {
  const found = findDotEnvFiles('./h1.1');
  expect(found).toStrictEqual([
    './h1.1/.env.h1.1',
    './h1.1/h2.1/.env.h2.1',
  ]);
});
