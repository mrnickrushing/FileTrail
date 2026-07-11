#!/usr/bin/env node
// patch-expo-modules-jsi-weak.cjs
//
// Root cause: expo-modules-jsi@56.0.7's Swift sources declare `weak let`
// properties (e.g. `private weak let runtime: JavaScriptRuntime?`). Older
// Swift toolchains tolerated this; Swift 6.2 (shipped with Xcode 26) enforces
// that `weak` references must be `var`, and additionally flags `weak var` on
// Sendable-conforming types unless marked `nonisolated(unsafe)`. Result:
//   'weak' must be a mutable variable, because it may change at runtime
// across ~15 sites in ExpoModulesJSI, failing the iOS archive step.
// Tracked upstream: https://github.com/expo/expo/issues/46242
//
// Fix: rewrite `weak let <name>` to `nonisolated(unsafe) weak var <name>`
// in every .swift file under expo-modules-jsi immediately after npm install.

'use strict';
const fs = require('fs');
const path = require('path');

const mobileModules = path.join(__dirname, '..', 'mobile', 'node_modules');
const pkgDir = path.join(mobileModules, 'expo-modules-jsi');

if (!fs.existsSync(pkgDir)) {
  console.log('[patch-expo-modules-jsi] expo-modules-jsi not found in mobile/node_modules – skipping');
  process.exit(0);
}

const WEAK_LET_RE = /\bweak let\b/g;

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.swift')) {
      files.push(full);
    }
  }
  return files;
}

const swiftFiles = walk(pkgDir, []);
let patchedCount = 0;

for (const file of swiftFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!WEAK_LET_RE.test(src)) continue;
  WEAK_LET_RE.lastIndex = 0;

  // Already patched (idempotent across repeated npm installs / retries).
  if (src.includes('nonisolated(unsafe) weak var')) continue;

  const patched = src.replace(WEAK_LET_RE, 'nonisolated(unsafe) weak var');
  fs.writeFileSync(file, patched);
  patchedCount++;
  console.log('[patch-expo-modules-jsi] Patched', path.relative(mobileModules, file));
}

console.log(`[patch-expo-modules-jsi] Done – ${patchedCount} file(s) patched (weak let -> nonisolated(unsafe) weak var)`);
