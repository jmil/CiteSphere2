import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const papers = pgTable("papers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pmid: text("pmid").unique(),
  doi: text("doi").unique(),
  title: text("title").notNull(),
  authors: jsonb("authors").$type<string[]>().default([]),
  journal: text("journal"),
  year: integer("year"),
  abstract: text("abstract"),
  citationCount: integer("citation_count").default(0),
  references: jsonb("references").$type<string[]>().default([]),
  citedBy: jsonb("cited_by").$type<string[]>().default([]),
  xmlData: text("xml_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const citationNetworks = pgTable("citation_networks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rootDoi: text("root_doi").notNull(),
  depth: integer("depth").notNull(),
  nodes: jsonb("nodes").$type<NetworkNode[]>().default([]),
  edges: jsonb("edges").$type<NetworkEdge[]>().default([]),
  metadata: jsonb("metadata").$type<NetworkMetadata>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaperSchema = createInsertSchema(papers).omit({
  id: true,
  createdAt: true,
});

export const insertCitationNetworkSchema = createInsertSchema(citationNetworks).omit({
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
