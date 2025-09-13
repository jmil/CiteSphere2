import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PubMedService } from "./services/pubmedService";
import { XMLParser } from "./services/xmlParser";
import { insertPaperSchema, insertCitationNetworkSchema, NetworkNode, NetworkEdge, NetworkMetadata } from "@shared/schema";
import { z } from "zod";

const pubmedService = new PubMedService();
const xmlParser = new XMLParser();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Validate DOI format
  app.post("/api/validate-doi", async (req, res) => {
    try {
      const { doi } = req.body;
      
      if (!doi || typeof doi !== "string") {
        return res.status(400).json({ error: "DOI is required" });
      }

      // Basic DOI format validation
      const doiRegex = /^10\.\d{4,}\/[^\s]+$/;
      const isValid = doiRegex.test(doi);
      
      if (isValid) {
        // Check if we can find it in PubMed
        const pmid = await pubmedService.searchByDoi(doi);
        return res.json({ 
          valid: true, 
          found: !!pmid,
          pmid: pmid || undefined 
        });
      }
      
      return res.json({ valid: false, found: false });
    } catch (error) {
      console.error("Error validating DOI:", error);
      res.status(500).json({ error: "Failed to validate DOI" });
    }
  });

  // Generate citation network
  app.post("/api/generate-network", async (req, res) => {
    try {
      const { doi, depth = 2 } = req.body;
      
      if (!doi) {
        return res.status(400).json({ error: "DOI is required" });
      }

      const startTime = Date.now();
      
      // Check if network already exists
      const existingNetwork = await storage.getCitationNetworkByRootDoi(doi, depth);
      if (existingNetwork) {
        return res.json(existingNetwork);
      }

      // Find the root paper
      const rootPmid = await pubmedService.searchByDoi(doi);
      if (!rootPmid) {
        return res.status(404).json({ error: "Paper not found in PubMed" });
      }

      const nodes: NetworkNode[] = [];
      const edges: NetworkEdge[] = [];
      const processedPmids = new Set<string>();

      // Process papers recursively
      const processPaper = async (pmid: string, currentDepth: number): Promise<void> => {
        if (currentDepth > depth || processedPmids.has(pmid)) {
          return;
        }

        processedPmids.add(pmid);
        
        // Get paper details
        const paperDetails = await pubmedService.getPaperDetails(pmid);
        if (!paperDetails) return;

        // Store paper in database
        let paper = await storage.getPaperByPmid(pmid);
        if (!paper) {
          paper = await storage.createPaper({
            pmid: paperDetails.pmid,
            doi: paperDetails.doi,
            title: paperDetails.title,
            authors: paperDetails.authors,
            journal: paperDetails.journal,
            year: paperDetails.year,
            abstract: paperDetails.abstract,
            citationCount: 0,
            references: [],
            citedBy: []
          });
        }

        // Add to network nodes
        nodes.push({
          id: pmid,
          pmid: paperDetails.pmid,
          doi: paperDetails.doi,
          title: paperDetails.title,
          authors: paperDetails.authors,
          journal: paperDetails.journal,
          year: paperDetails.year,
          citationCount: 0,
          level: currentDepth
        });

        if (currentDepth < depth) {
          // Get papers that cite this one
          const citingPapers = await pubmedService.findSimilarPapers(pmid, 5);
          for (const citingPmid of citingPapers) {
            if (!processedPmids.has(citingPmid)) {
              edges.push({
                source: citingPmid,
                target: pmid,
                type: 'cites'
              });
              await processPaper(citingPmid, currentDepth + 1);
            }
          }

          // Get related papers (simulating references)
          const relatedPapers = await pubmedService.getRelatedPapers(pmid, 3);
          for (const relatedPmid of relatedPapers) {
            if (!processedPmids.has(relatedPmid)) {
              edges.push({
                source: pmid,
                target: relatedPmid,
                type: 'cites'
              });
              await processPaper(relatedPmid, currentDepth + 1);
            }
          }
        }
      };

      await processPaper(rootPmid, 0);

      const processingTime = Date.now() - startTime;
      
      const metadata: NetworkMetadata = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        processingTime,
        maxDepth: depth
      };

      // Create and store network
      const network = await storage.createCitationNetwork({
        rootDoi: doi,
        depth,
        nodes,
        edges,
        metadata
      });

      res.json(network);
    } catch (error) {
      console.error("Error generating network:", error);
      res.status(500).json({ error: "Failed to generate citation network" });
    }
  });

  // Get paper details
  app.get("/api/paper/:pmid", async (req, res) => {
    try {
      const { pmid } = req.params;
      
      let paper = await storage.getPaperByPmid(pmid);
      if (!paper) {
        const paperDetails = await pubmedService.getPaperDetails(pmid);
        if (!paperDetails) {
          return res.status(404).json({ error: "Paper not found" });
        }
        
        paper = await storage.createPaper({
          pmid: paperDetails.pmid,
          doi: paperDetails.doi,
          title: paperDetails.title,
          authors: paperDetails.authors,
          journal: paperDetails.journal,
          year: paperDetails.year,
          abstract: paperDetails.abstract,
          citationCount: 0,
          references: [],
          citedBy: []
        });
      }
      
      res.json(paper);
    } catch (error) {
      console.error("Error fetching paper:", error);
      res.status(500).json({ error: "Failed to fetch paper details" });
    }
  });

  // Get existing networks
  app.get("/api/networks", async (req, res) => {
    try {
      // Since we're using in-memory storage, we can't easily list all networks
      // This would be implemented differently with a real database
      res.json([]);
    } catch (error) {
      console.error("Error fetching networks:", error);
      res.status(500).json({ error: "Failed to fetch networks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
