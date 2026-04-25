#!/usr/bin/env node
/**
 * Pre-seeds .next/server manifest stubs before `next build`.
 *
 * Next.js 15 has a race condition where the page-data collection phase
 * reads middleware-manifest.json and pages-manifest.json before the server
 * compiler worker finishes writing them. Pre-creating empty stubs lets the
 * reader proceed; next build overwrites them with real content.
 *
 * See: TES-169 / TES-123
 */

const fs = require("fs");
const path = require("path");

const serverDir = path.join(__dirname, "..", ".next", "server");

fs.mkdirSync(serverDir, { recursive: true });

const stubs = {
  "middleware-manifest.json": JSON.stringify({
    version: 3,
    sortedMiddleware: [],
    middleware: {},
    functions: {},
    matchers: {},
  }),
  "pages-manifest.json": JSON.stringify({}),
};

for (const [name, content] of Object.entries(stubs)) {
  const filePath = path.join(serverDir, name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`[seed-build-manifests] created ${name}`);
  }
}
