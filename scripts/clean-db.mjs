// Clean all test chats and visitors from the database.
// Run with: node scripts/clean-db.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Cleaning test data from database...");

  const chatCount = await db.chatLog.deleteMany({});
  console.log(`✓ Deleted ${chatCount.count} chat logs`);

  const visitorCount = await db.visitor.deleteMany({});
  console.log(`✓ Deleted ${visitorCount.count} visitors`);

  const remainingChats = await db.chatLog.count();
  const remainingVisitors = await db.visitor.count();
  console.log(`\nDatabase now contains:`);
  console.log(`  - ${remainingVisitors} visitors`);
  console.log(`  - ${remainingChats} chat logs`);
}

main()
  .catch((err) => {
    console.error("Failed to clean database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
