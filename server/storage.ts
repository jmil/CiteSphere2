import { type Paper, type InsertPaper, type CitationNetwork, type InsertCitationNetwork } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private papers: Map<string, Paper>;
  private citationNetworks: Map<string, CitationNetwork>;

  constructor() {
    this.papers = new Map();
    this.citationNetworks = new Map();
  }

  async getPaper(id: string): Promise<Paper | undefined> {
    return this.papers.get(id);
  }

  async getPaperByDoi(doi: string): Promise<Paper | undefined> {
    return Array.from(this.papers.values()).find(paper => paper.doi === doi);
  }

  async getPaperByPmid(pmid: string): Promise<Paper | undefined> {
    return Array.from(this.papers.values()).find(paper => paper.pmid === pmid);
  }

  async createPaper(insertPaper: InsertPaper): Promise<Paper> {
    const id = randomUUID();
    const paper: Paper = { 
      ...insertPaper, 
      id,
      createdAt: new Date()
    };
    this.papers.set(id, paper);
    return paper;
  }

  async updatePaper(id: string, paperUpdate: Partial<Paper>): Promise<Paper | undefined> {
    const paper = this.papers.get(id);
    if (!paper) return undefined;
    
    const updatedPaper = { ...paper, ...paperUpdate };
    this.papers.set(id, updatedPaper);
    return updatedPaper;
  }

  async getCitationNetwork(id: string): Promise<CitationNetwork | undefined> {
    return this.citationNetworks.get(id);
  }

  async getCitationNetworkByRootDoi(rootDoi: string, depth: number): Promise<CitationNetwork | undefined> {
    return Array.from(this.citationNetworks.values()).find(
      network => network.rootDoi === rootDoi && network.depth === depth
    );
  }

  async createCitationNetwork(insertNetwork: InsertCitationNetwork): Promise<CitationNetwork> {
    const id = randomUUID();
    const network: CitationNetwork = { 
      ...insertNetwork, 
      id,
      createdAt: new Date()
    };
    this.citationNetworks.set(id, network);
    return network;
  }

  async updateCitationNetwork(id: string, networkUpdate: Partial<CitationNetwork>): Promise<CitationNetwork | undefined> {
    const network = this.citationNetworks.get(id);
    if (!network) return undefined;
    
    const updatedNetwork = { ...network, ...networkUpdate };
    this.citationNetworks.set(id, updatedNetwork);
    return updatedNetwork;
  }
}

export const storage = new MemStorage();
