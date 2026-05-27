# Lightchain AI — SessionWallet dApp

A React dApp for the Lightchain AI SessionWallet contract. Think of it like a phone top-up card — load it with LCAI, use it for AI sessions, top up when empty. Every transaction sends 2% to rescue real dogs.

## Contract Info
- **SessionWallet v2:** `0xE21B0C69554138172CDe76b039d1aFE07d05B0A7`
- **Dog rescue wallet:** `0x69A9dA9c59B6E3B563CAea20a2a45413dFc526ee`
- **Dev wallet:** `0xFE1eaEE079583bec30319Cfc5DE591D501c6C82E`
- **Network:** Lightchain Mainnet (Chain ID: 9200)
- **Explorer:** https://mainnet.lightscan.app

---

## How to deploy to Vercel (step by step)

### Step 1 — Install Node.js
Go to https://nodejs.org and download the LTS version. Install it.

### Step 2 — Create a GitHub account
Go to https://github.com and sign up (free).

### Step 3 — Create a new GitHub repo
1. Click the + button top right → "New repository"
2. Name it `lightchain-sessionwallet`
3. Set it to Public
4. Click "Create repository"

### Step 4 — Upload your files
In the new repo, click "uploading an existing file" and upload:
- `package.json`
- `public/index.html`
- `src/index.js`
- `src/App.jsx`

Make sure `public/` and `src/` are folders, not just files.

### Step 5 — Connect to Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `lightchain-sessionwallet` repo
4. Leave all settings as default
5. Click "Deploy"

That's it! Vercel gives you a live URL instantly.

### Step 6 — Update the site anytime
Just edit `App.jsx` in GitHub (click the file → pencil icon → edit → commit).
Vercel auto-deploys every time you save. No terminal needed.

---

## Run locally (optional)
```bash
npm install
npm start
```
Opens at http://localhost:3000
