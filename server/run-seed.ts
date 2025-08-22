import { seedDatabase } from './seed.ts';

async function main() {
  try {
    await seedDatabase();
    console.log("Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
}

main();