import bundledConfig from "../data/config.json";

const CONFIG_FRESH_MS = 60000;
const CONFIG_RETRY_MS = 30000;
const CONFIG_TIMEOUT_MS = 3500;
const CONFIG_STALE_SECONDS = 604800;
let memoryConfig = null;
let refreshPromise = null;
let nextRetryAt = 0;

function validConfig(db) {
  return db !== null && typeof db === "object" && !Array.isArray(db) && Object.keys(db).length > 0;
}
function configCacheKey(request) {
  const url = new URL(request.url);
  url.pathname = "/__internal_bio_config_v2";
  url.search = "";
  return new Request(url.toString(), { method: "GET" });
}
async function readEdgeConfig(request) {
  if (typeof caches === "undefined" || !caches.default) return null;
  try {
    const hit = await caches.default.match(configCacheKey(request));
    if (!hit) return null;
    const entry = await hit.json();
    if (entry && validConfig(entry.config) && Number.isFinite(entry.fetchedAt)) return entry;
  } catch (error) {
    console.warn("[bio-config] cache_read_failed " + String(error));
  }
  return null;
}
async function saveEdgeConfig(request, entry) {
  if (typeof caches === "undefined" || !caches.default) return;
  try {
    await caches.default.put(configCacheKey(request),
      new Response(JSON.stringify(entry), {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=" + CONFIG_STALE_SECONDS }
      })
    );
  } catch (error) {
    console.warn("[bio-config] cache_write_failed " + String(error));
  }
}
async function fetchGitHubConfig(env) {
  if (!env.GITHUB_OWNER || !env.GITHUB_REPO) throw new Error("GitHub environment configuration is missing");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const branch = env.GITHUB_BRANCH || "main";
    const headers = { "Accept": "application/vnd.github+json", "User-Agent": "bio-pages-config", "Cache-Control": "no-cache" };
    if (env.GITHUB_TOKEN) headers.Authorization = "Bearer " + env.GITHUB_TOKEN;
    const apiPath = "/repos/" + encodeURIComponent(env.GITHUB_OWNER) + "/" + encodeURIComponent(env.GITHUB_REPO) + "/contents/data/config.json?ref=" + encodeURIComponent(branch) + "&t=" + Date.now();
    const response = await fetch("https://api.github.com" + apiPath, { headers, signal: controller.signal });
    if (!response.ok) throw new Error("GitHub returned HTTP " + response.status);
    const json = await response.json();
    const encoded = String(json.content || "").replace(/\s/g, "");
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const config = JSON.parse(new TextDecoder().decode(bytes));
    if (!validConfig(config)) throw new Error("Invalid GitHub config structure");
    return config;
  } finally {
    clearTimeout(timer);
  }
}
async function refreshConfig(env, request) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const config = await fetchGitHubConfig(env);
      const entry = { config, fetchedAt: Date.now() };
      memoryConfig = entry;
      nextRetryAt = 0;
      await saveEdgeConfig(request, entry);
      return entry;
    } catch (error) {
      nextRetryAt = Date.now() + CONFIG_RETRY_MS;
      console.error("[bio-config] github_refresh_failed repo=" + (env.GITHUB_REPO || "unknown") + " reason=" + String(error && error.message || error));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
async function loadConfigCached(env, request, context) {
  const now = Date.now();
  if (!memoryConfig) memoryConfig = await readEdgeConfig(request);
  if (memoryConfig && now - memoryConfig.fetchedAt < CONFIG_FRESH_MS) return memoryConfig.config;
  if (memoryConfig) {
    if (now >= nextRetryAt) {
      const update = refreshConfig(env, request);
      if (context && typeof context.waitUntil === "function") context.waitUntil(update);
      else await update;
    }
    return memoryConfig.config;
  }
  const fresh = await refreshConfig(env, request);
  if (fresh) return fresh.config;
  console.warn("[bio-config] using bundled build snapshot repo=" + (env.GITHUB_REPO || "unknown"));
  memoryConfig = { config: bundledConfig, fetchedAt: 0 };
  return memoryConfig.config;
}

const RESERVED_SLUGS = new Set(["admin","api","assets","functions","404","favicon.ico","robots.txt","sitemap.xml"]);

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function landingHtml(slug, destination, delay, desktopDestination) {
  const images = Array.from({ length: 18 }, (_, i) => "/assets/" + (i + 1) + ".webp");
  const desktopURL = desktopDestination ||
    ("https://www.google.com/?utm_source=jack&utm_medium=" + encodeURIComponent(slug.toUpperCase()));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-16BHTEV2QP"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-16BHTEV2QP');
  </script>

  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Please wait...</title>

  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .landing {
      width: 100%;
      max-width: 520px;
      padding: 12px;
      text-align: center;
    }
    .landing img {
      display: block;
      width: 100%;
      max-height: 90vh;
      object-fit: contain;
      margin: 0 auto;
    }
  </style>
</head>

<body>
  <main class="landing">
    <img id="randomImage" src="" alt="Loading">
  </main>

  <script>
    const desktopURL = ${JSON.stringify(desktopURL)};
    const mobileURL = ${JSON.stringify(destination)};
    const redirectDelay = ${Number(delay)};
    const images = ${JSON.stringify(images)};

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);

    if (!isMobile) {
      window.location.replace(desktopURL);
    } else {
      const randomIndex = Math.floor(Math.random() * images.length);
      document.getElementById("randomImage").src = images[randomIndex];

      setTimeout(function () {
        window.location.replace(mobileURL);
      }, redirectDelay);
    }
  </script>
</body>
</html>`;
}

export async function onRequest({ params, env, request, context }) {
  const slug = cleanSlug(params.slug);
  if (!slug || RESERVED_SLUGS.has(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const config = await loadConfigCached(env,request,context);
  const item = config[slug];

  if (!item || !item.destination) {
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" }
    });
  }

  const destination = String(item.destination);
  const rawDelay = Number(item.delay);
  const delay =
    Number.isFinite(rawDelay) && rawDelay >= 0 && rawDelay <= 60000
      ? rawDelay
      : 3000;

  const desktopDestination = item.desktopDestination ? String(item.desktopDestination) : "";

  return new Response(landingHtml(slug, destination, delay, desktopDestination), {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}
