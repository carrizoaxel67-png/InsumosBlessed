// save-products.mjs — Guarda inventario en Neon DB (PostgreSQL)
import { neon } from "@neondatabase/serverless";

export const handler = async (event) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

    // Escáner dinámico: Busca automáticamente la conexión a PostgreSQL/Neon sin importar el nombre de la variable
    const DATABASE_URL = process.env.DATABASE_URL || 
                         process.env.NEON_DATABASE_URL || 
                         Object.values(process.env).find(v => typeof v === 'string' && (v.startsWith('postgres://') || v.startsWith('postgresql://')));
                         
    if (!DATABASE_URL) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Ninguna llave de conexión a NEON encontrada en Netlify Variables." })
        };
    }

    try {
        const data = JSON.parse(event.body || "{}");
        // Acepta arrays vacíos (usuario borró todo intencionalmente)
        if (!Array.isArray(data.perfumes) || !Array.isArray(data.vapes)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Datos inválidos: perfumes y vapes deben ser arrays" }) };
        }

        const sql = neon(DATABASE_URL);

        // Crear tabla si no existe aún
        await sql`
            CREATE TABLE IF NOT EXISTS products_state (
                id VARCHAR(50) PRIMARY KEY,
                data JSONB NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `;

        const payload = {
            _seeded: true,  // Flag: NEON fue inicializado intencionalmente por el admin
            perfumes: data.perfumes,
            vapes: data.vapes,
            barber: data.barber || [],
            customStatuses: data.customStatuses || [],
            offers: data.offers || [],
            packs: data.packs || []
        };

        // Upsert con conflicto en id
        await sql`
            INSERT INTO products_state (id, data, updated_at)
            VALUES ('inventory', ${JSON.stringify(payload)}::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE
                SET data = EXCLUDED.data,
                    updated_at = NOW()
        `;

        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
        console.error("Neon save error:", err.name, err.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Error guardando en la base de datos", detail: err.message })
        };
    }
};
