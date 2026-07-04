#!/usr/bin/env node
// scripts/generate-seo-pages.mjs
//
// Frente B do master prompt (SEO / Descoberta Orgânica) — Opção A escolhida:
// pré-renderização estática. O GitHub Pages só serve arquivos estáticos (não
// executa código, não distingue crawler de humano), então geramos aqui um
// HTML por anúncio ativo com as meta tags corretas (title, description,
// Open Graph, JSON-LD). Um humano que abrir a página é redirecionado pro SPA
// de verdade (index.html#listing/{slug}) via JS; um crawler lê as meta tags
// antes de qualquer JS rodar.
//
// Rodado pelo workflow .github/workflows/generate-seo.yml (agendado + manual).
// Também roda local: `node scripts/generate-seo-pages.mjs`
//
// Depende do endpoint público GET /api/v1/listings/sitemap-data (backend).

import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL  = process.env.MOBYA_API_URL  || 'https://mobya.onrender.com';
const SITE_URL = process.env.MOBYA_SITE_URL || 'https://mobya.com.br';
const OUT_DIR  = path.resolve(process.cwd(), 'anuncio');

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function fmtBRL(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function firstImage(images) {
  if (!Array.isArray(images) || !images.length) return `${SITE_URL}/assets/og-default.jpg`;
  const first = images[0];
  const url = typeof first === 'string' ? first : (first?.url || first?.src);
  return url || `${SITE_URL}/assets/og-default.jpg`;
}

function buildDescription(l) {
  if (l.description && l.description.trim().length > 20) {
    const d = l.description.trim().replace(/\s+/g, ' ');
    return d.length > 155 ? `${d.slice(0, 152)}...` : d;
  }
  const v = l.vehicle;
  const vehicleInfo = v ? `${v.brand || ''} ${v.model || ''} ${v.year || ''}`.trim() : '';
  return `${vehicleInfo ? vehicleInfo + ' — ' : ''}${fmtBRL(l.price)} em ${l.city}/${l.state}. Anúncio verificado na Mobya.`.trim();
}

function pageHtml(l) {
  const title = `${esc(l.title)} — ${fmtBRL(l.price)} | MOBYA`;
  const description = esc(buildDescription(l));
  const image = firstImage(l.images);
  const url = `${SITE_URL}/anuncio/${l.slug}/`;
  const redirectTarget = `/index.html#listing/${encodeURIComponent(l.slug)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: l.title,
    description: buildDescription(l),
    image,
    url,
    ...(l.vehicle?.brand ? { brand: { '@type': 'Brand', name: l.vehicle.brand } } : {}),
    ...(l.vehicle?.model ? { model: l.vehicle.model } : {}),
    ...(l.vehicle?.year ? { vehicleModelDate: String(l.vehicle.year) } : {}),
    ...(l.vehicle?.mileage ? { mileageFromOdometer: { '@type': 'QuantitativeValue', value: l.vehicle.mileage, unitCode: 'KMT' } } : {}),
    offers: {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      url,
    },
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="MOBYA">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${esc(image)}">

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

<script>location.replace(${JSON.stringify(redirectTarget)});</script>
</head>
<body>
  <p>Redirecionando para o anúncio... Se não for redirecionado automaticamente,
  <a href="${redirectTarget}">clique aqui</a>.</p>
  <h1>${esc(l.title)}</h1>
  <p>${description}</p>
  <p>${fmtBRL(l.price)} — ${esc(l.city)}/${esc(l.state)}</p>
  <img src="${esc(image)}" alt="${esc(l.title)}" style="max-width:100%">
</body>
</html>
`;
}

function sitemapXml(listings) {
  const urls = listings.map((l) => `  <url>
    <loc>${SITE_URL}/anuncio/${l.slug}/</loc>
    <lastmod>${new Date(l.updatedAt).toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

const ROBOTS_TXT = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;

async function main() {
  console.log(`[SEO] Buscando anúncios ativos em ${API_URL}/api/v1/listings/sitemap-data ...`);
  const res = await fetch(`${API_URL}/api/v1/listings/sitemap-data`);
  if (!res.ok) throw new Error(`API respondeu ${res.status}`);
  const json = await res.json();
  const listings = json.data || [];
  console.log(`[SEO] ${listings.length} anúncios ativos encontrados.`);

  // Limpa páginas de anúncios que não estão mais ativos (evita lixo acumulando)
  let existingSlugs = [];
  try {
    existingSlugs = await fs.readdir(OUT_DIR);
  } catch { /* pasta ainda não existe na primeira execução */ }
  const activeSlugs = new Set(listings.map((l) => l.slug));
  for (const slug of existingSlugs) {
    if (!activeSlugs.has(slug)) {
      await fs.rm(path.join(OUT_DIR, slug), { recursive: true, force: true });
      console.log(`[SEO] Removido (não está mais ativo): ${slug}`);
    }
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const l of listings) {
    const dir = path.join(OUT_DIR, l.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), pageHtml(l), 'utf-8');
  }
  console.log(`[SEO] ${listings.length} páginas estáticas geradas em /anuncio/*/index.html`);

  await fs.writeFile(path.resolve(process.cwd(), 'sitemap.xml'), sitemapXml(listings), 'utf-8');
  await fs.writeFile(path.resolve(process.cwd(), 'robots.txt'), ROBOTS_TXT, 'utf-8');
  console.log('[SEO] sitemap.xml e robots.txt atualizados.');
}

main().catch((e) => { console.error('[SEO] ERRO:', e.message); process.exit(1); });
