import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'sqlite',
    schema: './src/lib/server/db/schema/**/*.ts',
    out: './migrations',
    dbCredentials: {
        url: process.env.DATABASE_PATH ?? './data/app.sqlite'
    }
});
