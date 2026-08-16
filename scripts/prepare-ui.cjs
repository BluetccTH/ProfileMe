const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "../src/App.tsx");
const source = fs.readFileSync(appPath, "utf8");
let output = source;

output = output.replace(
  /\n\s*\{\/\* Support CTA Button \*\/\}[\s\S]*?<\/div>\n\n\s*\{\/\* Hamburger Menu Icon \(Mobile\) \*\//,
  "\n\n          {/* Hamburger Menu Icon (Mobile) */"
);

output = output.replace(
  /\n\s*<motion\.a\n\s*variants=\{\{\n\s*open: \{ opacity: 1, y: 0 \},\n\s*closed: \{ opacity: 0, y: 20 \},\n\s*\}\}\n\s*href="https:\/\/ezdn\.app\/blue_tcc"[\s\S]*?\n\s*<\/motion\.a>/,
  ""
);

const oldHero = /<button\n\s*onClick=\{\(\) => scrollToSection\("portfolio"\)\}\n\s*className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-blue-500\/20 hover:-translate-y-0\.5 transition-all duration-300 cursor-pointer"\n\s*>\n\s*<span>🚀 Explore Products<\/span>\n\s*<\/button>/;
const newHero = `<a\n                  href="https://ezdn.app/blue_tcc"\n                  target="_blank"\n                  rel="noopener noreferrer"\n                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"\n                >\n                  <span>💸 Donate</span>\n                </a>`;

output = output.replace(oldHero, newHero);

if (output === source) throw new Error("[UI Patch] No changes were applied. Source layout may have changed.");

fs.writeFileSync(appPath, output, "utf8");
console.log("[UI Patch] Donate button applied; desktop/mobile Support buttons removed.");
