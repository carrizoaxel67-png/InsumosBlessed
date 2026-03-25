// get-products.js — Lee inventario desde Netlify Blobs

const { getStore } = require("@netlify/blobs");

function buildStore() {
    const ctx = process.env.NETLIFY_BLOBS_CONTEXT;
    if (ctx) {
        try {
            const parsed = JSON.parse(Buffer.from(ctx, "base64").toString("utf8"));
            return getStore({ name: "products", siteID: parsed.siteID, token: parsed.token });
        } catch (_) {}
    }
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_TOKEN;
    if (siteID && token) {
        return getStore({ name: "products", siteID, token });
    }
    return getStore("products");
}

exports.handler = async () => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
    };

    try {
        const store = buildStore();
        const data = await store.getJSON("inventory");
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data || { perfumes: null, vapes: null })
        };
    } catch (err) {
        console.error("Blobs get error:", err.message);
        return { statusCode: 200, headers, body: JSON.stringify({ perfumes: null, vapes: null }) };
    }
};
