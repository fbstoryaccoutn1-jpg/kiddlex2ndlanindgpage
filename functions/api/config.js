const SLUGS=["deru","gyro","hemari","mari","million","nari","tank","zuberi"];

function authorized(context){
  const expected=encodeURIComponent(context.env.SESSION_SECRET||context.env.ADMIN_PASSWORD||"");
  const cookie=context.request.headers.get("cookie")||"";
  return expected && cookie.split(";").some(v=>v.trim()===`admin_session=${expected}`);
}

function defaults(slug){
  return {slug,destination:`https://bb.urlxx341.com?utm_source=jack&utm_medium=${slug.toUpperCase()}`,delay:3000};
}

async function gh(context){
  const owner=context.env.GITHUB_OWNER, repo=context.env.GITHUB_REPO, branch=context.env.GITHUB_BRANCH||"main", token=context.env.GITHUB_TOKEN;
  if(!owner||!repo||!token) throw new Error("GitHub environment variables are missing");
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/data/config.json?ref=${encodeURIComponent(branch)}`;
  const headers={"accept":"application/vnd.github+json","authorization":`Bearer ${token}`,"x-github-api-version":"2022-11-28","user-agent":"kiddlex-landing-admin"};
  return {owner,repo,branch,token,url,headers};
}

async function readConfig(context){
  const g=await gh(context);
  const r=await fetch(g.url,{headers:g.headers});
  if(r.status===404) return {data:{},sha:null,g};
  if(!r.ok) throw new Error(`GitHub read failed: ${r.status}`);
  const j=await r.json();
  const text=decodeURIComponent(escape(atob(j.content.replace(/\n/g,""))));
  return {data:JSON.parse(text||"{}"),sha:j.sha,g};
}

export async function onRequestGet(context){
  if(!authorized(context)) return Response.json({ok:false},{status:401});
  try{
    const {data}=await readConfig(context);
    const rows=SLUGS.map(slug=>({...defaults(slug),...(data[slug]||{}),slug}));
    return Response.json({ok:true,rows});
  }catch(e){return Response.json({ok:false,error:e.message},{status:500})}
}

export async function onRequestPost(context){
  if(!authorized(context)) return Response.json({ok:false},{status:401});
  let body={}; try{body=await context.request.json()}catch{}
  const slug=String(body.slug||"").toLowerCase(), destination=String(body.destination||"").trim(), delay=Number(body.delay);
  if(!SLUGS.includes(slug)) return Response.json({ok:false,error:"Invalid slug"},{status:400});
  if(!/^https?:\/\//i.test(destination)) return Response.json({ok:false,error:"Destination must start with http:// or https://"},{status:400});
  if(!Number.isFinite(delay)||delay<0||delay>60000) return Response.json({ok:false,error:"Delay must be 0-60000 ms"},{status:400});
  try{
    const {data,sha,g}=await readConfig(context);
    data[slug]={destination,delay:Math.round(delay)};
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
    const payload={message:`Update /${slug} landing settings`,content,branch:g.branch};
    if(sha) payload.sha=sha;
    const r=await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}/contents/data/config.json`,{method:"PUT",headers:{...g.headers,"content-type":"application/json"},body:JSON.stringify(payload)});
    if(!r.ok) throw new Error(`GitHub write failed: ${r.status}`);
    return Response.json({ok:true});
  }catch(e){return Response.json({ok:false,error:e.message},{status:500})}
}
