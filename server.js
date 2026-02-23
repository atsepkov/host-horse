import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createBlog } from "blog-system";

mkdirSync("data", { recursive: true });
const db = new Database("data/emails.sqlite");
db.run(
  "CREATE TABLE IF NOT EXISTS emails (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, created_at TEXT)"
);

const insertStmt = db.prepare(
  "INSERT INTO emails (email, created_at) VALUES (?, datetime('now'))"
);

// Blog setup
const siteUrl = process.env.SITE_URL || "https://host.horse";
const blog = createBlog({
  contentDir: "./blog",
  db,
  baseUrl: "/blog",
  blogPathPrefix: "/blog/",
  siteUrl,
});
await blog.init();

// Cache index.html template for meta injection
const htmlTemplate = readFileSync("./index.html", "utf-8");

const JSON_HEADERS = { "Content-Type": "application/json" };
const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };
const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function injectMeta(html, meta) {
  const tags = blog.renderMetaTags(meta);
  // Replace title and inject OG tags before </head>
  let result = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${meta.title} | host.horse</title>`
  );
  result = result.replace("</head>", `${tags}\n</head>`);
  return result;
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".avif"]);

const port = parseInt(process.env.PORT || "3499", 10);

// Kill stale process on port if needed
try {
  const pid = execSync(`lsof -ti:${port}`, { encoding: "utf-8" }).trim();
  if (pid) {
    console.log(`Killing stale process ${pid} on port ${port}`);
    process.kill(parseInt(pid), "SIGTERM");
    Bun.sleepSync(300);
  }
} catch {}

const server = Bun.serve({
  port,
  reusePort: true,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /api/subscribe (existing)
    if (req.method === "POST" && path === "/api/subscribe") {
      try {
        const { email } = await req.json();
        const normalized = String(email || "").trim().toLowerCase();
        if (!normalized) {
          return jsonResponse({ error: "invalid email" }, 400);
        }
        try {
          insertStmt.run(normalized);
          return jsonResponse({ status: "ok" });
        } catch (err) {
          if (String(err).includes("UNIQUE")) {
            return jsonResponse({ status: "duplicate" });
          }
          return jsonResponse({ error: "db error" }, 500);
        }
      } catch {
        return jsonResponse({ error: "invalid request" }, 400);
      }
    }

    // GET /api/posts
    if (req.method === "GET" && path === "/api/posts") {
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const tagsParam = url.searchParams.get("tags");
      const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
      const result = blog.listPosts({ limit, offset, tags });
      return jsonResponse(result);
    }

    // GET /api/posts/:slug
    if (req.method === "GET" && path.startsWith("/api/posts/")) {
      const slug = path.slice("/api/posts/".length);
      if (!slug) return jsonResponse({ error: "missing slug" }, 400);
      const post = await blog.getPost(slug);
      if (!post) {
        // Try fuzzy match
        const found = blog.findSlug(slug);
        if (found) {
          const redirected = await blog.getPost(found);
          if (redirected) {
            const related = blog.getRelatedPosts(found, { limit: 6 });
            return jsonResponse({ ...redirected, related, redirectedFrom: slug });
          }
        }
        return jsonResponse({ error: "not found" }, 404);
      }
      const related = blog.getRelatedPosts(slug, { limit: 6 });
      return jsonResponse({ ...post, related });
    }

    // GET /api/tags
    if (req.method === "GET" && path === "/api/tags") {
      const filterParam = url.searchParams.get("filter");
      const filterTags = filterParam ? filterParam.split(",").filter(Boolean) : [];
      const tags = blog.listTags({ filterTags });
      return jsonResponse(tags);
    }

    // GET /sitemap.xml
    if (req.method === "GET" && path === "/sitemap.xml") {
      const xml = blog.buildSitemap([
        { loc: "/", changefreq: "weekly", priority: "1.0" },
      ]);
      return new Response(xml, { headers: XML_HEADERS });
    }

    // GET /blog or /blog/:slug (HTML with meta injection)
    if (req.method === "GET" && (path === "/blog" || path.startsWith("/blog/"))) {
      const slug = path === "/blog" ? null : path.slice("/blog/".length);

      // If slug looks like a file (has extension), fall through to static serving
      if (slug) {
        const dotIdx = slug.lastIndexOf(".");
        if (dotIdx !== -1) {
          const ext = slug.slice(dotIdx).toLowerCase();
          if (IMAGE_EXTS.has(ext)) {
            const filePath = `.${decodeURIComponent(path)}`;
            if (existsSync(filePath)) return new Response(Bun.file(filePath));
            return new Response("Not found", { status: 404 });
          }
        }
      }

      if (slug) {
        // Single post — inject post-specific meta
        const post = await blog.getPost(slug);
        if (post) {
          const meta = blog.getPostMeta(post);
          return new Response(injectMeta(htmlTemplate, meta), { headers: HTML_HEADERS });
        }
        // Try fuzzy match
        const found = blog.findSlug(slug);
        if (found) {
          return Response.redirect(`${siteUrl}/blog/${found}`, 301);
        }
      }

      // Blog index or not-found slug — serve with generic blog meta
      const meta = {
        title: "Blog",
        description: "Thoughts on software engineering, data systems, and projects by Alexander Tsepkov.",
        type: "website",
        url: `${siteUrl}/blog`,
        canonical: `${siteUrl}/blog`,
      };
      return new Response(injectMeta(htmlTemplate, meta), { headers: HTML_HEADERS });
    }

    // Static file fallback (existing)
    const filePath = `.${path === "/" ? "/index.html" : decodeURIComponent(path)}`;
    if (existsSync(filePath)) return new Response(Bun.file(filePath));
    return new Response("Not found", { status: 404 });
  },
});

// Graceful shutdown
function shutdown() {
  server.stop(true);
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`Server running at http://localhost:${port}`);
