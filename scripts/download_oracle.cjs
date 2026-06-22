const fs = require('fs');
const path = require('path');
const { pipeline, env } = require('@xenova/transformers');

// Configure transformers to save the model locally
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'models');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

env.localModelPath = ASSETS_DIR;
env.cacheDir = ASSETS_DIR;

console.log('Downloading and caching DeBERTa-v3-small (8-bit quantized) ONNX model...');
console.log('This will download approximately 44MB and save it to: ' + ASSETS_DIR);

async function downloadModel() {
  try {
    // This pipeline call triggers the download from Hugging Face if not present
    const classifier = await pipeline('zero-shot-classification', 'Xenova/deberta-v3-small-tasksource-nli', {
      quantized: true,
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          process.stdout.write(`\rDownloading ${progress.file}: ${Math.round(progress.progress)}%`);
        } else if (progress.status === 'done') {
          console.log(`\nFinished downloading ${progress.file}`);
        }
      }
    });

    console.log('\n\n✅ ONNX Model successfully downloaded and verified!');
    console.log('You can now run `fsl pick --oracle=builtin` fully offline.');
  } catch (err) {
    console.error('\n❌ Failed to download model:', err.message);
    process.exit(1);
  }
}

downloadModel();
