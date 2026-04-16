#!/usr/bin/env node
/**
 * Syncs the version from package.json to server/package.json.
 * app.config.js reads the version from package.json directly, so no sync needed there.
 * Run manually with: node scripts/sync-version.js
 * Or automatically via: npm run version:sync
 * Or as part of: npm version patch|minor|major
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const serverPkgPath = path.join(rootDir, 'server', 'package.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// Update server/package.json
const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf8'));
serverPkg.version = version;
fs.writeFileSync(serverPkgPath, JSON.stringify(serverPkg, null, 2) + '\n');

console.log(`Synced version ${version} to server/package.json`);
