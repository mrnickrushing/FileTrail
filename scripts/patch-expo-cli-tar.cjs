#!/usr/bin/env node
// patch-expo-cli-tar.cjs
// Patches @expo/cli so expo prebuild works under Node 22.
//
// Problem: @expo/cli calls tar.extract({...}) but under Node 22 the
// tar package's CJS interop can surface as an object where .extract is
// undefined (tar v6->v7 API rename: extract -> x).
//
// Fix: replace every tar.extract() call in @expo/cli/build with
// (tar.extract ?? tar.x)() so it works with both tar v6 and v7.

'use strict';
const fs = require('fs');
const path = require('path');

// This script lives at <repo>/scripts/patch-expo-cli-tar.cjs and is run
// from the repo root, so mobile/node_modules is one level up.
const mobileModules = path.join(__dirname, '..', 'mobile', 'node_modules');
const expoCliBuild = path.join(mobileModules, '@expo', 'cli', 'build');

if (!fs.existsSync(expoCliBuild)) {
  console.log('[patch-tar] @expo/cli/build not found – nothing to patch');
  process.exit(0);
}

// Walk build directory and patch every JS file that calls tar.extract
let patched = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith('.js')) continue;
    try {
      const src = fs.readFileSync(full, 'utf8');
      if (!src.includes('tar.extract')) continue;
      const fixed = src.replace(/tar.extract/g, '(tar.extract ?? tar.x)');
      fs.writeFileSync(full, fixed);
      console.log('[patch-tar] Patched:', path.relative(mobileModules, full));
      patched++;
    } catch {
      // skip unreadable files
    }
  }
}

walk(expoCliBuild);

if (patched === 0) {
  console.log('[patch-tar] No tar.extract usages found – already clean');
} else {
  console.log('[patch-tar] Done –', patched, 'file(s) patched ✓');
}
