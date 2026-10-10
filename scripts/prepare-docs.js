import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const docsDir = path.resolve(rootDir, 'docs');

console.log('[prepare-docs] Preparing docs/ folder for GitHub Pages...');

// Ensure docs folder exists
if (fs.existsSync(docsDir)) {
  fs.rmSync(docsDir, { recursive: true, force: true });
}
fs.mkdirSync(docsDir, { recursive: true });

// Copy dist files to docs
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(distDir, docsDir);

// In docs/index.html, remove the root fallback redirect since docs/ is the compiled bundle
const docsIndexPath = path.resolve(docsDir, 'index.html');
if (fs.existsSync(docsIndexPath)) {
  let content = fs.readFileSync(docsIndexPath, 'utf8');
  // Remove the GitHub Pages Root Deployment Fallback script from docs/index.html
  content = content.replace(
    /<script>[\s\S]*?GitHub Pages Root Deployment Fallback[\s\S]*?<\/script>\s*/gi,
    ''
  );
  fs.writeFileSync(docsIndexPath, content, 'utf8');
  console.log('[prepare-docs] Cleaned redirect script from docs/index.html');
}

// Ensure .nojekyll exists in docs
const noJekyllPath = path.resolve(docsDir, '.nojekyll');
if (!fs.existsSync(noJekyllPath)) {
  fs.writeFileSync(noJekyllPath, '', 'utf8');
  console.log('[prepare-docs] Created docs/.nojekyll');
}

console.log('[prepare-docs] Successfully prepared docs/ directory for GitHub Pages.');
