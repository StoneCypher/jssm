
const fs = require('fs');



const package       = JSON.parse(fs.readFileSync('./package.json')),
      spec_metrics  = JSON.parse(fs.readFileSync('./coverage/spec/metrics.json')),
      stoch_metrics = JSON.parse(fs.readFileSync('./coverage/stoch/metrics.json')),
      tot_count     = spec_metrics.tests.success + stoch_metrics.tests.success,
      run_count     = spec_metrics.tests.success + (stoch_metrics.tests.success * 100),

      warning       = fs.readFileSync('./src/md/generated-file-warning.txt').toString(),
      warning_wf    = warning.replaceAll('{{real_source}}', './src/md/readme_base.md'),
      warning_wd    = warning_wf.replaceAll('{{datetime}}', new Date().toLocaleString()),
      warning_wv    = warning_wd.replaceAll('{{build}}', package.version),

      readme_base   = fs.readFileSync('./src/md/README_base.md').toString(),
      readme_tests  = readme_base.replaceAll('{{test_count}}', tot_count.toLocaleString()),
      readme_runs   = readme_tests.replaceAll('{{run_count}}', run_count.toLocaleString()),
      readme_spec   = readme_runs.replaceAll('{{spec_count}}', spec_metrics.tests.success.toLocaleString()),
//    readme_specc  = readme_runs.replaceAll('{{spec_coverage}}', 'TODO'),
      readme_stoch  = readme_spec.replaceAll('{{stoch_count}}', stoch_metrics.tests.success.toLocaleString()),
//    readme_stochc = readme_spec.replaceAll('{{stoch_coverage}}', 'TODO'),
      readme_lines  = readme_stoch,
      readme_ratio  = readme_lines;



fs.writeFileSync('./README.md', warning_wv + readme_ratio);
