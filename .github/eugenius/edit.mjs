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
  "Return your edit by calling the submit_edited_files tool — include ONLY the files you " +
  "actually changed, each with its complete new contents.";

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
    // Force structured output via a tool — guarantees a valid { files } object
    // and no stray prose (this model rejects assistant prefill).
    tools: [
      {
        name: "submit_edited_files",
        description: "Submit the edited website files (only the ones you changed).",
        input_schema: {
          type: "object",
          properties: {
            files: {
              type: "object",
              description: "Map of filename → the file's full new contents.",
              additionalProperties: { type: "string" },
            },
          },
          required: ["files"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_edited_files" },
    messages: [{ role: "user", content: userMsg }],
  }),
});

if (!res.ok) {
  console.error("anthropic error", res.status, (await res.text()).slice(0, 400));
  process.exit(1);
}
const data = await res.json();
// Structured output: pull the forced tool call's `files` argument.
const toolUse = (data.content || []).find(
  (b) => b.type === "tool_use" && b.name === "submit_edited_files"
);
if (!toolUse || !toolUse.input || typeof toolUse.input.files !== "object") {
  console.error(
    "model did not return files. stop_reason:",
    data.stop_reason,
    "content:",
    JSON.stringify(data.content || []).slice(0, 300)
  );
  process.exit(1);
}
const files = toolUse.input.files;
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
