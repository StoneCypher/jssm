#!/usr/bin/env node
'use strict';

function parseFslArgs(argv, spec) {
  const positional = [];
  const flags = {};
  const shortMap = {};
  for (const [name, fs] of Object.entries(spec.flags)) {
    if (fs.short) shortMap[fs.short] = name;
  }
  const isBoolean = (name) => spec.flags[name]?.boolean === true;
  const flagType = (name) => {
    const fs = spec.flags[name];
    return fs.type ?? "string";
  };
  const coerce = (name, raw) => {
    const t = flagType(name);
    if (t === "number") {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        throw new Error(`flag --${name} requires a number, got: ${raw}`);
      }
      return n;
    }
    const fs = spec.flags[name];
    if (fs.enum && !fs.enum.includes(raw)) {
      throw new Error(`flag --${name} value '${raw}' not in: ${fs.enum.join(", ")}`);
    }
    return raw;
  };
  let i = 0;
  let positionalOnly = false;
  while (i < argv.length) {
    const a = argv[i];
    if (positionalOnly) {
      positional.push(a);
      i++;
      continue;
    }
    if (a === "--") {
      positionalOnly = true;
      i++;
      continue;
    }
    if (a === "-") {
      positional.push(a);
      i++;
      continue;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      const name = eq >= 0 ? a.slice(2, eq) : a.slice(2);
      if (!(name in spec.flags)) throw new Error(`unknown flag: --${name}`);
      if (isBoolean(name)) {
        flags[name] = true;
        i++;
      } else if (eq >= 0) {
        flags[name] = coerce(name, a.slice(eq + 1));
        i++;
      } else {
        if (i + 1 >= argv.length) throw new Error(`flag --${name} requires a value`);
        flags[name] = coerce(name, argv[i + 1]);
        i += 2;
      }
      continue;
    }
    if (a.startsWith("-") && a.length > 1) {
      const short = a[1];
      const name = shortMap[short];
      if (!name) throw new Error(`unknown flag: -${short}`);
      if (isBoolean(name)) {
        flags[name] = true;
        if (a.length > 2) throw new Error(`combined short flags not supported: ${a}`);
        i++;
      } else if (a.length > 2) {
        flags[name] = coerce(name, a.slice(2));
        i++;
      } else {
        if (i + 1 >= argv.length) throw new Error(`flag -${short} requires a value`);
        flags[name] = coerce(name, argv[i + 1]);
        i += 2;
      }
      continue;
    }
    positional.push(a);
    i++;
  }
  for (const [name, fs] of Object.entries(spec.flags)) {
    if (flags[name] === void 0 && fs.default !== void 0) {
      flags[name] = fs.default;
    }
  }
  const helpText = () => {
    const lines = [];
    lines.push("Usage:");
    lines.push("  " + spec.usage);
    lines.push("");
    lines.push("Options:");
    for (const [name, fs] of Object.entries(spec.flags)) {
      const short = fs.short ? `-${fs.short}, ` : "    ";
      const longPart = `--${name}`;
      const arg = fs.boolean ? "" : fs.enum ? ` ${fs.enum.join("|")}` : fs.type === "number" ? " N" : " VALUE";
      const defStr = fs.default !== void 0 ? ` (default: ${fs.default})` : "";
      lines.push(`  ${short}${longPart}${arg}${defStr}`);
    }
    return lines.join("\n");
  };
  return { positional, flags, helpText };
}

const getVersion = () => "5.148.2";
const SPEC = {
  flags: {
    help: { short: "h", boolean: true },
    version: { short: "V", boolean: true }
  },
  usage: "fsl-export-system-prompt [options]"
};
const writeStdout = (s) => {
  process.stdout.write(s);
};
const writeStderr = (s) => {
  process.stderr.write(s);
};
const printErr = (msg) => {
  writeStderr(`fsl-export-system-prompt: error: ${msg}
`);
};
const SYSTEM_PROMPT = `
# FSL v5 Agent System Prompt (llms.txt)

> **Context**: This document is intended to be served as an \`llms.txt\` file (as standardized by [llmstxt.org](https://llmstxt.org) and similar AI directories) to provide Large Language Models with a mathematically precise, up-to-date syntax guide for FSL (Finite State Language).

You are an expert developer in FSL (Finite State Language) v5, a domain-specific language for defining mathematically verifiable, finite state machines. Your primary goal is to generate idiomatic, structurally sound FSL v5 code.

## Core Concepts

1.  **Machines**: An FSL file defines a state machine. It contains metadata (like \`machine_name\`) and a set of state transitions.
2.  **States & Transitions**: FSL is built on transitions between states. States are automatically inferred from transitions, or can be explicitly declared.
3.  **Transition Types**:
    *   \`->\` (Legal transition)
    *   \`=>\` (Main transition)
    *   \`~>\` (Forced transition)
    *   \`<->\` (Bi-directional legal)
    *   \`<= >\` (Main left, legal right)
    *   \`<~>\` (Bi-directional forced)
4.  **Actions**: Transitions can be triggered by actions. E.g., \`A 'click' -> B;\`
5.  **Probabilities**: Transitions can carry probabilities. E.g., \`A -> 50% B;\`
6.  **Attributes**: Machines can have properties like \`machine_name\`, \`machine_author\`, \`machine_version\`.

## Syntax Guide

### Basic Machine
\`\`\`fsl
machine_name    : "Simple Traffic Light";
machine_author  : "John Doe";
machine_version : 1.0.0;

Red 'timer' => Green 'timer' => Yellow 'timer' => Red;
\`\`\`

### Actions and Multiple Targets
\`\`\`fsl
machine_name : "Vending Machine";

Off 'insert coin' -> Idle;
Idle 'select item' -> Dispensing;
Dispensing 'dispense' -> Off;
Idle 'cancel' -> Off;
\`\`\`

### Explicit State Declarations and Attributes
\`\`\`fsl
state Red : {
  background-color : red;
  text-color       : white;
};

state Green : {
  background-color : green;
};

Red -> Green;
\`\`\`

## Agent Directives
- **Do not hallucinate features**: FSL is a strict, finite state machine language. Do not attempt to use unbounded loops or syntax from general-purpose languages like Python or JavaScript.
- **Always output valid FSL**: Ensure statements end with semicolons (\`;\`).
- **Use single quotes for actions**: E.g., \`StateA 'action name' -> StateB;\`.

---
*Generated by the FSL v5 Toolchain*
`;
async function cli(argv) {
  let parsed;
  try {
    parsed = parseFslArgs(argv, SPEC);
  } catch (e) {
    printErr(e.message);
    return 1;
  }
  if (parsed.flags.help) {
    writeStdout(parsed.helpText() + "\n");
    return 0;
  }
  if (parsed.flags.version) {
    writeStdout("fsl-export-system-prompt " + getVersion() + "\n");
    return 0;
  }
  writeStdout(SYSTEM_PROMPT.trim() + "\n");
  return 0;
}

async function main() {
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exitCode = code;
}
void main();
