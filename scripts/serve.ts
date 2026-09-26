// Serves a built folder for Playwright. Astro's own preview detaches into the
// background when it has no terminal, so Playwright could neither tell when it
// was ready nor stop it afterwards. This one stays in the foreground and ends
// with the test run.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const [folder = "dist-test", portText = "4400"] = process.argv.slice(2);
const root = join(process.cwd(), folder);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ico": "image/x-icon",
};

/** The file a request names, or undefined if it names nothing inside the folder. */
function fileFor(url: string): string | undefined {
  const path = normalize(decodeURIComponent(new URL(url, "http://x").pathname));
  let file = join(root, path);
  if (!file.startsWith(root)) return undefined;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return existsSync(file) ? file : undefined;
}

createServer((req, res) => {
  const file = fileFor(req.url ?? "/");
  if (!file) {
    res.writeHead(404).end("Not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(Number(portText), "127.0.0.1", () => {
  console.log(`Serving ${folder} on http://127.0.0.1:${portText}`);
});
