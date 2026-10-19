// Jednoduchý Node server pre hosting (napr. Helkor): servíruje priečinok dist/ so SPA fallbackom.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".jar": "application/java-archive",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("Chýba dist/index.html – najprv spusti: npm run build");
  process.exit(1);
}

http.createServer((req, res) => {
  // www.mcservery.one -> mcservery.one (jedna kanonická adresa pre SEO)
  const host = (req.headers.host || "").toLowerCase().split(":")[0];
  if (host === "www.mcservery.one") {
    res.writeHead(301, { Location: `https://mcservery.one${req.url || "/"}` });
    return res.end();
  }
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) file = path.join(root, "index.html"); // SPA fallback
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": file.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=31536000, immutable" : "no-cache",
  });
  fs.createReadStream(file).pipe(res);
}).listen(port, "0.0.0.0", () => console.log(`MCServery beží na porte ${port}`));
