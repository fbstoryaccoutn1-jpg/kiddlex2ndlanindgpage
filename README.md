# Kiddlex 2nd Landing Page

Cloudflare Pages landing manager — no KV or D1 required.

## Public routes
- /deru
- /gyro
- /hemari
- /mari
- /million
- /nari
- /tank
- /zuberi

## Shared images
Upload these exact files into:

`public/assets/1.webp`
through
`public/assets/18.webp`

All slugs and all custom domains attached to this Pages project use the same shared image folder.

## Cloudflare Pages build settings
- Production branch: `main`
- Framework preset: `None`
- Build command: `bash build.sh`
- Build output directory: `public`
- Root directory: leave blank

## Environment variables / secrets
Add these in Cloudflare Pages:
- `GITHUB_OWNER=fbstoryaccoutn1-jpg`
- `GITHUB_REPO=kiddlex2ndlanindgpage`
- `GITHUB_BRANCH=main`
- `GITHUB_TOKEN=<fine-grained GitHub token with Contents read/write permission for this repo>`
- `ADMIN_PASSWORD=<your admin password>`
- `SESSION_SECRET=<long random private string>`

## Admin panel
Open `/admin/`.

The admin panel edits:
- Destination URL
- Redirect delay

Saving writes the settings to `data/config.json` in GitHub. No KV namespace is used.

## Landing behavior
- Desktop/laptop: redirects to Google with the slug in UTM medium.
- Mobile: shows one random image from 1.webp to 18.webp.
- After the configured delay, mobile redirects to the slug destination.
