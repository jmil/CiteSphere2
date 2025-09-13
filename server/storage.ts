import { papers, citationNetworks, type Paper, type InsertPaper, type CitationNetwork, type InsertCitationNetwork } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Paper operations
  getPaper(id: string): Promise<Paper | undefined>;
  getPaperByDoi(doi: string): Promise<Paper | undefined>;
  getPaperByPmid(pmid: string): Promise<Paper | undefined>;
  createPaper(paper: InsertPaper): Promise<Paper>;
  updatePaper(id: string, paper: Partial<Paper>): Promise<Paper | undefined>;
  
  // Citation network operations
  getCitationNetwork(id: string): Promise<CitationNetwork | undefined>;
  getCitationNetworkByRootDoi(rootDoi: string, depth: number): Promise<CitationNetwork | undefined>;
  createCitationNetwork(network: InsertCitationNetwork): Promise<CitationNetwork>;
  updateCitationNetwork(id: string, network: Partial<CitationNetwork>): Promise<CitationNetwork | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getPaper(id: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.id, id));
    return paper || undefined;
  }

  async getPaperByDoi(doi: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.doi, doi));
    return paper || undefined;
  }

  async getPaperByPmid(pmid: string): Promise<Paper | undefined> {
    const [paper] = await db.select().from(papers).where(eq(papers.pmid, pmid));
    return paper || undefined;
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const [paper] = await db
      .insert(papers)
      .values([insertPaper])
      .returning();
    return paper;
  }

  async updatePaper(id: string, paperUpdate: Partial<Paper>): Promise<Paper | undefined> {
    const [paper] = await db
      .update(papers)
      .set(paperUpdate)
      .where(eq(papers.id, id))
      .returning();
    return paper || undefined;
  }

  async getCitationNetwork(id: string): Promise<CitationNetwork | undefined> {
    const [network] = await db.select().from(citationNetworks).where(eq(citationNetworks.id, id));
    return network || undefined;
  }

  async getCitationNetworkByRootDoi(rootDoi: string, depth: number): Promise<CitationNetwork | undefined> {
    const [network] = await db
      .select()
      .from(citationNetworks)
      .where(and(eq(citationNetworks.rootDoi, rootDoi), eq(citationNetworks.depth, depth)));
    return network || undefined;
  }

  async createCitationNetwork(insertNetwork: InsertCitationNetwork): Promise<CitationNetwork> {
    const [network] = await db
      .insert(citationNetworks)
      .values([insertNetwork])
      .returning();
    return network;
  }

  async updateCitationNetwork(id: string, networkUpdate: Partial<CitationNetwork>): Promise<CitationNetwork | undefined> {
    const [network] = await db
      .update(citationNetworks)
      .set(networkUpdate)
      .where(eq(citationNetworks.id, id))
      .returning();
    return network || undefined;
  }
}

export const storage = new DatabaseStorage();
