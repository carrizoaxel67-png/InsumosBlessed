import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache" };

    try {
        const store = getStore("inventory");
        const data = await store.get("data", { type: "json" });

        return new Response(JSON.stringify(data || { perfumes: null, vapes: null, barber: null }), { status: 200, headers });
    } catch (err) {
        console.error('Error obteniendo de Blobs:', err);
        return new Response(JSON.stringify({ perfumes: null, vapes: null, barber: null }), { status: 200, headers });
    }
};

export const config = { path: "/api/get-products" };
