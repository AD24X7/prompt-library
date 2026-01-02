const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test database connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('📡 Database disconnected');
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};