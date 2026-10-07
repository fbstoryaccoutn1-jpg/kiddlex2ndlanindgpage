const ALLOWED = ["deru","gyro","hemari","mari","million","nari","tank","zuberi"];

function html(slug, destination, delay) {
  const images = Array.from({ length: 18 }, (_, i) => `/assets/${i + 1}.webp`);
  const desktopURL = `https://www.google.com/?utm_source=jack&utm_medium=${slug.toUpperCase()}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Please wait...</title><style>*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;height:100%;background:#fff}body{display:flex;align-items:center;justify-content:center;overflow:hidden}.landing{width:100%;max-width:520px;padding:12px;text-align:center}.landing img{display:block;width:100%;max-height:90vh;object-fit:contain;margin:0 auto}</style></head><body><main class="landing"><img id="randomImage" src="" alt="Loading"></main><script>const desktopURL=${JSON.stringify(desktopURL)};const mobileURL=${JSON.stringify(destination)};const delay=${Number(delay)};const images=${JSON.stringify(images)};const isMobile=/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);if(!isMobile){window.location.replace(desktopURL)}else{const randomIndex=Math.floor(Math.random()*images.length);document.getElementById("randomImage").src=images[randomIndex];setTimeout(()=>window.location.replace(mobileURL),delay)}</script></body></html>`;
}

async function loadConfig(env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || "main";
  if (!owner || !repo) return {};
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/config.json?ts=${Date.now()}`, { headers: { "cache-control":"no-cache" } });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

export async function onRequest(context) {
  const slug = String(context.params.slug || "").toLowerCase();
  if (!ALLOWED.includes(slug)) return new Response("Not found", { status: 404 });
  const cfg = await loadConfig(context.env);
  const item = cfg[slug] || {};
  const destination = item.destination || `https://bb.urlxx341.com?utm_source=jack&utm_medium=${slug.toUpperCase()}`;
  const delay = Number(item.delay ?? 3000);
  return new Response(html(slug, destination, delay), { headers: { "content-type":"text/html; charset=UTF-8", "cache-control":"no-store" } });
}
