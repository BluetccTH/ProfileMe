# Blue.tcc Portfolio (ProfileMe) 🌌

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6c63ff?style=for-the-badge&logo=github)](https://bluetccth.github.io/ProfileMe/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Flash-4285f4?style=for-the-badge&logo=google)](https://ai.google.dev/)

A modern, high-performance cyber/futuristic portfolio website for **Blue.tcc (Chisanupong Renuhom)** featuring an interactive **Live2D Cubism 4 Model Avatar**, dynamic skill matrix, project showcases, audio/visual effects, and responsive cyber design.

🌐 **Live Demo:** [https://bluetccth.github.io/ProfileMe/](https://bluetccth.github.io/ProfileMe/)

---

## ✨ Features

- 🎭 **Interactive Live2D Avatar**: Real-time cursor tracking, motion gestures, expression switching, and physics simulation using PixiJS & Cubism 4 SDK.
- ⚡ **Futuristic Cyber UI**: Glassmorphism aesthetic, neon gradients, ambient background particle video, and responsive layout across desktop and mobile.
- 🚀 **Featured Projects & Products Showcase**:
  - **Lily - AI**: Interactive celestial Live2D AI Anime companion with real-time eye/cursor tracking, voice synthesis & Google Gemini conversational intelligence.
  - **BoostPC**: Windows latency optimization & performance tuning suite.
  - **NetBoot-X**: Cloud OS booting & network PXE solutions.
  - **Overlay-PC**: Real-time FPS, CPU, GPU, RAM hardware monitoring overlay.
- 🛠️ **Interactive Skill Radar & Matrix**: Visualized proficiency in Full-Stack Web, DevOps, Server Optimization, and Live2D rigging.
- 📱 **Mobile & Desktop Responsive**: Custom sticky glass navigation bar, full-screen mobile menu drawer, and smooth section scrolling.
- 🔗 **Social Links & Support Integration**: Direct links to Discord community, Facebook, GitHub, and EzDn donation/support.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion (Framer Motion)](https://motion.dev/)
- **2D Graphics & Live2D**:
  - [PixiJS v7](https://pixijs.com/)
  - [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
  - Live2D Cubism Core 5.1 (Cubism 4)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Hosting / CI/CD**: [GitHub Pages](https://pages.github.com/) (`gh-pages`)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ recommended)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bluetccth/ProfileMe.git
   cd ProfileMe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Build & Deployment

### Build for Production

```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

### Deploy to GitHub Pages

```bash
npm run deploy
```
This automatically builds the project and pushes the `dist/` folder to the `gh-pages` branch.

---

## 📁 Project Structure

```text
ProfileMe/
├── public/                 # Static assets, images, video & Live2D model files
│   ├── live2d/             # Live2D Cubism model (.moc3, textures, motions, physics)
│   ├── live2dcubismcore.min.js
│   ├── background.mp4      # Cyber background loop
│   └── favicon.png
├── src/
│   ├── components/
│   │   └── Live2DAvatar.tsx # PixiJS + Live2D canvas wrapper component
│   ├── App.tsx             # Main portfolio layout & sections
│   ├── main.tsx            # React application root
│   └── index.css           # Tailwind CSS imports & global utilities
├── index.html              # Entry HTML with SEO & Open Graph meta tags
├── package.json            # Project dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build & asset resolution configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 💬 Contact & Community

- **Creator**: Chisanupong Renuhom (Blue.tcc)
- **Discord Community**: [https://discord.gg/WTYgx6CPeh](https://discord.gg/WTYgx6CPeh)
- **Support**: [https://ezdn.app/blue_tcc](https://ezdn.app/blue_tcc)
- **GitHub**: [@bluetccth](https://github.com/bluetccth)
