import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';

const FALLBACK_WHEN = 'la procédure est exécutée';
const FALLBACK_THEN = 'le résultat attendu est obtenu';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type CriterionParts = {
  criterionDescription: string;
  given: string;
  when: string;
  then: string;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function parseFrenchCriterion(text: string): CriterionParts | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(
    /^Étant donné qu(?:e|['’])\s*(.*?),\s*quand\s+(.*?),\s*alors\s+(.*?)(?:\.)?$/i,
  );

  if (!match) {
    return null;
  }

  return {
    criterionDescription: '',
    given: match[1].trim(),
    when: match[2].trim(),
    then: match[3].trim(),
  };
}

function normalizeGivenClause(value: string): string {
  return value
    .trim()
    .replace(/^étant donné qu(?:e|['’])\s*/i, '')
    .replace(/^que\s+/i, '');
}

function normalizeWhenClause(value: string): string {
  return value.trim().replace(/^quand\s+/i, '');
}

function normalizeThenClause(value: string): string {
  return value.trim().replace(/^alors\s+/i, '');
}

function normalizeCriterion(input: CriterionParts): CriterionParts {
  const givenTrimmed = input.given.trim();
  const whenTrimmed = input.when.trim();
  const thenTrimmed = input.then.trim();
  const criterionDescriptionRaw = input.criterionDescription.trim();
  const criterionDescription =
    criterionDescriptionRaw && !isUuidLike(criterionDescriptionRaw)
      ? criterionDescriptionRaw
      : '';

  const parsedFromGiven = parseFrenchCriterion(givenTrimmed);
  const isFallbackPair =
    whenTrimmed.toLowerCase() === FALLBACK_WHEN.toLowerCase() &&
    thenTrimmed.toLowerCase() === FALLBACK_THEN.toLowerCase();

  if (parsedFromGiven && (isFallbackPair || !whenTrimmed || !thenTrimmed)) {
    return {
      criterionDescription:
        criterionDescription || parsedFromGiven.given.slice(0, 120).trim(),
      given: normalizeGivenClause(parsedFromGiven.given),
      when: normalizeWhenClause(parsedFromGiven.when),
      then: normalizeThenClause(parsedFromGiven.then),
    };
  }

  return {
    criterionDescription:
      criterionDescription || givenTrimmed.slice(0, 120).trim(),
    given: normalizeGivenClause(givenTrimmed),
    when: normalizeWhenClause(whenTrimmed),
    then: normalizeThenClause(thenTrimmed),
  };
}

async function normalizeProjectAcceptanceCriteria(): Promise<number> {
  const rows = await prisma.fsdAcceptanceCriteria.findMany({
    select: { id: true, criterionDescription: true, given: true, when: true, then: true },
  });

  let updatedCount = 0;

  for (const row of rows) {
    const normalized = normalizeCriterion({
      criterionDescription: row.criterionDescription || '',
      given: row.given,
      when: row.when,
      then: row.then,
    });

    if (
      normalized.given === row.given &&
      normalized.when === row.when &&
      normalized.then === row.then
    ) {
      continue;
    }

    await prisma.fsdAcceptanceCriteria.update({
      where: { id: row.id },
      data: {
        criterionDescription: normalized.criterionDescription,
        given: normalized.given,
        when: normalized.when,
        then: normalized.then,
      },
    });

    updatedCount += 1;
  }

  return updatedCount;
}

async function normalizeStoryAcceptanceCriteria(): Promise<number> {
  const rows = await prisma.fsdUserStoryAcceptanceCriterion.findMany({
    select: { id: true, criterionDescription: true, given: true, when: true, then: true },
  });

  let updatedCount = 0;

  for (const row of rows) {
    const normalized = normalizeCriterion({
      criterionDescription: row.criterionDescription || '',
      given: row.given,
      when: row.when,
      then: row.then,
    });

    if (
      normalized.given === row.given &&
      normalized.when === row.when &&
      normalized.then === row.then
    ) {
      continue;
    }

    await prisma.fsdUserStoryAcceptanceCriterion.update({
      where: { id: row.id },
      data: {
        criterionDescription: normalized.criterionDescription,
        given: normalized.given,
        when: normalized.when,
        then: normalized.then,
      },
    });

    updatedCount += 1;
  }

  return updatedCount;
}

async function main() {
  const [projectCount, storyCount] = await Promise.all([
    normalizeProjectAcceptanceCriteria(),
    normalizeStoryAcceptanceCriteria(),
  ]);

  const total = projectCount + storyCount;
  console.log(`Normalization complete. Updated ${total} row(s).`);
  console.log(`- Project-level criteria: ${projectCount}`);
  console.log(`- User-story criteria: ${storyCount}`);
}

main()
  .catch((error) => {
    console.error('Normalization failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
