import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb(databaseUrl?: string) {
    if (!_db) {
        const url = databaseUrl || process.env.DATABASE_URL;
        if (!url) throw new Error("DATABASE_URL is required");
        _db = drizzle(neon(url));
    }
    return _db;
}

export const db = getDb();
