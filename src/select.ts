import {
  findDotEnvFiles, loadConfig, loadDotEnv, saveState,
} from './utils';
import { prompt } from './prompt';

const config = loadConfig();
const choices = findDotEnvFiles(config.searchPath, config.exclude);

const selectDotEnv = () => {
  const selection = prompt({
    message: 'Choose dotenv configuration',
    choices,
    selected: config.lastSelection,
  });

  if (selection !== null) {
    if (config.rememberLastSelection) {
      const selectedChoice = choices[selection];
      if (selectedChoice) {
        config.lastSelection = selectedChoice;
        saveState(config.lastSelection);
      }
    }
  } else {
    config.lastSelection = '';
  }
};

if (choices.length > 0) {
  if (choices.length !== 1 || config.lastSelection !== choices[0]) {
    selectDotEnv();
  }
  if (config.lastSelection) {
    loadDotEnv(config.lastSelection);
  }
}
