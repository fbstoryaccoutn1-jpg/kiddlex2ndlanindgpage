const RESERVED_SLUGS = new Set(["admin","api","assets","functions","404","favicon.ico","robots.txt","sitemap.xml"]);

function cleanSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function landingHtml(slug, destination, delay) {
  const images = Array.from({ length: 18 }, (_, i) => "/assets/" + (i + 1) + ".webp");
  const desktopURL =
    "https://www.google.com/?utm_source=jack&utm_medium=" +
    encodeURIComponent(slug.toUpperCase());

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

async function loadConfig(env) {
  if (!env.GITHUB_OWNER || !env.GITHUB_REPO) return {};

  const branch = env.GITHUB_BRANCH || "main";
  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "kiddlex-landing",
    "Cache-Control": "no-cache"
  };
  if (env.GITHUB_TOKEN) headers["Authorization"] = "Bearer " + env.GITHUB_TOKEN;

  try {
    const url =
      "https://api.github.com/repos/" +
      encodeURIComponent(env.GITHUB_OWNER) + "/" +
      encodeURIComponent(env.GITHUB_REPO) +
      "/contents/data/config.json?ref=" +
      encodeURIComponent(branch) +
      "&t=" + Date.now();

    const r = await fetch(url, { headers });
    if (!r.ok) return {};

    const j = await r.json();
    const raw = atob(String(j.content || "").replace(/\n/g, ""));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes) || "{}");
  } catch {
    return {};
  }
}

export async function onRequest({ params, env }) {
  const slug = cleanSlug(params.slug);
  if (!slug || RESERVED_SLUGS.has(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const config = await loadConfig(env);
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

  return new Response(landingHtml(slug, destination, delay), {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}
