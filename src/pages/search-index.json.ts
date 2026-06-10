import { getCollection } from 'astro:content';
import { allTopics, difficultyLabel } from '@data/curriculum';

/**
 * Static JSON search index, generated at build time.
 * Includes planned topics too, so search doubles as a curriculum browser.
 */
export async function GET() {
  const entries = await getCollection('topics');
  const written = new Set(entries.map((e) => e.id));

  const docs = allTopics.map((t) => ({
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    section: `${t.section.code} ${t.section.title}`,
    difficulty: difficultyLabel[t.difficulty],
    written: written.has(t.slug),
  }));

  return new Response(JSON.stringify(docs), {
    headers: { 'Content-Type': 'application/json' },
  });
}
