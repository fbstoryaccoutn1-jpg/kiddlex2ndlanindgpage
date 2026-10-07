const LEGACY_ORDER = ["deru","gyro","hemari","mari","million","nari","tank","zuberi"];
const RESERVED_SLUGS = new Set(["admin","api","assets","functions","404","favicon.ico","robots.txt","sitemap.xml"]);

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function authorized(context) {
  const expected = encodeURIComponent(context.env.SESSION_SECRET || context.env.ADMIN_PASSWORD || "");
  const cookie = context.request.headers.get("cookie") || "";
  return Boolean(expected) && cookie.split(";").some(v => v.trim() === "admin_session=" + expected);
}

function defaultItem(slug) {
  return {
    destination: "https://bb.urlxx341.com?utm_source=jack&utm_medium=" + slug.toUpperCase(),
    delay: 3000
  };
}

function normalizeData(input) {
  const out = {};
  if (input && typeof input === "object") {
    for (const [rawSlug, rawItem] of Object.entries(input)) {
      const slug = cleanSlug(rawSlug);
      if (!slug || RESERVED_SLUGS.has(slug) || !rawItem || typeof rawItem !== "object") continue;
      const destination = String(rawItem.destination || "").trim();
      const delay = Number(rawItem.delay);
      if (!/^https?:\/\//i.test(destination)) continue;
      out[slug] = {
        destination,
        delay: Number.isFinite(delay) && delay >= 0 && delay <= 60000 ? Math.round(delay) : 3000
      };
    }
  }
  return out;
}

function withLegacyDefaults(data) {
  const out = { ...normalizeData(data) };
  for (const slug of LEGACY_ORDER) {
    if (!out[slug]) out[slug] = defaultItem(slug);
  }
  return out;
}

async function gh(context) {
  const owner = context.env.GITHUB_OWNER;
  const repo = context.env.GITHUB_REPO;
  const branch = context.env.GITHUB_BRANCH || "main";
  const token = context.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) throw new Error("Server configuration is incomplete.");

  const url =
    "https://api.github.com/repos/" +
    encodeURIComponent(owner) + "/" +
    encodeURIComponent(repo) +
    "/contents/data/config.json?ref=" +
    encodeURIComponent(branch);

  const headers = {
    accept: "application/vnd.github+json",
    authorization: "Bearer " + token,
    "x-github-api-version": "2022-11-28",
    "user-agent": "kiddlex-landing-admin",
    "cache-control": "no-cache"
  };

  return { owner, repo, branch, url, headers };
}

function decodeBase64Utf8(content) {
  const raw = atob(String(content || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function readConfig(context) {
  const g = await gh(context);
  const r = await fetch(g.url + "&ts=" + Date.now(), { headers: g.headers });

  if (r.status === 404) return { data: {}, sha: null, g };
  if (!r.ok) throw new Error("Could not load saved data.");

  const j = await r.json();
  return {
    data: normalizeData(JSON.parse(decodeBase64Utf8(j.content) || "{}")),
    sha: j.sha,
    g
  };
}

async function writeConfig(g, sha, data, message) {
  const content = encodeBase64Utf8(JSON.stringify(normalizeData(data), null, 2) + "\n");
  const payload = { message, content, branch: g.branch };
  if (sha) payload.sha = sha;

  const r = await fetch(
    "https://api.github.com/repos/" +
      encodeURIComponent(g.owner) + "/" +
      encodeURIComponent(g.repo) +
      "/contents/data/config.json",
    {
      method: "PUT",
      headers: { ...g.headers, "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  if (!r.ok) throw new Error("Save failed.");
}

function rowsFrom(data) {
  const merged = withLegacyDefaults(data);
  const extras = Object.keys(merged)
    .filter(slug => !LEGACY_ORDER.includes(slug))
    .sort();

  return [...LEGACY_ORDER, ...extras].map(slug => ({
    slug,
    destination: merged[slug].destination,
    delay: merged[slug].delay
  }));
}

export async function onRequestGet(context) {
  if (!authorized(context)) return Response.json({ ok: false }, { status: 401 });

  try {
    const { data } = await readConfig(context);
    return Response.json(
      { ok: true, rows: rowsFrom(data) },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json({ ok: false, error: "Could not load saved data." }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  if (!authorized(context)) return Response.json({ ok: false }, { status: 401 });

  let body = {};
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const action = String(body.action || "upsert");

  try {
    const { data: savedData, sha, g } = await readConfig(context);
    const data = withLegacyDefaults(savedData);

    if (action === "delete") {
      const slug = cleanSlug(body.slug);
      if (!slug || RESERVED_SLUGS.has(slug)) {
        return Response.json({ ok: false, error: "Invalid slug." }, { status: 400 });
      }
      if (!data[slug]) {
        return Response.json({ ok: false, error: "Link was not found." }, { status: 404 });
      }

      delete data[slug];
      await writeConfig(g, sha, data, "Delete landing link");
      return Response.json({ ok: true, deleted: slug });
    }

    const slug = cleanSlug(body.slug);
    const originalSlug = cleanSlug(body.originalSlug || slug);
    const destination = String(body.destination || "").trim();
    const delay = Number(body.delay);

    if (!slug || RESERVED_SLUGS.has(slug)) {
      return Response.json({ ok: false, error: "Choose a valid slug." }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(destination)) {
      return Response.json({ ok: false, error: "Destination must start with http:// or https://." }, { status: 400 });
    }
    if (!Number.isFinite(delay) || delay < 0 || delay > 60000) {
      return Response.json({ ok: false, error: "Delay must be between 0 and 60 seconds." }, { status: 400 });
    }

    if (originalSlug !== slug) {
      if (data[slug]) {
        return Response.json({ ok: false, error: "This slug is already in use." }, { status: 409 });
      }
      if (data[originalSlug]) delete data[originalSlug];
    } else if (body.isNew && data[slug]) {
      return Response.json({ ok: false, error: "This slug is already in use." }, { status: 409 });
    }

    data[slug] = {
      destination,
      delay: Math.round(delay)
    };

    await writeConfig(g, sha, data, "Update landing links");
    return Response.json({ ok: true, slug });
  } catch {
    return Response.json({ ok: false, error: "Save failed." }, { status: 500 });
  }
}
