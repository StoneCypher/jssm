module.exports = async function cli(argv) {
  process.stdout.write('about to exit\n');
  process.exit(7);   // VIOLATES the plugin contract; tests dispatcher safety
};
module.exports.default = module.exports;
