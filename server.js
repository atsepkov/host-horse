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

// Theme configuration
const HOME_THEME = "software";
const FOREIGN_THEME = "investing";
const FOREIGN_SITE_URL = "https://investomation.com";

const JSON_HEADERS = { "Content-Type": "application/json" };
const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };
const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripHtmlTags(html) {
  return String(html).replace(/<[^>]*>/g, "");
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function injectBlogPost(html, post, related) {
  // Show blog view, show post panel, hide list
  html = html.replace('<div class="page">', '<div class="page show-blog">');
  html = html.replace(
    '<div id="blog-post" style="display:none">',
    '<div id="blog-post">'
  );
  html = html.replace('<div id="blog-list">', '<div id="blog-list" style="display:none">');

  // Replace back button with <a> link
  html = html.replace(
    /<button class="blog-back" id="blog-back-btn">[^<]*<\/button>/,
    '<a href="/blog" class="blog-back" id="blog-back-btn">&larr; Back to blog</a>'
  );

  // Inject post meta (author + date)
  const metaHtml = `${post.author ? `<span class="author">${escHtml(post.author)}</span>` : ""}<span>${formatDate(post.created)}</span>`;
  html = html.replace(
    '<div class="blog-post-meta" id="blog-post-meta"></div>',
    () => `<div class="blog-post-meta" id="blog-post-meta">${metaHtml}</div>`
  );

  // Inject content with optional foreign banner and paywall gate
  const foreign = !(post.tags || []).some((t) => t.theme === HOME_THEME);
  const foreignBanner = foreign
    ? `<div class="blog-foreign-banner">This post is from <a href="https://investomation.com/blog/${post.slug}">investomation.com</a></div>`
    : "";
  const paywallGate = post.paywallTier
    ? `<div class="paywall-gate"><div class="paywall-lock">🔒</div><p>This content is free — all I ask is that you create an account to continue reading.</p><a href="${FOREIGN_SITE_URL}/blog/${post.slug}" class="paywall-cta">Continue reading on Investomation →</a></div>`
    : "";
  const contentHtml = foreignBanner + (post.content || "<p>No content available.</p>") + paywallGate;
  html = html.replace(
    '<div id="blog-post-content"></div>',
    () => `<div id="blog-post-content" data-slug="${escHtml(post.slug)}">${contentHtml}</div>`
  );

  // Inject tag chips as links
  const tagsHtml = (post.tags || [])
    .map((t) => {
      const themeClass = t.theme === FOREIGN_THEME ? " theme-investing" : "";
      return `<a href="/blog?tags=${encodeURIComponent(t.slug)}" class="chip${themeClass}" data-tag="${escHtml(t.slug)}" data-theme="${escHtml(t.theme || "shared")}">${escHtml(t.name)}</a>`;
    })
    .join("");
  html = html.replace(
    '<div class="blog-post-tags" id="blog-post-tags"></div>',
    () => `<div class="blog-post-tags" id="blog-post-tags">${tagsHtml}</div>`
  );

  // Inject related posts as link cards
  const relatedHtml =
    related && related.length
      ? `<h3>Related posts</h3><div class="blog-related-grid">${related
          .map(
            (r) =>
              `<a href="/blog/${encodeURIComponent(r.slug)}" class="blog-related-card"><img class="related-thumb" src="${escHtml(r.thumbnail || "")}" alt="${escHtml(r.title)}" /><div class="related-body"><div class="related-title">${escHtml(r.title)}</div><div class="related-date">${formatDate(r.created)}</div></div></a>`
          )
          .join("")}</div>`
      : "";
  html = html.replace(
    '<div class="blog-related" id="blog-related"></div>',
    () => `<div class="blog-related" id="blog-related">${relatedHtml}</div>`
  );

  return html;
}

function injectBlogIndex(html, posts, allTags, opts) {
  const { offset = 0, total = 0, activeTags = [] } = opts;

  // Show blog view
  html = html.replace('<div class="page">', '<div class="page show-blog">');

  // Inject tag filter chips as links
  const TAG_LIMIT = 10;
  const FOREIGN_TAG_LIMIT = 5;
  const homeTags = allTags.filter((t) => t.theme === HOME_THEME || t.theme === "shared" || !t.theme);
  const foreignTags = allTags.filter((t) => t.theme === FOREIGN_THEME);
  const homeHiddenCount = Math.max(0, homeTags.length - TAG_LIMIT);
  const foreignHiddenCount = Math.max(0, foreignTags.length - FOREIGN_TAG_LIMIT);

  function tagUrl(tagSlug) {
    const newTags = activeTags.includes(tagSlug)
      ? activeTags.filter((s) => s !== tagSlug)
      : [...activeTags, tagSlug];
    return newTags.length ? `/blog?tags=${newTags.map(encodeURIComponent).join(",")}` : "/blog";
  }

  let filtersHtml = "";
  homeTags.forEach((t, i) => {
    const active = activeTags.includes(t.slug) ? " active" : "";
    const hidden = i >= TAG_LIMIT ? " hidden-tag" : "";
    filtersHtml += `<a href="${tagUrl(t.slug)}" class="chip${active}${hidden}" data-tag="${escHtml(t.slug)}" data-theme="${escHtml(t.theme || "shared")}">${escHtml(t.name)} (${t.count})</a>`;
  });
  if (homeHiddenCount > 0) {
    filtersHtml += `<span class="chip toggle-more" id="tag-toggle" data-collapsed-text="+${homeHiddenCount} more software">+${homeHiddenCount} more software</span>`;
  }
  if (foreignTags.length > 0) {
    filtersHtml += `<span class="theme-sep"></span>`;
    foreignTags.forEach((t, i) => {
      const active = activeTags.includes(t.slug) ? " active" : "";
      const hidden = i >= FOREIGN_TAG_LIMIT ? " hidden-tag" : "";
      filtersHtml += `<a href="${tagUrl(t.slug)}" class="chip theme-investing${active}${hidden}" data-tag="${escHtml(t.slug)}" data-theme="${escHtml(t.theme)}">${escHtml(t.name)} (${t.count})</a>`;
    });
    if (foreignHiddenCount > 0) {
      filtersHtml += `<span class="chip toggle-more theme-investing" id="tag-toggle-foreign" data-collapsed-text="+${foreignHiddenCount} more investing">+${foreignHiddenCount} more investing</span>`;
    }
  }
  html = html.replace(
    '<div id="blog-filters" class="blog-filters"></div>',
    () => `<div id="blog-filters" class="blog-filters">${filtersHtml}</div>`
  );

  // Inject post cards as links
  const cardsHtml = posts
    .map((p) => {
      const summary = stripHtmlTags(p.summary || "").slice(0, 120);
      const isForeign = !(p.tags || []).some((t) => t.theme === HOME_THEME);
      const badge = isForeign ? `<span class="blog-card-badge">investomation.com</span>` : "";
      const tagChips = (p.tags || [])
        .map((t) => {
          const themeClass = t.theme === FOREIGN_THEME ? " theme-investing" : "";
          return `<span class="chip${themeClass}">${escHtml(t.name)}</span>`;
        })
        .join("");
      return `<a href="/blog/${encodeURIComponent(p.slug)}" class="project-card" style="position:relative;text-decoration:none;color:inherit">${badge}<img class="thumb" src="${escHtml(p.thumbnail || "")}" alt="${escHtml(p.title)} thumbnail"/><div class="card-body"><div class="project-label">${formatDate(p.created)}</div><div class="project-name-row"><div class="project-name">${escHtml(p.title)}</div></div><div class="project-oneliner">${escHtml(summary)}</div></div><div class="hover-area"><div class="tech-label">Tags</div><div class="tech-chips">${tagChips}</div></div></a>`;
    })
    .join("");
  html = html.replace(
    '<div id="blog-grid" class="project-grid"></div>',
    () => `<div id="blog-grid" class="project-grid" data-ssr-rendered="1">${cardsHtml}</div>`
  );

  // Inject pagination as links
  const pageSize = 20;
  const hasPrev = offset > 0;
  const hasNext = offset + pageSize < total;
  let paginationHtml = "";
  if (hasPrev || hasNext) {
    if (hasPrev) {
      const prevOffset = Math.max(0, offset - pageSize);
      const prevParams = activeTags.length ? `tags=${activeTags.map(encodeURIComponent).join(",")}&offset=${prevOffset}` : `offset=${prevOffset}`;
      paginationHtml += `<a href="/blog?${prevParams}" class="blog-pagination-link">Previous</a>`;
    }
    if (hasNext) {
      const nextOffset = offset + pageSize;
      const nextParams = activeTags.length ? `tags=${activeTags.map(encodeURIComponent).join(",")}&offset=${nextOffset}` : `offset=${nextOffset}`;
      paginationHtml += `<a href="/blog?${nextParams}" class="blog-pagination-link">Next</a>`;
    }
  }
  html = html.replace(
    '<div id="blog-pagination" class="blog-pagination"></div>',
    () => `<div id="blog-pagination" class="blog-pagination">${paginationHtml}</div>`
  );

  return html;
}

function injectMeta(html, meta) {
  const tags = blog.renderMetaTags(meta);
  // Replace title and inject OG tags before </head>
  let result = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${meta.title} | host.horse</title>`
  );
  result = result.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${meta.description}">`
  );
  result = result.replace("</head>", `${tags}\n</head>`);
  return result;
}

