const SLUGS = ["deru","gyro","hemari","mari","million","nari","tank","zuberi"];

function authorized(context) {
  const expected = encodeURIComponent(context.env.SESSION_SECRET || context.env.ADMIN_PASSWORD || "");
  const cookie = context.request.headers.get("cookie") || "";
  return expected && cookie.split(";").some(v => v.trim() === `admin_session=${expected}`);
}

function defaults(slug) {
  return {
    slug,
    destination: `https://bb.urlxx341.com?utm_source=jack&utm_medium=${slug.toUpperCase()}`,
    delay: 3000
  };
}

export async function onRequestGet(context) {
  if (!authorized(context)) return Response.json({ ok:false }, { status:401 });
  const rows = [];
  for (const slug of SLUGS) {
    let item = defaults(slug);
    if (context.env.LANDING_CONFIG) {
      const saved = await context.env.LANDING_CONFIG.get(`slug:${slug}`, "json");
      if (saved) item = { ...item, ...saved, slug };
    }
    rows.push(item);
  }
  return Response.json({ ok:true, rows });
}

export async function onRequestPost(context) {
  if (!authorized(context)) return Response.json({ ok:false }, { status:401 });
  if (!context.env.LANDING_CONFIG) {
    return Response.json({ ok:false, error:"LANDING_CONFIG KV binding is missing" }, { status:500 });
  }

  let body = {};
  try { body = await context.request.json(); } catch {}
  const slug = String(body.slug || "").toLowerCase();
  const destination = String(body.destination || "").trim();
  const delay = Number(body.delay);

  if (!SLUGS.includes(slug)) return Response.json({ ok:false, error:"Invalid slug" }, { status:400 });
  if (!/^https?:\/\//i.test(destination)) return Response.json({ ok:false, error:"Destination must start with http:// or https://" }, { status:400 });
  if (!Number.isFinite(delay) || delay < 0 || delay > 60000) return Response.json({ ok:false, error:"Delay must be 0-60000 ms" }, { status:400 });

  await context.env.LANDING_CONFIG.put(`slug:${slug}`, JSON.stringify({ destination, delay: Math.round(delay) }));
  return Response.json({ ok:true });
}
