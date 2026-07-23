import { PrismaClient } from '@prisma/client';
import { cardSeeds } from './data/cards';

const prisma = new PrismaClient();

/**
 * Idempotent seed: upserts on `slug` so re-running never duplicates rows and always
 * brings existing rows up to date with the catalogue in source control.
 */
async function main(): Promise<void> {
  const slugs = cardSeeds.map((card) => card.slug);
  const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate slugs in seed data: ${[...new Set(duplicates)].join(', ')}`);
  }

  for (const seed of cardSeeds) {
    const data = {
      ...seed,
      minAge: seed.minAge ?? 21,
      maxAge: seed.maxAge ?? 60,
      minCreditScore: seed.minCreditScore ?? 700,
      golfBenefit: seed.golfBenefit ?? false,
      insuranceCoverInr: seed.insuranceCoverInr ?? null,
      conciergeService: seed.conciergeService ?? false,
      imageUrl: null,
      isActive: true,
    };
    await prisma.card.upsert({
      where: { slug: seed.slug },
      create: data,
      update: data,
    });
  }

  // Retire any card that has been removed from the catalogue rather than deleting history.
  const retired = await prisma.card.updateMany({
    where: { slug: { notIn: slugs }, isActive: true },
    data: { isActive: false },
  });

  const total = await prisma.card.count({ where: { isActive: true } });
  console.info(`Seeded ${cardSeeds.length} cards (${total} active, ${retired.count} retired).`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