/**
 * Determine canonical site for a post based on theme-specific tag majority.
 * Returns 'home' if this site is canonical, 'foreign' otherwise.
 */
function getCanonicalSite(postTags) {
  let homeCount = 0;
  let foreignCount = 0;
  for (const t of postTags) {
    if (t.theme === HOME_THEME) homeCount++;
    else if (t.theme === FOREIGN_THEME) foreignCount++;
  }
  // Tie goes to investomation (more content)
  return foreignCount > homeCount ? "foreign" : homeCount > 0 ? "home" : "foreign";
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
      const themesParam = url.searchParams.get("themes");
      const themes = themesParam
        ? themesParam.split(",").filter(Boolean)
        : [HOME_THEME]; // default to home theme only
      const result = blog.listPosts({ limit, offset, tags, themes });
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
            const canonicalSite = getCanonicalSite(redirected.tags || []);
            const { paywallContent, ...safeRedirected } = redirected;
            return jsonResponse({
              ...safeRedirected, related, redirectedFrom: slug,
              ...(canonicalSite === "foreign" ? { canonicalUrl: `${FOREIGN_SITE_URL}/blog/${found}` } : {}),
            });
          }
        }
        return jsonResponse({ error: "not found" }, 404);
      }
      const related = blog.getRelatedPosts(slug, { limit: 6 });
      const canonicalSite = getCanonicalSite(post.tags || []);
      const { paywallContent, ...safePost } = post;
      return jsonResponse({
        ...safePost, related,
        ...(canonicalSite === "foreign" ? { canonicalUrl: `${FOREIGN_SITE_URL}/blog/${post.slug}` } : {}),
      });
    }

    // GET /api/unfurl?url=...
    if (req.method === "GET" && path === "/api/unfurl") {
      const target = (url.searchParams.get("url") || "").trim();
      if (!target) return jsonResponse({ error: "Missing url" }, 400);
      let parsed;
      try { parsed = new URL(target); } catch { return jsonResponse({ error: "Invalid url" }, 400); }
      if (!["http:", "https:"].includes(parsed.protocol)) return jsonResponse({ error: "Unsupported protocol" }, 400);

      let html = "";
      try {
        const resp = await fetch(parsed.toString(), {
          signal: AbortSignal.timeout(5000),
          redirect: "follow",
          headers: { "User-Agent": "HostHorsePreviewBot/1.0" },
        });
        html = await resp.text();
      } catch {
        return jsonResponse({ title: parsed.hostname, description: "", image: "", url: parsed.toString() });
      }

      const extract = (pattern) => { const m = html.match(pattern); return m ? m[1].trim() : ""; };
      const ogTitle = extract(/property=["']og:title["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
      const ogDesc = extract(/property=["']og:description["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+property=["']og:description["']/i);
      const ogImage = extract(/property=["']og:image["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
      const twTitle = extract(/name=["']twitter:title["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+name=["']twitter:title["']/i);
      const twDesc = extract(/name=["']twitter:description["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+name=["']twitter:description["']/i);
      const twImage = extract(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i) || extract(/content=["']([^"']+)["']\s+name=["']twitter:image["']/i);

      return jsonResponse({
        title: ogTitle || twTitle || extract(/<title[^>]*>([^<]+)<\/title>/i) || parsed.hostname,
        description: ogDesc || twDesc || "",
        image: ogImage || twImage || "",
        url: parsed.toString(),
      });
    }

    // GET /api/tags
    if (req.method === "GET" && path === "/api/tags") {
      const filterParam = url.searchParams.get("filter");
      const filterTags = filterParam ? filterParam.split(",").filter(Boolean) : [];
      const tags = blog.listTags({ filterTags });
      return jsonResponse(tags);
    }

    // GET /sitemap.xml — only include posts where this site is canonical
    if (req.method === "GET" && path === "/sitemap.xml") {
      const xml = blog.buildSitemap(
        [{ loc: "/", changefreq: "weekly", priority: "1.0" }],
        (post) => getCanonicalSite(post.tags || []) === "home"
      );
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
        // Single post — inject post-specific meta + SSR content
        const post = await blog.getPost(slug);
        if (post) {
          const meta = blog.getPostMeta(post);
          // Inject canonical URL if this post is primarily foreign
          if (getCanonicalSite(post.tags || []) === "foreign") {
            meta.canonical = `${FOREIGN_SITE_URL}/blog/${post.slug}`;
          }
          const related = blog.getRelatedPosts(slug, { limit: 6 });
          let html = injectMeta(htmlTemplate, meta);
          html = injectBlogPost(html, post, related);
          return new Response(html, { headers: HTML_HEADERS });
        }
        // Try fuzzy match
        const found = blog.findSlug(slug);
        if (found) {
          return Response.redirect(`${siteUrl}/blog/${found}`, 301);
        }
      }

      // Blog index or not-found slug — serve with SSR content
      const tagsParam = url.searchParams.get("tags");
      const activeTags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];
      const offset = parseInt(url.searchParams.get("offset") || "0", 10);
      const { items, total } = blog.listPosts({ limit: 20, offset, tags: activeTags, themes: [HOME_THEME] });
      const allTags = blog.listTags({ filterTags: activeTags });

      const meta = {
        title: "Blog",
        description: "Thoughts on software engineering, data systems, and projects by Alexander Tsepkov.",
        type: "website",
        url: `${siteUrl}/blog`,
        canonical: `${siteUrl}/blog`,
      };
      let html = injectMeta(htmlTemplate, meta);
      html = injectBlogIndex(html, items, allTags, { offset, total, activeTags });
      return new Response(html, { headers: HTML_HEADERS });
    }

    // Homepage with OG tags
    if (path === "/") {
      const meta = {
        title: "host.horse",
        description: "Portfolio and blog by Alexander Tsepkov. Software engineering, AI, and data systems.",
        type: "website",
        url: siteUrl,
        canonical: siteUrl,
      };
      return new Response(injectMeta(htmlTemplate, meta), { headers: HTML_HEADERS });
    }

    // Static file fallback (existing)
    const filePath = `.${decodeURIComponent(path)}`;
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
