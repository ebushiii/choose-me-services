// Resolve a preview URL for the pushed branch and write it to $GITHUB_OUTPUT.
// If Vercel creds are present (site hosted on Vercel, possibly a private repo),
// wait for the branch's Vercel preview deployment. Otherwise fall back to
// raw.githack (works for public repos on GitHub Pages).
import fs from "node:fs";

const BRANCH = process.env.BRANCH;
const REPO = process.env.GITHUB_REPOSITORY;
const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID;

const githack = () => `https://raw.githack.com/${REPO}/${BRANCH}/index.html`;

async function vercelPreview() {
  const q = new URLSearchParams({ projectId, limit: "30" });
  if (teamId) q.set("teamId", teamId);
  const url = `https://api.vercel.com/v6/deployments?${q}`;
  const deadline = Date.now() + 150000;
  let last = null;
  while (Date.now() < deadline) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      const dep = (data.deployments || []).find(
        (d) => (d.meta || {}).githubCommitRef === BRANCH
      );
      if (dep) {
        last = dep.url;
        const state = dep.readyState || dep.state;
        if (state === "READY") return `https://${dep.url}`;
        if (state === "ERROR" || state === "CANCELED") return null;
        // BLOCKED = deployment protection; the URL still resolves once bypassed,
        // so return it rather than spinning.
        if (state === "BLOCKED") return `https://${dep.url}`;
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return last ? `https://${last}` : null;
}

let preview = null;
if (token && projectId) {
  try {
    preview = await vercelPreview();
  } catch {
    /* fall through */
  }
}
if (!preview) preview = githack();

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `preview_url=${preview}\n`);
}
console.log(preview);
