export async function onRequestPost(context) {
  let body = {};
  try { body = await context.request.json(); } catch {}
  if (!context.env.ADMIN_PASSWORD || body.password !== context.env.ADMIN_PASSWORD) {
    return Response.json({ ok:false, error:"Invalid password" }, { status:401 });
  }
  const token = encodeURIComponent(context.env.SESSION_SECRET || context.env.ADMIN_PASSWORD);
  return new Response(JSON.stringify({ ok:true }), {
    headers: {
      "content-type":"application/json",
      "set-cookie": `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
    }
  });
}
