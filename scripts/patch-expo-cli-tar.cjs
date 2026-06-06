#!/usr/bin/env node
// patch-expo-cli-tar.cjs
//
// Root cause: tar@7 removed the .extract() export (renamed to .x()).
// @expo/cli@0.22.x still calls tar.extract() during expo prebuild when
// extracting the iOS template tarball, producing:
//   "Cannot read properties of undefined (reading 'extract')"
//
// Fix: patch tar's CJS runtime file to re-export .extract as an alias
// of .x immediately after npm ci installs tar@7.

'use strict';
const fs   = require('fs');
const path = require('path');

// Script lives at <repo>/scripts/; repo root is one level up.
const mobileModules = path.join(__dirname, '..', 'mobile', 'node_modules');
const tarDir = path.join(mobileModules, 'tar');

if (!fs.existsSync(tarDir)) {
  console.log('[patch-tar] tar not found in mobile/node_modules – skipping');
  process.exit(0);
}

const tarPkg = JSON.parse(fs.readFileSync(path.join(tarDir, 'package.json'), 'utf8'));
const major = parseInt(tarPkg.version.split('.')[0], 10);
console.log('[patch-tar] tar version:', tarPkg.version);

if (major < 7) {
  console.log('[patch-tar] tar <7 exports .extract natively – nothing to do');
  process.exit(0);
}

// Find the CJS runtime .js file.
// IMPORTANT: tar v7 exports map puts the .d.ts entry BEFORE the .js entry,
// so we must NOT rely on order-of-values in the exports object.
// Instead, check known paths directly first.
function findCjsJs(dir) {
  const knownPaths = [
    'dist/commonjs/index.js',
    'dist/cjs/index.js',
    'lib/index.js',
    'index.js',
  ];
  for (const p of knownPaths) {
    const full = path.join(dir, p);
    if (fs.existsSync(full)) return full;
  }
  // Fallback: walk the exports map, accepting only .js files
  try {
    const exp = tarPkg.exports;
    const root = (exp && exp['.']) || exp;
    if (!root) return null;
    const sections = [root.require, root.default, root];
    for (const sec of sections) {
      if (!sec) continue;
      const vals = typeof sec === 'string' ? [sec] : Object.values(sec);
      for (const v of vals) {
        if (typeof v === 'string' && v.endsWith('.js')) {
          const full = path.join(dir, v);
          if (fs.existsSync(full)) return full;
        }
      }
    }
  } catch (_) {}
  return null;
}

const cjsEntry = findCjsJs(tarDir);
if (!cjsEntry) {
  console.log('[patch-tar] Could not locate tar CJS .js entry – skipping');
  process.exit(0);
}

console.log('[patch-tar] Target:', path.relative(mobileModules, cjsEntry));

let src = fs.readFileSync(cjsEntry, 'utf8');
// Remove any previous (broken) patch attempt before re-applying
const patchMarker = '// patch-expo-cli-tar:';
if (src.includes(patchMarker)) {
  // Strip everything from the marker to end of file and re-patch
  src = src.slice(0, src.indexOf('\n' + patchMarker)).trimEnd() + '\n';
  console.log('[patch-tar] Removing previous patch attempt, re-applying with Object.defineProperty');
}

// Append the compat alias and write back.
// IMPORTANT: tar v7 uses Object.defineProperty with getter descriptors on exports.
// Simple assignment (exports.extract = ...) silently fails on sealed property objects.
// Must use Object.defineProperty with configurable:true to override.
src += '\n// patch-expo-cli-tar: .extract alias for @expo/cli compat (tar v7)\n';
src += '(function() {\n';
src += '  if (typeof exports.x !== "function") return;\n';
src += '  try {\n';
src += '    Object.defineProperty(exports, "extract", {\n';
src += '      configurable: true, enumerable: true,\n';
src += '      get: function() { return exports.x; }\n';
src += '    });\n';
src += '  } catch(_) {\n';
src += '    exports.extract = exports.x;\n';
src += '  }\n';
src += '})();\n';

fs.writeFileSync(cjsEntry, src);
console.log('[patch-tar] Patched – exports.extract = exports.x added ✓');
