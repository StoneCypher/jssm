
const fs = require('fs');



const package      = JSON.parse(fs.readFileSync('./package.json')),
      spec_metrics = JSON.parse(fs.readFileSync('./coverage/spec/metrics.json')),

      warning      = fs.readFileSync('./src/md/generated-file-warning.txt').toString(),
      warning_wf   = warning.replaceAll('{{real_source}}', './src/md/readme_base.md'),
      warning_wd   = warning_wf.replaceAll('{{datetime}}', new Date().toLocaleString()),
      warning_wv   = warning_wd.replaceAll('{{build}}', package.version),

      readme_base  = fs.readFileSync('./src/md/README_base.md').toString(),
      readme_wtc   = readme_base.replaceAll('{{test_count}}', spec_metrics.tests.success.toLocaleString());



fs.writeFileSync('./README.md', warning_wv + readme_wtc);
