# Blue.tcc — ProfileMe

A modern, interactive personal portfolio built with **React + TypeScript + Vite**. The site combines a cyber-inspired visual design with animated UI, project highlights, skills, and an interactive **Live2D Cubism** avatar.

🌐 **Live site:** https://bluetccth.github.io/ProfileMe/

## ✨ Highlights

- Modern cyber / futuristic portfolio UI
- Responsive layout for desktop and mobile
- Animated interactions and transitions
- Interactive Live2D avatar powered by PixiJS and Cubism
- Skills, projects, profile, and contact sections
- GitHub Pages deployment through GitHub Actions
- Thai-language interface with English technical content where appropriate

## 🛠️ Tech Stack

- **React 19** — UI
- **TypeScript** — type-safe application code
- **Vite** — development server and production build
- **Tailwind CSS** — styling
- **PixiJS 7** — rendering
- **pixi-live2d-display** — Live2D integration
- **Live2D Cubism Core** — model runtime
- **Motion** — animations
- **Lucide React** — icons
- **Google GenAI SDK** — AI-related functionality used by the project

## 🚀 Run locally

### Requirements

- Node.js 22 or newer
- npm

### Install

```bash
npm ci
```

### Development server

```bash
npm run dev
```

The Vite server runs on port `3000`.

### Production build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## 📦 Deployment

The project is configured for **GitHub Pages**. Pushes to the `main` branch trigger the deployment workflow in `.github/workflows/`.

The workflow:

1. Checks out the repository.
2. Installs dependencies.
3. Runs the production build.
4. Uploads `dist/` as a Pages artifact.
5. Deploys the artifact to GitHub Pages.

## 🎭 Live2D assets

The Live2D model is served from `public/live2d/` and requires the model binary and texture files to remain valid binary assets.

The build process includes `scripts/restore-live2d.cjs`, which restores the `.moc3` model and `.png` texture from Base64 source data before Vite builds the site and verifies/restores the assets afterward.

Expected model paths:

```text
public/live2d/
├── MassageSeacubus_rei.moc3
└── MassageSeacubus_rei.4096/
    └── texture_00.png
```

If the Base64 source files are edited manually, make sure they contain complete Base64 data and have not been truncated, converted through a text encoding, or prefixed with unintended characters. The restore script validates the `.moc3` and PNG signatures before writing the files.

## 📁 Project structure

```text
ProfileMe/
├── public/                 # Static assets and Live2D model files
├── scripts/                # Build-time asset restoration scripts
├── src/
│   ├── components/         # UI and interactive components
│   ├── App.tsx             # Main application UI
│   └── main.tsx            # React entry point
├── index.html
├── package.json
└── vite.config.*
```

## 🔧 Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Restore Live2D assets and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript checking |
| `npm run clean` | Remove generated build files |

## 🌌 Design direction

The visual direction is intentionally futuristic: dark backgrounds, neon accents, glass-like panels, motion effects, and a space/cyber aesthetic. The goal is to make the portfolio feel more like an interactive digital profile than a traditional résumé page.

## 📄 License

This repository is a personal portfolio project. Unless a separate license is provided for a specific asset, contact the repository owner before reusing the project's original artwork, personal content, or Live2D assets.
