import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
  }),
});

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().optional(),
    github: z.string().optional(),
    featured: z.boolean().default(false),
    date: z.date(),
  }),
});

export const collections = {
  blog: blog,
  projects: projects,
};
