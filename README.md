# Kiddlex 2nd Landing Page

Cloudflare Pages landing-page manager with shared images and an admin panel.

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

All 8 slugs and every custom domain attached to the same Pages project use this shared folder.

## Cloudflare Pages settings
- Framework preset: None
- Production branch: main
- Build command: `bash build.sh`
- Build output directory: `public`

## Required Cloudflare binding
Create a KV namespace and bind it to this Pages project with the exact binding name:

`LANDING_CONFIG`

## Required environment variables
Add these under the Pages project environment variables:

- `ADMIN_PASSWORD` = password for /admin/
- `SESSION_SECRET` = any long random private string

## Admin panel
Open:

`/admin/`

Each slug has:
- Destination URL
- Redirect delay in seconds

Saving from the admin panel updates KV immediately; no code edit or redeploy is required.

## Landing behavior
- Desktop/laptop: redirects to Google with the slug in UTM medium.
- Mobile: randomly shows one image from 1.webp to 18.webp.
- After the configured delay, mobile redirects to that slug's destination URL.
- Page title and visual presentation remain fixed.
