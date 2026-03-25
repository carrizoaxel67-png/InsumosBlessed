import { getStore } from "@netlify/blobs";

export default async (req, context) => {
    const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

    if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers });
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });

    try {
        const body = await req.json();
        
        // Conectar al store "inventory" (se crea automáticamente si no existe)
        const store = getStore("inventory");
        
        // Guardar el JSON (perfumes y vapes)
        await store.setJSON("data", {
            perfumes: body.perfumes,
            vapes: body.vapes,
            barber: body.barber
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (err) {
        console.error('Error guardando en Blobs:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
};

export const config = { path: "/api/save-products" };
