import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import "dotenv/config";

// 1. Setup the connection pool using your DATABASE_URL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Setup the Adapter
const adapter = new PrismaPg(pool);

// 3. Initialize Prisma with the adapter
const prisma = new PrismaClient({
    adapter: adapter, // THIS IS THE KEY FIX
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});

if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("🐘 DB connected via Prisma with PG Adapter");
    } catch (error) {
        console.error(`❌ Database connection error: ${error.message}`);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    await prisma.$disconnect();
};

export { prisma, connectDB, disconnectDB };