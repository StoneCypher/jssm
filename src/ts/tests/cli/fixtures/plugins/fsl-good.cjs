module.exports = async function cli(argv) {
  process.stdout.write(`fsl-good received ${argv.length} args: ${argv.join(' ')}\n`);
  return 0;
};
module.exports.default = module.exports;
