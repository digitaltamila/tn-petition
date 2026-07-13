const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": status === 200 ? "public, max-age=3600" : "no-store",
      ...securityHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/pincode\/(\d{6})$/);
    if (!match) return env.ASSETS.fetch(request);
    if (request.method !== "GET")
      return json({ error: "Method not allowed" }, 405);

    const pin = match[1];
    if (!pin.startsWith("6"))
      return json({ error: "Enter a valid Tamil Nadu PIN code." }, 400);

    try {
      const upstream = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        {
          headers: {
            accept: "application/json",
            "user-agent": "Muppadai-Petition/1.0",
          },
          cf: { cacheTtl: 86400, cacheEverything: true },
        },
      );
      if (!upstream.ok)
        return json(
          { error: "Postal directory is temporarily unavailable." },
          502,
        );
      const payload = await upstream.json();
      const result = Array.isArray(payload) ? payload[0] : payload;
      const offices = (result?.PostOffice || []).filter(
        (office) => String(office.State).toLowerCase() === "tamil nadu",
      );
      if (!offices.length)
        return json(
          { error: "No Tamil Nadu postal localities were found." },
          404,
        );
      return json({
        localities: [...new Set(offices.map((office) => office.Name))],
        district: offices[0].District,
        state: "Tamil Nadu",
        source: "postal-directory",
      });
    } catch {
      return json({ error: "Postal lookup failed. Please try again." }, 502);
    }
  },
};
