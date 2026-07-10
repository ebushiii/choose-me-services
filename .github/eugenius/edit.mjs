// Eugenius AI editor — applies a plain-English change request to the static
// HTML files in this repo. Runs inside the GitHub Action; writes files in place.
// The workflow commits/pushes + reports back. Exits non-zero if it can't produce
// a valid edit (so the pipeline marks the request "failed" and never shows a
// broken preview).
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
const REQUEST = (process.env.REQUEST_TEXT || "").trim();
const MODEL = "claude-opus-4-8";

if (!KEY) { console.error("ANTHROPIC_API_KEY missing"); process.exit(1); }
if (!REQUEST) { console.error("REQUEST_TEXT missing"); process.exit(1); }

// Only these files may be edited (no arbitrary path writes).
const EDITABLE = fs.readdirSync(".").filter((f) => f.endsWith(".html"));
if (EDITABLE.length === 0) { console.error("no .html files"); process.exit(1); }

const current = Object.fromEntries(EDITABLE.map((f) => [f, fs.readFileSync(f, "utf8")]));

const system =
  "You are a careful web developer editing a small static website (plain HTML/CSS). " +
  "Apply ONLY the change the client asks for. Preserve everything else exactly — structure, " +
  "styling, scripts, and any content not mentioned. Keep it valid HTML. Do not add comments, " +
  "placeholders, tracking, or external resources that weren't already there. " +
  'Respond with ONLY a JSON object of the form {"files": {"<filename>": "<full new file contents>"}}, ' +
  "including ONLY the files you actually changed. Begin your reply immediately with the JSON — " +
  "no reasoning, no prose, no markdown fences before or after.";

const userMsg =
  `Change requested by the client:\n"""${REQUEST}"""\n\n` +
  `Current files (edit only what's needed):\n\n` +
  EDITABLE.map((f) => `===== ${f} =====\n${current[f]}`).join("\n\n");

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 32000,
    system,
    // Prefill the assistant turn so the reply is forced to be JSON (the model
    // otherwise sometimes prepends an explanation, which breaks parsing).
    messages: [
      { role: "user", content: userMsg },
      { role: "assistant", content: '{"files":' },
    ],
  }),
});

if (!res.ok) {
  console.error("anthropic error", res.status, (await res.text()).slice(0, 400));
  process.exit(1);
}
const data = await res.json();
const completion = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
// We prefilled '{"files":', so the reply continues the JSON object.
let raw = ('{"files":' + completion).replace(/```(?:json)?/gi, "").trim();

// Parse, falling back to the outermost balanced object if there's trailing text.
function parseLoose(s) {
  try { return JSON.parse(s); } catch {}
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; } }
    }
  }
  return null;
}

const parsed = parseLoose(raw);
if (!parsed) {
  console.error("could not parse model JSON. First 300 chars:", raw.slice(0, 300));
  process.exit(1);
}
const files = parsed.files || {};
const names = Object.keys(files);
if (names.length === 0) { console.error("model returned no file changes"); process.exit(1); }

let wrote = 0;
for (const name of names) {
  if (!EDITABLE.includes(name)) { console.error("refusing to write unknown file:", name); continue; }
  const content = files[name];
  if (typeof content !== "string" || content.length < 30 || !/<\/?[a-z]/i.test(content)) {
    console.error("skipping invalid content for", name); continue;
  }
  fs.writeFileSync(name, content);
  wrote++;
  console.log("edited", name);
}
if (wrote === 0) { console.error("no valid edits applied"); process.exit(1); }
console.log(`done: ${wrote} file(s) edited`);
