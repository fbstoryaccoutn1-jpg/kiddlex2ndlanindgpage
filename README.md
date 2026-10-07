# Kiddlex 2nd Landing Page

Nars-style dynamic landing manager for Cloudflare Pages.

## Public landing behavior
Every slug uses one shared landing template:
- Desktop/laptop redirects to Google with the slug in UTM medium.
- Mobile shows one random image from `/assets/1.webp` through `/assets/18.webp`.
- Mobile redirects to that slug's destination after its configured delay.
- Title remains `Please wait...`.
- Google Analytics ID remains `G-16BHTEV2QP`.

## Admin
Open `/admin/`.

The admin panel supports:
- Create new landing links
- Edit slug
- Edit destination URL
- Edit redirect delay
- Delete landing links
- Open/test a landing link
- Save all changes with verification

## Existing slugs
- /deru
- /gyro
- /hemari
- /mari
- /million
- /nari
- /tank
- /zuberi

## Shared images
`public/assets/1.webp` through `public/assets/18.webp`.

## Cloudflare Pages
- Production branch: `main`
- Framework preset: `None`
- Build command: `bash build.sh`
- Build output directory: `public`
- Root directory: blank

## Environment variables
- `GITHUB_OWNER=fbstoryaccoutn1-jpg`
- `GITHUB_REPO=kiddlex2ndlanindgpage`
- `GITHUB_BRANCH=main`
- `GITHUB_TOKEN=<token with Contents read/write for this repo>`
- `ADMIN_PASSWORD=<your password>`
