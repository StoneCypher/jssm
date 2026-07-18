const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'models');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

console.log('Fetching DeBERTa-v3-small ONNX models from the phantom-models branch...');

try {
  // Fetch the phantom branch from origin
  execSync('git fetch origin phantom-models', { stdio: 'inherit' });
  
  // Checkout the assets/models directory from the phantom branch into the current worktree
  execSync('git checkout origin/phantom-models -- assets/models', { stdio: 'inherit' });

  console.log('\n\n✅ ONNX Models successfully synced from phantom-models branch!');
  console.log('You can now run `fsl pick --oracle=builtin` fully offline.');
} catch (err) {
  console.error('\n❌ Failed to fetch models from phantom branch. The branch might not be populated yet.');
  console.error(err.message);
  process.exit(1);
}
