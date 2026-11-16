/**
 * Vercel serverless proxy for kisk character upgrades markdown.
 * Avoids browser CORS so the Gear card can show grade + next actions.
 *
 * GET /api/kisk?region=eu&server=Agnita&name=CharacterName
 * Returns plain text markdown or JSON error.
 */
export default async function handler(req, res) {
  // CORS for the SPA
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { region, server, name } = req.query || {};

  if (!region || !server || !name) {
    return res.status(400).json({ error: "Missing region, server or name" });
  }

  const r = String(region).toLowerCase().trim();
  const s = encodeURIComponent(String(server).trim().toLowerCase());
  const n = encodeURIComponent(String(name).trim());

  const url = `https://kisk.app/c/${r}/${s}/${n}/upgrades.md`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "text/markdown",
        "User-Agent": "Devaion/1.0 (Aion 2 companion; +https://dev-aion.vercel.app)"
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `kisk returned ${upstream.status}`
      });
    }

    const text = await upstream.text();

    // Cache briefly (browser + CDN)
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    return res.status(200).send(text);
  } catch (err) {
    console.error("kisk proxy error", err);
    return res.status(502).json({ error: "Failed to reach kisk" });
  }
}
