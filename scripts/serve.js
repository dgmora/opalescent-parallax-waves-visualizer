import { watch } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT) || 8000;
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const LIVE_RELOAD = `<script>new EventSource("/reload").onmessage=()=>location.reload()</script>`;

const clients = new Set();
for (const dir of [".", "src"]) {
  watch(dir, (_event, name) => {
    if (name?.startsWith(".")) return;
    for (const client of clients) client.write("data:\n\n");
  });
}

createServer(async (req, res) => {
  // normalize() on an always-absolute pathname drops any leading "..", so the
  // join below cannot escape the repository root.
  const path = normalize(decodeURIComponent(new URL(req.url, "http://localhost").pathname));
  if (path === "/reload") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  const file = join(".", path.endsWith("/") ? `${path}index.html` : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(extname(file) === ".html" ? body + LIVE_RELOAD : body);
  } catch {
    res.writeHead(404).end(`not found: ${file}`);
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
