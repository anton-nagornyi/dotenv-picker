import * as fs from 'fs';
import { Buffer } from 'buffer';
import chalk = require('chalk');
import { IS_WINDOWS, print } from './utils';

const showCursor = (show: boolean) => {
  if (show) {
    process.stderr.write('\x1B[?25h');
  } else {
    process.stderr.write('\x1B[?25l');
  }
};
const onClose = (wasRaw: boolean, fd: number) => {
  showCursor(true);
  process.stdout.cursorTo(0, process.stdout.rows);
  process.stdin.setRawMode(wasRaw);
  fs.closeSync(fd);
};

const renderChoice = (text: string, selected: boolean): number => {
  const output = `${selected ? '❯' : ' '} ${text}\n`;
  return print(selected ? chalk.cyan(output) : chalk.white(output));
};

const renderChoices = (choices: ReadonlyArray<string>, selectedIndex: number) => {
  const { rows } = process.stdout;
  const maxVisible = rows - 2;
  const renderIndex = Math.max(selectedIndex - maxVisible + 1, 0);
  const choicesToRender = choices.slice(renderIndex, renderIndex + maxVisible);
  const renderSelectedIndex = selectedIndex - maxVisible + 1 < 0 ? selectedIndex : choicesToRender.length - 1;

  process.stdout.clearScreenDown();
  choicesToRender.forEach((choice, index) => renderChoice(choice, index === renderSelectedIndex));
  process.stdout.moveCursor(0, -choicesToRender.length);
};

export const prompt = (question: { message: string, choices: string[], selected?: string }): number | null => {
  const { message, choices, selected } = question;
  const fd = IS_WINDOWS ? fs.openSync('\\\\.\\con', 'rs') : fs.openSync('/dev/tty', 'rs');

  const wasRaw = process.stdin.isRaw;
  if (!wasRaw) {
    process.stdin.setRawMode(true);
  }

  let character; let
    read;

  const navigation = IS_WINDOWS ? {
    up: {
      key: 'w',
      name: 'W',
    },
    down: {
      key: 's',
      name: 'S',
    },
  } : {
    up: {
      key: '\u001b[A',
      name: 'Up',
    },
    down: {
      key: '\u001b[B',
      name: 'Down arrows',
    },
  };

  print(`${chalk.bold.yellow('?')} ${chalk.bold.white(message)}: `);
  print(`${chalk.gray(`(Use ${navigation.up.name} and ${navigation.down.name} keys to navigate)`)}\n`);
  let selectedIndex = Math.max(choices.indexOf(selected || ''), 0);

  renderChoices(choices, selectedIndex);

  const ctrlKeyLength = navigation.up.key.length;
  const buf = Buffer.alloc(5);

  showCursor(false);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      read = fs.readSync(fd, buf, 0, 5, null);

      if (read === 1 && buf[0] === 13) {
        onClose(wasRaw, fd);
        return selectedIndex;
      }

      // received a control sequence
      if (read === ctrlKeyLength) {
        const check = buf.toString().substr(0, ctrlKeyLength);
        switch (check) {
          case navigation.up.key:
            selectedIndex = Math.max(selectedIndex - 1, 0);
            renderChoices(choices, selectedIndex);
            break;
          case navigation.down.key:
            selectedIndex = Math.min(selectedIndex + 1, choices.length - 1);
            renderChoices(choices, selectedIndex);
            break;
          default:
        }
      }

      character = buf[read - 1];

      if (character === 3) {
        onClose(wasRaw, fd);
        process.stdout.write('^C\n');
        print(`${chalk.bold.yellow('!')} ${chalk.bold.white('Nothing was selected')}\n`);
        return null;
      }
    } catch (e) {
      if ((e as any).code === 'EAGAIN') { // 'resource temporarily unavailable'
        // Happens on OS X 10.8.3 (not Windows 7!), if there's no
        // stdin input - typically when invoking a script without any
        // input (for interactive stdin input).
        // If you were to just continue, you'd create a tight loop.
        onClose(wasRaw, fd);
        print(`${chalk.bold.red('ERROR:')} ${chalk.bold.white('interactive stdin input not supported')}\n`);
        return null;
      }
      if ((e as any).code === 'EOF') {
        // Happens on Windows 7, but not OS X 10.8.3:
        // simply signals the end of *piped* stdin input.
        break;
      }
      onClose(wasRaw, fd);
      // eslint-disable-next-line no-console
      console.error(e);
      return null;
    }
  }
  return null;
};
