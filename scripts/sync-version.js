#!/usr/bin/env node
/**
 * Syncs the version from package.json to app.json and server/package.json.
 * Run manually with: node scripts/sync-version.js
 * Or automatically via: npm run version:sync
 * Or as part of: npm version patch|minor|major
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');
const serverPkgPath = path.join(rootDir, 'server', 'package.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

// Update app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = version;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// Update server/package.json
const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf8'));
serverPkg.version = version;
fs.writeFileSync(serverPkgPath, JSON.stringify(serverPkg, null, 2) + '\n');

console.log(`Synced version ${version} to app.json and server/package.json`);
