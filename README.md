# Battle Monsters



A browser-based custom trading card game. Create cards, build decks, and battle locally or against a simple AI opponent.



## License / Usage

This is a personal project made for fun. Feel free to use, modify, or build on it however you want. No attribution required, but I'd love to hear about cool things people make with it!

## Quick start (development)

```bash
npm install
npm run dev
```


## Launch from Windows (desktop shortcut)

Two helper files in the project root make it easy to start the game without opening a terminal manually.

### Files

| File | Purpose |
|------|---------|
| `Launch Battle Monsters.bat` | Starts the Vite dev server and opens your browser |
| `Create Desktop Shortcut.ps1` | Creates a desktop shortcut to the batch file (run once) |

### One-time setup: create the desktop shortcut

1. Open PowerShell (or right-click `Create Desktop Shortcut.ps1` → **Run with PowerShell**).
2. If execution policy blocks the script, run:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
3. From the project folder, run:
   ```powershell
   .\Create Desktop Shortcut.ps1
   ```
4. A shortcut named **Battle Monsters** appears on your desktop.

### Every time you want to play

1. Double-click the **Battle Monsters** desktop shortcut (or double-click `Launch Battle Monsters.bat` in the project folder).
2. A command prompt opens in the project directory and runs `npm run dev`.
3. After a few seconds, your default browser opens to [http://localhost:5173](http://localhost:5173).
4. The terminal stays open so you can see server output and any errors.
5. Press **Ctrl+C** in the terminal when you are done, then close the window.

### Requirements

- [Node.js](https://nodejs.org/) (includes `npm`)
- Run `npm install` once in the project folder before using the launcher

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run unit tests |

## Deploying the Website

Battle Monsters is a static React + Vite app. Build once, deploy the `dist` folder to any static host.

### Netlify

1. Connect your repository (or drag-and-drop the project) in the [Netlify dashboard](https://app.netlify.com/).
2. Use these settings (also defined in `netlify.toml` at the project root):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Deploy. The `[[redirects]]` rule in `netlify.toml` sends all routes to `index.html` with a `200` status so [React Router](https://reactrouter.com/) client-side routes (for example `/deck-builder`, `/play`) work when users refresh or open a deep link directly.

### Vercel

1. Import the project in the [Vercel dashboard](https://vercel.com/).
2. Vercel usually auto-detects Vite. If you set values manually:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Vercel applies SPA-style rewrites for Vite apps by default, so React Router routes behave the same as on Netlify.

### Data on deployed sites

Cards, decks, and saved games are stored **per device** in the browser’s **localStorage**. Nothing is synced to a server. Clearing site data or using a different browser or computer starts with an empty library.

Use **Deck Builder → Import / Export** to save decks as `.json` files and load them on another device. Export includes full card data so decks can be restored even after localStorage is cleared.

## Project structure

- `src/models` — Card and deck data models
- `src/storage` — localStorage persistence
- `src/engine` — Game rules (no React)
- `src/components` — UI components
- `src/pages` — App routes
