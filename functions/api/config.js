const GH_API = "https://api.github.com";

function decodeBase64Utf8(b64) {
  const raw = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function onRequestGet({ env }) {
  if (!env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return Response.json({ error: "Server configuration is incomplete." }, { status: 500 });
  }

  const branch = env.GITHUB_BRANCH || "main";
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "kiddlex-landing-admin",
    "Cache-Control": "no-cache"
  };
  if (env.GITHUB_TOKEN) headers["Authorization"] = "Bearer " + env.GITHUB_TOKEN;

  const url =
    GH_API + "/repos/" +
    encodeURIComponent(env.GITHUB_OWNER) + "/" +
    encodeURIComponent(env.GITHUB_REPO) +
    "/contents/data/config.json?ref=" +
    encodeURIComponent(branch) +
    "&t=" + Date.now();

  const r = await fetch(url, { headers });
  if (!r.ok) {
    return Response.json({ error: "Could not load saved data." }, { status: 502 });
  }

  try {
    const d = await r.json();
    const config = JSON.parse(decodeBase64Utf8(d.content) || "{}");
    return Response.json({ links: config }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Saved data is invalid." }, { status: 502 });
  }
}
