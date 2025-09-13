import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const papers = pgTable("papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pmid: text("pmid").unique(),
  doi: text("doi").unique(),
  title: text("title").notNull(),
  authors: jsonb("authors").$type<string[] | null>().default(sql`'[]'::jsonb`),
  journal: text("journal"),
  year: integer("year"),
  abstract: text("abstract"),
  citationCount: integer("citation_count").default(0),
  references: jsonb("references").$type<string[] | null>().default(sql`'[]'::jsonb`),
  citedBy: jsonb("cited_by").$type<string[] | null>().default(sql`'[]'::jsonb`),
  xmlData: text("xml_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const citationNetworks = pgTable("citation_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootDoi: text("root_doi").notNull(),
  depth: integer("depth").notNull(),
  nodes: jsonb("nodes").$type<NetworkNode[] | null>().default(sql`'[]'::jsonb`),
  edges: jsonb("edges").$type<NetworkEdge[] | null>().default(sql`'[]'::jsonb`),
  metadata: jsonb("metadata").$type<NetworkMetadata | null>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for JSON shapes
const networkNodeZ = z.object({
  id: z.string(),
  pmid: z.string().optional(),
  doi: z.string().optional(),
  title: z.string(),
  authors: z.array(z.string()),
  journal: z.string().optional(),
  year: z.number().int().optional(),
  citationCount: z.number().int(),
  level: z.number().int(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const networkEdgeZ = z.object({
  source: z.string(),
  target: z.string(),
  type: z.enum(['cites', 'cited_by']),
});

const networkMetadataZ = z.object({
  totalNodes: z.number().int(),
  totalEdges: z.number().int(),
  processingTime: z.number().int(),
  maxDepth: z.number().int(),
});

export const insertPaperSchema = createInsertSchema(papers, {
  authors: z.array(z.string()).nullable().optional(),
  references: z.array(z.string()).nullable().optional(),
  citedBy: z.array(z.string()).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCitationNetworkSchema = createInsertSchema(citationNetworks, {
  nodes: z.array(networkNodeZ).nullable().optional(),
  edges: z.array(networkEdgeZ).nullable().optional(),
  metadata: networkMetadataZ.nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papers.$inferSelect;
export type InsertCitationNetwork = z.infer<typeof insertCitationNetworkSchema>;
export type CitationNetwork = typeof citationNetworks.$inferSelect;

export interface NetworkNode {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  citationCount: number;
  level: number;
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: 'cites' | 'cited_by';
}

export interface NetworkMetadata {
  totalNodes: number;
  totalEdges: number;
  processingTime: number;
  maxDepth: number;
}

export interface PubMedSearchResult {
  pmid: string;
  doi?: string;
  title: string;
  authors: string[];
  journal?: string;
  year?: number;
  abstract?: string;
}
