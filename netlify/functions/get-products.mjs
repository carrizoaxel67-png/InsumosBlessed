// Netlify Functions v2 — get-products.mjs
// En v2, @netlify/blobs funciona automáticamente sin configuración adicional
import { getStore } from "@netlify/blobs";

export default async () => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
    };

    try {
        const store = getStore("products");
        const data = await store.getJSON("inventory");
        return new Response(
            JSON.stringify(data || { perfumes: null, vapes: null }),
            { status: 200, headers }
        );
    } catch (err) {
        console.error("Error:", err.message);
        return new Response(JSON.stringify({ perfumes: null, vapes: null }), { status: 200, headers });
    }
};
