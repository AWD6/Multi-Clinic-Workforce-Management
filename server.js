import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8787);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon" };
function safeFile(url) { const pathname = decodeURIComponent((url || "/").split("?")[0]); const file = normalize(join(root, pathname === "/" ? "index.html" : pathname)); return file.startsWith(root) ? file : null; }
createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end("Method not allowed"); return; }
  const file = safeFile(request.url); const target = file && existsSync(file) && statSync(file).isFile() ? file : join(root, "index.html");
  response.writeHead(file && target === file ? 200 : 404, { "Content-Type": types[extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": [".html", ".js", ".css"].includes(extname(target).toLowerCase()) ? "no-cache" : "public, max-age=86400" });
  if (request.method !== "HEAD") response.end(readFileSync(target)); else response.end();
}).listen(port, host, () => console.log(`[Workforce] Local-only app running at http://${host === "0.0.0.0" ? "localhost" : host}:${port}`));
