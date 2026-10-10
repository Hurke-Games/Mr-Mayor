import fs from 'fs';
import path from 'path';

const docsDir = path.resolve(process.cwd(), 'docs');
const distDir = path.resolve(process.cwd(), 'dist');

if (fs.existsSync(docsDir)) {
  // 1. Create .nojekyll in docs so GitHub Pages serves all assets without Jekyll
  fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
  console.log('✓ Created docs/.nojekyll');

  // 2. Copy index.html to 404.html in docs for GitHub Pages SPA routing fallback
  const indexPath = path.join(docsDir, 'index.html');
  const notFoundPath = path.join(docsDir, '404.html');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, notFoundPath);
    console.log('✓ Created docs/404.html (SPA fallback for GitHub Pages)');
  }

  // 3. Mirror docs to dist for backward compatibility
  try {
    fs.cpSync(docsDir, distDir, { recursive: true });
    console.log('✓ Mirrored docs/ to dist/');
  } catch (err) {
    console.warn('Note: Could not mirror docs/ to dist/:', err.message);
  }
} else {
  console.warn('Warning: docs directory not found during postbuild.');
}

