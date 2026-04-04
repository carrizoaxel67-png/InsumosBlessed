// save-products.js — Guarda inventario en Netlify Blobs
// Lee el contexto (siteID + token) del entorno de Netlify automáticamente

const { getStore } = require("@netlify/blobs");

function buildStore() {
    // Netlify inyecta NETLIFY_BLOBS_CONTEXT en todas las funciones en runtime
    const ctx = process.env.NETLIFY_BLOBS_CONTEXT;
    if (ctx) {
        try {
            const parsed = JSON.parse(Buffer.from(ctx, "base64").toString("utf8"));
            return getStore({ name: "products", siteID: parsed.siteID, token: parsed.token });
        } catch (_) {}
    }
    // Fallback: usar NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_TOKEN;
    if (siteID && token) {
        return getStore({ name: "products", siteID, token });
    }
    // Último recurso: intentar sin configuración (funciona en runtimes nuevos)
    return getStore("products");
}

exports.handler = async (event) => {
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

    try {
        const data = JSON.parse(event.body || "{}");
        if (!data.perfumes || !data.vapes) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Datos inválidos" }) };
        }

        const store = buildStore();
        await store.setJSON("inventory", { 
            perfumes: data.perfumes, 
            vapes: data.vapes,
            barber: data.barber || [],
            customStatuses: data.customStatuses || []
        });

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
        console.error("Blobs error:", err.name, err.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Error guardando. Revisá los logs de Netlify Functions.", detail: err.message })
        };
    }
};
