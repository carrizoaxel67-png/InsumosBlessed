// get-products.mjs — Lee inventario desde Neon DB (PostgreSQL)
import { neon } from "@neondatabase/serverless";

export const handler = async () => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
    };

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "DATABASE_URL no configurada", perfumes: null, vapes: null, barber: null })
        };
    }

    try {
        const sql = neon(DATABASE_URL);

        // Crear tabla si no existe
        await sql`
            CREATE TABLE IF NOT EXISTS products_state (
                id VARCHAR(50) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;

        const rows = await sql`SELECT data FROM products_state WHERE id = 'inventory' LIMIT 1`;

        if (!rows || rows.length === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ perfumes: null, vapes: null, barber: null })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(rows[0].data)
        };
    } catch (err) {
        console.error("Neon get error:", err.message);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ perfumes: null, vapes: null, barber: null })
        };
    }
};
