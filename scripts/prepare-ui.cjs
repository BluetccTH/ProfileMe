const fs = require("fs");
const path = require("path");

const appPath = path.resolve(__dirname, "../src/App.tsx");
const source = fs.readFileSync(appPath, "utf8");
let output = source;

// Remove the desktop Support CTA, but keep the navigation row/container intact.
output = output.replace(
  /\n\s*\/\*\* Support CTA Button \*\/\n\s*<div className="hidden md:flex items-center">[\s\S]*?<\/div>\n\n(?=\s*\/\*\* Hamburger Menu Icon \(Mobile\) \*\/)/,
  "\n\n"
);

// Remove the mobile Support Dev button.
output = output.replace(
  /\n\s*<motion\.a\n\s*variants=\{\{\n\s*open: \{ opacity: 1, y: 0 \},\n\s*closed: \{ opacity: 0, y: 20 \},\n\s*\}\}\n\s*href="https:\/\/ezdn\.app\/blue_tcc"[\s\S]*?\n\s*<\/motion\.a>/,
  ""
);

// Change the hero CTA from Explore Products to Donate and link to EasyDonate.
const oldHero = /<button\n\s*onClick=\{\(\) => scrollToSection\("portfolio"\)\}\n\s*className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-blue-500\/20 hover:-translate-y-0\.5 transition-all duration-300 cursor-pointer"\n\s*>\n\s*<span>🚀 Explore Products<\/span>\n\s*<\/button>/;
const newHero = `<a\n                  href="https://ezdn.app/blue_tcc"\n                  target="_blank"\n                  rel="noopener noreferrer"\n                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"\n                >\n                  <span>💸 Donate</span>\n                </a>`;
output = output.replace(oldHero, newHero);

// Center the desktop navigation independently of the left logo width.
output = output.replace(
  'className="w-full px-5 md:px-12 lg:px-16 flex justify-between items-center"',
  'className="relative w-full px-5 md:px-12 lg:px-16 flex items-center"'
);
output = output.replace(
  'className="hidden md:flex items-center gap-8"',
  'className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8"'
);

if (output === source) {
  throw new Error("[UI Patch] No changes were applied. Source layout may have changed.");
}

fs.writeFileSync(appPath, output, "utf8");
console.log("[UI Patch] Donate applied, Support buttons removed, desktop navigation centered.");
