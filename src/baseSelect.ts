import {
  findDotEnvFiles, loadConfig, saveState,
} from './utils';
import { prompt } from './prompt';

export const baseSelect = (action: (dotenvPath: string) => void) => {
  const config = loadConfig();
  const choices = findDotEnvFiles(config.searchPath, config.exclude);

  const selectDotEnv = () => {
    const selection = prompt({
      message: 'Choose dotenv configuration',
      choices,
      selected: config.lastSelection,
    });

    if (selection !== null) {
      const selectedChoice = choices[selection];
      if (selectedChoice) {
        config.lastSelection = selectedChoice;
        if (config.rememberLastSelection) {
          saveState(config.lastSelection);
        }
      }
    } else {
      config.lastSelection = '';
      if (config.exitWhenNoSelection) {
        process.exit(0);
      }
    }
  };

  if (choices.length > 0) {
    if (choices.length !== 1 || config.lastSelection !== choices[0]) {
      selectDotEnv();
    }
    if (config.lastSelection) {
      action(config.lastSelection);
    }
  }
};
