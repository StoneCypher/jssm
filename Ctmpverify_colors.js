const fs = require('fs');

// Read the file
const filePath = 'src\ts\jssm_viz_colors.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Extract the object content
const match = content.match(/const default_viz_colors = \{([\s\S]*?)\};/);
if (!match) {
  console.error('Could not extract default_viz_colors object');
  process.exit(1);
}

const objectStr = match[1];

// Extract key-value pairs
const keyValues = {};
const regex = /'([^']+)'\s*:\s*'([^']+)'/g;
let m;
while ((m = regex.exec(objectStr)) !== null) {
  keyValues[m[1]] = m[2];
}

// Expected keys from specification
const expectedKeys = [
  'graph_bg_color', 'fill_final', 'fill_terminal', 'fill_complete',
  'legal_1', 'legal_2', 'legal_solo',
  'legal_final_1', 'legal_final_2', 'legal_final_solo',
  'legal_terminal_1', 'legal_terminal_2', 'legal_terminal_solo',
  'legal_complete_1', 'legal_complete_2', 'legal_complete_solo',
  'main_1', 'main_2', 'main_solo',
  'main_final_1', 'main_final_2', 'main_final_solo',
  'main_terminal_1', 'main_terminal_2', 'main_terminal_solo',
  'main_complete_1', 'main_complete_2', 'main_complete_solo',
  'forced_1', 'forced_2', 'forced_solo',
  'forced_final_1', 'forced_final_2', 'forced_final_solo',
  'forced_terminal_1', 'forced_terminal_2', 'forced_terminal_solo',
  'forced_complete_1', 'forced_complete_2', 'forced_complete_solo',
  'text_final_1', 'text_final_2', 'text_final_solo',
  'text_terminal_1', 'text_terminal_2', 'text_terminal_solo',
  'text_complete_1', 'text_complete_2', 'text_complete_solo'
];

// Check all expected keys are present
const missingKeys = [];
const extraKeys = [];
expectedKeys.forEach(key => {
  if (!(key in keyValues)) {
    missingKeys.push(key);
  }
});

const actualKeys = Object.keys(keyValues);
actualKeys.forEach(key => {
  if (!expectedKeys.includes(key)) {
    extraKeys.push(key);
  }
});

console.log('Total keys found:', actualKeys.length);
console.log('Total keys expected:', expectedKeys.length);

if (missingKeys.length > 0) {
  console.log('\nMISSING KEYS:');
  missingKeys.forEach(k => console.log('  - ' + k));
}

if (extraKeys.length > 0) {
  console.log('\nEXTRA KEYS:');
  extraKeys.forEach(k => console.log('  + ' + k));
}

// Spot-check 8+ values
const spotCheckKeys = [
  'graph_bg_color',
  'fill_final',
  'legal_2',
  'legal_final_solo',
  'legal_terminal_2',
  'main_solo',
  'forced_complete_2',
  'text_terminal_solo'
];

console.log('\nSPOT-CHECK VALUES:');
spotCheckKeys.forEach(key => {
  if (key in keyValues) {
    console.log(`  ${key}: ${keyValues[key]}`);
  } else {
    console.log(`  ${key}: MISSING`);
  }
});

console.log('\nAll keys match:', missingKeys.length === 0 && extraKeys.length === 0);
