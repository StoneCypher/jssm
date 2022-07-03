
const fs = require('fs'),
      xj = require('xml2js');

const wt = JSON.parse( fs.readFileSync('./coverage/cloc/report_wt.json') ),
      nt = JSON.parse( fs.readFileSync('./coverage/cloc/report_nt.json') );

const lines = nt['TypeScript'].code;  // TODO add peg once cloc supports it



function get_coverage_pct(coverage) {

  const items = Number(coverage.statements)        + Number(coverage.conditionals)        + Number(coverage.methods),
        cover = Number(coverage.coveredstatements) + Number(coverage.coveredconditionals) + Number(coverage.coveredmethods);

  return ((cover / items) * 100).toFixed(1);

}




async function bulk() {

  const spec_xml   = fs.readFileSync('./coverage/spec/clover.xml').toString(),
        stoch_xml  = fs.readFileSync('./coverage/stoch/clover.xml').toString(),
        spec_json  = await xj.parseStringPromise(spec_xml),
        stoch_json = await xj.parseStringPromise(stoch_xml);



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
        readme_specc  = readme_spec.replaceAll('{{spec_coverage}}', get_coverage_pct(spec_json.coverage.project[0].metrics[0]['$'])),
        readme_stoch  = readme_specc.replaceAll('{{stoch_count}}', stoch_metrics.tests.success.toLocaleString()),
        readme_stochc = readme_stoch.replaceAll('{{stoch_coverage}}', get_coverage_pct(stoch_json.coverage.project[0].metrics[0]['$'])),
        readme_lines  = readme_stochc.replaceAll('{{line_count}}', lines.toLocaleString()),
        readme_ratio  = readme_lines.replaceAll('{{line_test_ratio}}', (tot_count / lines).toFixed(1)),
        readme_rratio = readme_ratio.replaceAll('{{line_run_ratio}}', (run_count / lines).toFixed(1));

  fs.writeFileSync('./README.md', warning_wv + readme_rratio);

}

bulk();
