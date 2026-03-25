// Netlify Functions v2 — save-products.mjs
// En v2, @netlify/blobs funciona automáticamente sin configuración adicional
import { getStore } from "@netlify/blobs";

export default async (req) => {
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

    try {
        const data = await req.json();
        if (!data.perfumes || !data.vapes) {
            return new Response(JSON.stringify({ error: "Datos inválidos" }), { status: 400, headers });
        }

        const store = getStore("products");
        await store.setJSON("inventory", { perfumes: data.perfumes, vapes: data.vapes });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (err) {
        console.error("Error:", err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
};
