import { PubMedSearchResult } from "@shared/schema";
import { XMLParser } from "./xmlParser";
import fs from "fs/promises";
import path from "path";

export class PubMedService {
  private baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  private cacheDir = "pubmed_cache";
  private xmlParser = new XMLParser();

  constructor() {
    this.initCacheDir();
  }

  private async initCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create cache directory:", error);
    }
  }

  private getCacheFilePath(pmid: string): string {
    return path.join(this.cacheDir, `${pmid}.xml`);
  }

  private async getCachedXml(pmid: string): Promise<string | null> {
    try {
      const filePath = this.getCacheFilePath(pmid);
      return await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  private async cacheXml(pmid: string, xml: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(pmid);
      await fs.writeFile(filePath, xml, "utf-8");
    } catch (error) {
      console.error(`Failed to cache XML for PMID ${pmid}:`, error);
    }
  }

  async searchByDoi(doi: string): Promise<string | null> {
    try {
      const searchUrl = `${this.baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}[DOI]&retmode=json`;
      console.log(`PubMed API search URL: ${searchUrl}`);
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      console.log(`PubMed API response:`, JSON.stringify(data, null, 2));
      
      if (data.esearchresult?.idlist?.length > 0) {
        return data.esearchresult.idlist[0];
      }
      return null;
    } catch (error) {
      console.error("Error searching by DOI:", error);
      return null;
    }
  }

  async fetchPaperXml(pmid: string): Promise<string | null> {
    // Check cache first
    const cachedXml = await this.getCachedXml(pmid);
    if (cachedXml) {
      console.log(`Using cached XML for PMID ${pmid}`);
      return cachedXml;
    }

    try {
      const fetchUrl = `${this.baseUrl}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
      console.log(`Fetching from PubMed: ${fetchUrl}`);
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xml = await response.text();
      console.log(`Fetched XML for PMID ${pmid}, length: ${xml.length} chars`);
      
      // Cache the XML
      await this.cacheXml(pmid, xml);
      
      return xml;
    } catch (error) {
      console.error(`Error fetching XML for PMID ${pmid}:`, error);
      return null;
    }
  }

  async getPaperDetails(pmid: string): Promise<PubMedSearchResult | null> {
    console.log(`Getting paper details for PMID: ${pmid}`);
    const xml = await this.fetchPaperXml(pmid);
    if (!xml) {
      console.log(`No XML data for PMID: ${pmid}`);
      return null;
    }

    const result = await this.xmlParser.parsePaperXml(xml);
    console.log(`Paper details parsed:`, result?.title ? `"${result.title}"` : 'No title');
    return result;
  }

  async findSimilarPapers(pmid: string, maxResults: number = 20): Promise<string[]> {
    try {
      const linkUrl = `${this.baseUrl}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed_citedin&retmode=json`;
      const response = await fetch(linkUrl);
      const data = await response.json();
      
      const citingPmids: string[] = [];
      if (data.linksets?.[0]?.linksetdbs) {
        for (const linksetdb of data.linksets[0].linksetdbs) {
          if (linksetdb.linkname === "pubmed_pubmed_citedin" && linksetdb.links) {
            citingPmids.push(...linksetdb.links.slice(0, maxResults));
          }
        }
      }
      
      return citingPmids;
    } catch (error) {
      console.error("Error finding similar papers:", error);
      return [];
    }
  }

  async getRelatedPapers(pmid: string, maxResults: number = 10): Promise<string[]> {
    try {
      const linkUrl = `${this.baseUrl}/elink.fcgi?dbfrom=pubmed&db=pubmed&id=${pmid}&linkname=pubmed_pubmed&retmode=json`;
      const response = await fetch(linkUrl);
      const data = await response.json();
      
      const relatedPmids: string[] = [];
      if (data.linksets?.[0]?.linksetdbs) {
        for (const linksetdb of data.linksets[0].linksetdbs) {
          if (linksetdb.linkname === "pubmed_pubmed" && linksetdb.links) {
            relatedPmids.push(...linksetdb.links.slice(0, maxResults));
          }
        }
      }
      
      return relatedPmids;
    } catch (error) {
      console.error("Error finding related papers:", error);
      return [];
    }
  }
}
