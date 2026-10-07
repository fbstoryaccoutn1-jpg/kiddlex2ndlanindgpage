# Kiddlex 2nd Landing Page

Cloudflare Pages landing-page manager for shared mobile landing assets.

## Public routes
Preloaded slugs:
- /deru
- /gyro
- /hemari
- /mari
- /million
- /nari
- /tank
- /zuberi

## Shared images
Upload the 18 images here:

`public/assets/1.webp`
through
`public/assets/18.webp`

All slugs use the same shared image folder.

## Cloudflare Pages
- Framework preset: None
- Production branch: main
- Build command: `bash build.sh`
- Build output directory: `public`

Environment variables:
- `GITHUB_OWNER=fbstoryaccoutn1-jpg`
- `GITHUB_REPO=kiddlex2ndlanindgpage`
- `GITHUB_BRANCH=main`
- `GITHUB_TOKEN=<fine-grained token with Contents read/write on this repo>`
- `ADMIN_PASSWORD=<your admin password>`

Admin panel: `/admin/`

The admin panel edits only slug, destination URL, and redirect delay. Landing presentation stays fixed.
