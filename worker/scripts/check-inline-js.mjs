// The page embeds a client-side script that lives inside a TypeScript template
// literal. Backslash escapes are consumed by the template literal, so a stray
// apostrophe inside a single-quoted JS string ships as a SyntaxError and kills
// every button on the page silently. This parses the script exactly as the
// browser would, and fails the build if it is not valid JavaScript.
import { readFile } from "node:fs/promises";

const src = await readFile(new URL("../src/page.ts", import.meta.url), "utf8");

const start = src.indexOf("const JS = `");
if (start === -1) {
  console.error("check-inline-js: could not find the JS template literal");
  process.exit(1);
}
const from = start + "const JS = `".length;
const end = src.indexOf("`;", from);
const raw = src.slice(from, end);

// Evaluate the template literal the way JS does, then parse the result.
let code;
try {
  code = new Function("return `" + raw + "`")();
} catch (e) {
  console.error("check-inline-js: the template literal itself is invalid:", e.message);
  process.exit(1);
}

try {
  new Function(code);
} catch (e) {
  console.error("check-inline-js: inline client script is not valid JS:", e.message);
  const m = /position (\d+)/.exec(e.stack ?? "");
  if (m) console.error("near:", code.slice(Math.max(0, m[1] - 90), Number(m[1]) + 90));
  process.exit(1);
}

console.log(`check-inline-js: OK (${code.length} bytes parsed)`);
