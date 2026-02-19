#!/usr/bin/env node
/**
 * Dereferences bun's symlinked packages in node_modules so that
 * Node.js-based tools (Metro, Babel) can resolve modules correctly.
 *
 * Bun installs packages into node_modules/.bun/ and creates symlinks
 * at the package level. Node.js workers (used by Metro bundler) cannot
 * always resolve modules through these symlinks.
 */
import { readdirSync, lstatSync, realpathSync, unlinkSync, cpSync, existsSync } from 'fs';
import { join } from 'path';

function derefSymlinks(dir) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    if (entry === '.bun' || entry === '.cache' || entry === '.bin' || entry === '.package-lock.json') continue;
    const fullPath = join(dir, entry);
    let stat;
    try { stat = lstatSync(fullPath); } catch { continue; }

    if (stat.isSymbolicLink()) {
      const realPath = realpathSync(fullPath);
      unlinkSync(fullPath);
      cpSync(realPath, fullPath, { recursive: true });
      count++;
    } else if (stat.isDirectory() && entry.startsWith('@')) {
      // Handle scoped packages (@babel/core, @expo/*, etc.)
      count += derefSymlinks(fullPath);
    }
  }
  return count;
}

const root = process.cwd();
console.log('Dereferencing bun symlinks...');

// Fix both root and workspace node_modules
const rootCount = derefSymlinks(join(root, 'node_modules'));
console.log(`  root node_modules: ${rootCount} symlinks dereferenced`);

const mobileCount = derefSymlinks(join(root, 'apps', 'mobile', 'node_modules'));
console.log(`  apps/mobile/node_modules: ${mobileCount} symlinks dereferenced`);

console.log('Done.');
