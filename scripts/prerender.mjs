// Static HTML for the pages search engines should read without running JS:
// keyword pages (src/lib/seoPages.ts), the blog index and every article,
// and the English home. Each gets its own <title>, description, canonical,
// hreflang and real text inside #root; React replaces that text on load.
// Runs after `vite build` (see package.json). Cloudflare Pages serves
// dist/<path>.html (pretty URL) before the SPA fallback in _redirects.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const tmp = join(root, 'node_modules', '.prerender-data.mjs');

await build({
  stdin: { contents: "export { SEO_PAGES, SITE_ORIGIN } from './src/lib/seoPages.ts'; export { POSTS, PRODUCT_LABEL } from './src/lib/blog/posts.ts';", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'silent',
});
const { SEO_PAGES, SITE_ORIGIN, POSTS, PRODUCT_LABEL } = await import(pathToFileURL(tmp).href);
rmSync(tmp, { force: true });

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ path, lang, title, description, alternates = [], jsonld = [], body, ogType = 'website' }) {
  const url = `${SITE_ORIGIN}${path}`;
  let html = template
    .replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}">`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(description)}">`)
    .replace(/<meta property="og:type" content="[^"]*"\s*\/?>/, `<meta property="og:type" content="${ogType}">`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${esc(description)}">`);
  const head = [
    ...alternates.map(([hl, p]) => `<link rel="alternate" hreflang="${hl}" href="${SITE_ORIGIN}${p}">`),
    ...jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ');
  if (head) html = html.replace('</head>', `    ${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main class="prerender">${body}</main></div>`);
  const file = join(dist, `${path.replace(/^\//, '')}.html`); // Pages serves /x from x.html
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return path;
}

const nav = (lang) => `<nav><a href="${lang === 'fr' ? '/' : '/en'}">Atlas CRM</a> · <a href="${lang === 'fr' ? '/auth' : '/en/auth'}">${lang === 'fr' ? 'Essai gratuit' : 'Free trial'}</a> · <a href="${lang === 'fr' ? '/demo' : '/en/demo'}">${lang === 'fr' ? 'Démo' : 'Demo'}</a> · <a href="${lang === 'fr' ? '/blog' : '/en/blog'}">Blog</a></nav>`;
const done = [];

for (const p of SEO_PAGES) {
  const body = `${nav(p.lang)}<h1>${esc(p.h1)}</h1><p>${esc(p.intro)}</p>`
    + p.sections.map((s) => `<h2>${esc(s.h2)}</h2><p>${esc(s.p)}</p>${s.items ? `<ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}`).join('')
    + `<h2>${p.lang === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>` + p.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')
    + `<ul>${SEO_PAGES.filter((o) => o.lang === p.lang && o.path !== p.path).map((o) => `<li><a href="${o.path}">${esc(o.h1)}</a></li>`).join('')}</ul>`;
  done.push(page({
    path: p.path, lang: p.lang, title: p.title, description: p.description, body,
    alternates: [[p.lang, p.path], [p.lang === 'fr' ? 'en' : 'fr', p.alt], ['x-default', p.lang === 'fr' ? p.path : p.alt]],
    jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }],
  }));
}

for (const lang of ['fr', 'en']) {
  const prefix = lang === 'fr' ? '' : '/en';
  const sorted = POSTS.slice().sort((a, b) => b.date.localeCompare(a.date));
  done.push(page({
    path: `${prefix}/blog`, lang,
    title: lang === 'fr' ? 'Blog Liafrik Tech — Atlas, POS, Sukulu, Zanldo' : 'Liafrik Tech blog — Atlas, POS, Sukulu, Zanldo',
    description: lang === 'fr' ? 'Articles sur les produits Liafrik : Atlas CRM, la caisse POS, la plateforme scolaire Sukulu et la marketplace Zanldo, conçus en Afrique.' : 'Articles on Liafrik products: Atlas CRM, the POS till, the Sukulu school platform and the Zanldo marketplace, built in Africa.',
    alternates: [['fr', '/blog'], ['en', '/en/blog'], ['x-default', '/blog']],
    body: `${nav(lang)}<h1>${lang === 'fr' ? 'Le blog Liafrik' : 'The Liafrik blog'}</h1><ul>${sorted.map((p) => `<li><a href="${prefix}/blog/${p.slug}">${esc(p[lang].title)}</a> — ${esc(p[lang].dek)}</li>`).join('')}</ul>`,
  }));
  for (const p of POSTS) {
    const c = p[lang];
    const blocks = c.body.map((b) => b.t === 'p' ? `<p>${esc(b.text)}</p>` : b.t === 'h2' ? `<h2>${esc(b.text)}</h2>` : b.t === 'ul' ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : b.t === 'quote' ? `<blockquote>${esc(b.text)}</blockquote>` : `<aside><strong>${esc(b.title)}</strong> ${esc(b.text)}</aside>`).join('');
    done.push(page({
      path: `${prefix}/blog/${p.slug}`, lang, ogType: 'article',
      title: `${c.title} — Blog Liafrik`, description: c.dek,
      alternates: [['fr', `/blog/${p.slug}`], ['en', `/en/blog/${p.slug}`], ['x-default', `/blog/${p.slug}`]],
      jsonld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: c.title, description: c.dek, datePublished: p.date, inLanguage: lang, author: { '@type': 'Organization', name: 'Liafrik Tech' }, publisher: { '@type': 'Organization', name: 'Liafrik Tech', url: 'https://liafrik.com' }, about: PRODUCT_LABEL[p.product], mainEntityOfPage: `${SITE_ORIGIN}${prefix}/blog/${p.slug}` }],
      body: `${nav(lang)}<article><h1>${esc(c.title)}</h1><p>${esc(c.dek)}</p>${blocks}</article>`,
    }));
  }
}

done.push(page({
  path: '/en', lang: 'en',
  title: 'Atlas CRM — online CRM with AI, built in Africa · Free trial',
  description: 'Atlas is an online CRM built in Africa by Liafrik Tech: contacts, pipeline, invoices, mobile money payments, call-center tools and AI. 14-day free trial, no card.',
  alternates: [['fr', '/'], ['en', '/en'], ['x-default', '/']],
  body: `${nav('en')}<h1>The online CRM built in Africa, ready for the world</h1><p>Contacts, pipeline, quotes and invoices, mobile money payment links, WhatsApp and SMS from the record, call-center tools and Ask Atlas AI. 14-day free trial, no card.</p><ul>${SEO_PAGES.filter((p) => p.lang === 'en').map((p) => `<li><a href="${p.path}">${esc(p.h1)}</a></li>`).join('')}</ul>`,
}));

console.log(`prerender: ${done.length} pages`);
