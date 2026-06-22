import fs from 'fs';
import readline from 'readline';
import { exec } from 'child_process';
import { sm } from '../../jssm';
import { find_differentiating_trace } from '../../jssm_pick';
import type { CommandModule } from 'yargs';

interface PickOptions {
  files: (string | number)[];
  steer?: string;
}

export const pickPlugin: CommandModule<{}, PickOptions> = {
  command: '$0 <files...>', // default command
  describe: 'Interactively disambiguate between multiple FSL candidate machines',
  builder: (yargs) => {
    return yargs
      .positional('files', {
        describe: 'Paths to candidate .fsl files',
        type: 'array',
        demandOption: true
      })
      .option('steer', {
        describe: 'Path to an agent script to automatically evaluate traces (Agent Oracle Mode)',
        type: 'string',
        requiresArg: true
      });
  },
  handler: async (argv) => {
    const filePaths = argv.files.map(String);
    if (filePaths.length < 2) {
      console.error("Error: You must provide at least two candidate .fsl files to disambiguate.");
      process.exit(1);
    }

    const candidates = filePaths.map(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        return sm(content);
      } catch (e: any) {
        console.error(`Failed to parse ${filePath}: ${e.message}`);
        process.exit(1);
      }
    });

    let remainingCandidates = [...candidates];
    let remainingFiles = [...filePaths];

    while (remainingCandidates.length > 1) {
      const result = find_differentiating_trace(remainingCandidates);
      
      if (!result) {
        console.log("No behavioral differences found among remaining candidates.");
        break;
      }

      const traceStr = result.trace.join(" -> ");
      
      let isTraceValid = false;

      if (argv.steer) {
        // Agent Oracle Mode
        console.log(`[Agent Oracle Mode] Evaluating trace: ${traceStr}`);
        try {
          const stdout = await new Promise<string>((resolve, reject) => {
            exec(`${argv.steer} "${traceStr}"`, (error, stdout, stderr) => {
              if (error) reject(error);
              else resolve(stdout.trim());
            });
          });
          isTraceValid = stdout.toLowerCase() === 'y' || stdout.toLowerCase() === 'yes';
          console.log(`[Oracle] Result: ${isTraceValid ? 'Accepted' : 'Rejected'}`);
        } catch (e: any) {
          console.error(`Agent script failed: ${e.message}`);
          process.exit(1);
        }
      } else {
        // Human-in-the-loop Mode
        console.log(`\nCandidate divergence found!`);
        console.log(`Trace: ${traceStr}`);
        console.log(`Candidate A (${remainingFiles[result.machine_a_index]}) accepts this trace.`);
        console.log(`Candidate B (${remainingFiles[result.machine_b_index]}) rejects this trace.`);
        
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>(resolve => rl.question(`Is this sequence of actions valid? (y/n): `, resolve));
        rl.close();
        
        isTraceValid = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
      }

      // Prune candidate list
      // For a full implementation we would actually simulate the trace on ALL machines and partition the list.
      // Since this is MVP and we only compare A and B, we drop the incorrect one.
      if (isTraceValid) {
        // Machine A was correct
        console.log(`Dropping candidate: ${remainingFiles[result.machine_b_index]}`);
        remainingCandidates.splice(result.machine_b_index, 1);
        remainingFiles.splice(result.machine_b_index, 1);
      } else {
        // Machine B was correct (it correctly rejected it)
        console.log(`Dropping candidate: ${remainingFiles[result.machine_a_index]}`);
        remainingCandidates.splice(result.machine_a_index, 1);
        remainingFiles.splice(result.machine_a_index, 1);
      }
    }

    console.log(`\nDisambiguation complete!`);
    console.log(`Winning candidate: ${remainingFiles[0]}`);
  }
};

export default pickPlugin;
