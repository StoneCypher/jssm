import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pickPlugin from './subcommands/pick/plugin';

yargs(hideBin(process.argv))
  .command(pickPlugin)
  .demandCommand(1, 'You must provide a valid subcommand.')
  .help()
  .alias('h', 'help')
  .alias('v', 'version')
  .argv;
