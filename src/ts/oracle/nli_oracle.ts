import { pipeline, env } from '@xenova/transformers';
import * as path from 'path';

// Define where the local models are stored
let ASSETS_DIR = '';

// Use a simple check to find the absolute path for Node vs Browser
if (typeof process !== 'undefined' && process.cwd) {
  ASSETS_DIR = path.join(process.cwd(), 'assets', 'models');
  env.localModelPath = ASSETS_DIR;
} else {
  env.localModelPath = '/assets/models';
}

// In the browser, we might want to allow remote models as a fallback if the local model path is broken
env.allowRemoteModels = typeof window !== 'undefined';

let _classifierPromise: Promise<any> | null = null;

async function getClassifier() {
  if (!_classifierPromise) {
    _classifierPromise = pipeline('zero-shot-classification', 'Xenova/deberta-v3-small-tasksource-nli', {
      quantized: true,
    });
  }
  return _classifierPromise;
}

/**
 * Evaluates whether a trace is valid according to a natural language rubric.
 * Returns true if the trace is valid, false if it contradicts the rubric.
 */
export async function evaluate_trace(trace: string[], rubric: string): Promise<boolean> {
  const classifier = await getClassifier();
  
  const premise = `The rules are: ${rubric}`;
  const hypothesis = `The system performs the following sequence of actions: ${trace.join(" -> ")}`;
  
  // We frame this as a zero-shot classification problem. Does the hypothesis entail "Valid" or "Invalid"?
  const result = await classifier(hypothesis, ["valid according to the rules", "invalid and contradicts the rules"]);
  
  // result.labels and result.scores are parallel arrays sorted by highest score
  const topLabel = result.labels[0];
  
  return topLabel === "valid according to the rules";
}
