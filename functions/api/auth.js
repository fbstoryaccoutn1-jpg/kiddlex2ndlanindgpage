export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  if (!env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, error: "ADMIN_PASSWORD is missing" }, { status: 500 });
  }

  if (body.password !== env.ADMIN_PASSWORD) {
    return Response.json({ ok: false, error: "Wrong password" }, { status: 401 });
  }

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
