import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * A topic's markdown file carries only page-level metadata.
 * Structural data (section, dependencies, difficulty) lives in
 * src/data/curriculum.ts and is joined by slug at build time.
 */
const topics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Minutes of focused reading, shown in the header. */
    readingTime: z.number().optional(),
  }),
});

export const collections = { topics };
