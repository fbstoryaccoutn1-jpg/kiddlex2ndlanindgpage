const GH_API = "https://api.github.com";
const RESERVED = new Set(["admin","api","assets","functions","404","favicon.ico","robots.txt","sitemap.xml"]);

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function decodeBase64Utf8(b64) {
  const raw = atob(String(b64 || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function cleanUrl(value) {
  const s = String(value || "").trim();
  if (!/^https?:\/\//i.test(s)) throw new Error("Destination must start with http:// or https://.");
  return s;
}

function sanitizeLinks(input) {
  const out = {};
  const seenIds = new Set();

  for (const [rawSlug, rawItem] of Object.entries(input || {})) {
    const slug = cleanSlug(rawSlug);
    if (!slug) throw new Error("Slug is required.");
    if (RESERVED.has(slug)) throw new Error('The slug "' + slug + '" is reserved.');
    if (out[slug]) throw new Error('Duplicate slug "' + slug + '".');

    const linkId = String(rawItem?.linkId || "").trim();
    if (!linkId) throw new Error("Link identity is missing.");
    if (seenIds.has(linkId)) throw new Error("Duplicate link identity detected.");
    seenIds.add(linkId);

    const destination = cleanUrl(rawItem?.destination);
    const desktopDestination = rawItem?.desktopDestination ? cleanUrl(rawItem.desktopDestination) : "";
    const delay = Number(rawItem?.delay);
    if (!Number.isFinite(delay) || delay < 0 || delay > 60000) {
      throw new Error("Delay must be between 0 and 60 seconds.");
    }

    out[slug] = {
      linkId,
      destination,
      ...(desktopDestination ? { desktopDestination } : {}),
      delay: Math.round(delay)
    };
  }

  return out;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return Response.json({ error: "Server environment is incomplete." }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  let links;
  try {
    links = sanitizeLinks(body.links);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 409 });
  }

  const branch = env.GITHUB_BRANCH || "main";
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": "Bearer " + env.GITHUB_TOKEN,
    "Content-Type": "application/json",
    "User-Agent": "kiddlex-landing-admin",
    "X-GitHub-Api-Version": "2022-11-28",
    "Cache-Control": "no-cache"
  };

  const endpoint =
    GH_API + "/repos/" +
    encodeURIComponent(env.GITHUB_OWNER) + "/" +
    encodeURIComponent(env.GITHUB_REPO) +
    "/contents/data/config.json";

  const current = await fetch(
    endpoint + "?ref=" + encodeURIComponent(branch) + "&t=" + Date.now(),
    { headers }
  );

  if (!current.ok) {
    return Response.json({ error: "Could not load saved data." }, { status: 502 });
  }

  const meta = await current.json();
  const payload = {
    message: "Update landing links from admin panel",
    content: encodeBase64Utf8(JSON.stringify(links, null, 2) + "\n"),
    sha: meta.sha,
    branch
  };

  const update = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload)
  });

  if (!update.ok) {
    return Response.json({ error: "Save failed." }, { status: 502 });
  }

  const verify = await fetch(
    endpoint + "?ref=" + encodeURIComponent(branch) + "&verify=" + Date.now(),
    { headers }
  );

  if (!verify.ok) {
    return Response.json({ error: "Save verification failed." }, { status: 502 });
  }

  try {
    const verifyMeta = await verify.json();
    const saved = JSON.parse(decodeBase64Utf8(verifyMeta.content) || "{}");
    if (JSON.stringify(saved) !== JSON.stringify(links)) {
      return Response.json({ error: "Save verification failed." }, { status: 502 });
    }
  } catch {
    return Response.json({ error: "Save verification failed." }, { status: 502 });
  }

  return Response.json(
    { ok: true, verified: true, message: "Saved successfully.", slugs: Object.keys(links).sort() },
    { headers: { "cache-control": "no-store" } }
  );
}
