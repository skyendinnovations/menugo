import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/schemas/*.schema.ts",
    out: "./src/drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
