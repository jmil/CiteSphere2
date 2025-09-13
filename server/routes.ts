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
      console.log(`\n=== Starting network generation for DOI: ${doi}, depth: ${depth} ===`);
      console.log(`Searching for DOI: ${doi}`);
      const rootPmid = await pubmedService.searchByDoi(doi);
      
      if (!rootPmid) {
        return res.status(404).json({ error: "Paper not found in PubMed" });
      }
      console.log(`Found root PMID: ${rootPmid}`);

      // PHASE 1: Collect all PMIDs
      console.log(`\n=== PHASE 1: Collecting PMIDs ===`);
      const allPmids = new Set<string>();
      const pmidLevels = new Map<string, number>();
      const collectedEdges: NetworkEdge[] = [];

      // Recursive function to collect PMIDs
      const collectPmids = async (pmid: string, currentDepth: number): Promise<void> => {
        if (currentDepth > depth || allPmids.has(pmid)) {
          return;
        }

        allPmids.add(pmid);
        pmidLevels.set(pmid, Math.min(pmidLevels.get(pmid) ?? currentDepth, currentDepth));
        console.log(`  Depth ${currentDepth}: Added PMID ${pmid} (total: ${allPmids.size})`);

        if (currentDepth < depth) {
          // Get papers that cite this one
          const citingPapers = await pubmedService.findSimilarPapers(pmid, 5);
          console.log(`    Found ${citingPapers.length} papers citing ${pmid}`);
          
          const citingPromises: Promise<void>[] = [];
          for (const citingPmid of citingPapers) {
            if (!allPmids.has(citingPmid)) {
              collectedEdges.push({
                source: citingPmid,
                target: pmid,
                type: 'cites'
              });
              citingPromises.push(collectPmids(citingPmid, currentDepth + 1));
            }
          }

          // Get related papers (simulating references)
          const relatedPapers = await pubmedService.getRelatedPapers(pmid, 3);
          console.log(`    Found ${relatedPapers.length} papers related to ${pmid}`);
          
          const relatedPromises: Promise<void>[] = [];
          for (const relatedPmid of relatedPapers) {
            if (!allPmids.has(relatedPmid)) {
              collectedEdges.push({
                source: pmid,
                target: relatedPmid,
                type: 'cites'
              });
              relatedPromises.push(collectPmids(relatedPmid, currentDepth + 1));
            }
          }
          
          // Process all papers in parallel
          await Promise.all([...citingPromises, ...relatedPromises]);
        }
      };

      // Start collecting from root
      await collectPmids(rootPmid, 0);
      console.log(`\n✓ Phase 1 complete: Collected ${allPmids.size} unique PMIDs`);

      // PHASE 2: Fetch all XML data
      console.log(`\n=== PHASE 2: Fetching XML for ${allPmids.size} papers ===`);
      const pmidArray = Array.from(allPmids);
      const xmlData = new Map<string, string>();
      
      // Fetch XML in batches
      const batchSize = 10;
      for (let i = 0; i < pmidArray.length; i += batchSize) {
        const batch = pmidArray.slice(i, i + batchSize);
        const batchPromises = batch.map(async (pmid) => {
          const xml = await pubmedService.fetchPaperXml(pmid);
          if (xml) {
            xmlData.set(pmid, xml);
            console.log(`  ✓ Fetched XML for PMID ${pmid} (${xmlData.size}/${allPmids.size})`);
          } else {
            console.log(`  ✗ Failed to fetch XML for PMID ${pmid}`);
          }
        });
        await Promise.all(batchPromises);
      }
      console.log(`\n✓ Phase 2 complete: Fetched XML for ${xmlData.size}/${allPmids.size} papers`);

      // PHASE 3: Parse XML and build network
      console.log(`\n=== PHASE 3: Parsing XML and building network ===`);
      const nodes: NetworkNode[] = [];
      const edges: NetworkEdge[] = [];
      const processedPmids = new Set<string>();

      // Parse each XML and create nodes
      for (const [pmid, xml] of Array.from(xmlData.entries())) {
        const paperDetails = await xmlParser.parsePaperXml(xml);
        if (!paperDetails) {
          console.log(`  ✗ Failed to parse XML for PMID ${pmid}`);
          continue;
        }

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
        const node: NetworkNode = {
          id: pmid,
          pmid: paperDetails.pmid,
          doi: paperDetails.doi,
          title: paperDetails.title,
          authors: paperDetails.authors,
          journal: paperDetails.journal,
          year: paperDetails.year,
          citationCount: 0,
          level: pmidLevels.get(pmid) ?? 0
        };
        nodes.push(node);
        processedPmids.add(pmid);
        console.log(`  ✓ Added node ${nodes.length}: "${paperDetails.title.substring(0, 50)}..."`);
      }

      // Filter edges to only include those where both nodes exist
      for (const edge of collectedEdges) {
        if (processedPmids.has(edge.source) && processedPmids.has(edge.target)) {
          edges.push(edge);
        }
      }

      console.log(`\n✓ Phase 3 complete: Created ${nodes.length} nodes and ${edges.length} edges`);

      // Create final network
      const processingTime = Date.now() - startTime;
      
      const metadata: NetworkMetadata = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        processingTime,
        maxDepth: depth
      };

      // Log final statistics
      console.log(`\n=== Network generation completed ===`);
      console.log(`Final statistics:`);
      console.log(`  - Total PMIDs collected: ${allPmids.size}`);
      console.log(`  - XML fetched: ${xmlData.size}`);
      console.log(`  - Nodes created: ${nodes.length}`);
      console.log(`  - Edges created: ${edges.length}`);
      console.log(`  - Processing time: ${processingTime}ms`);
      
      // Store network in database
      console.log(`\nStoring network in database...`);
      const network = await storage.createCitationNetwork({
        rootDoi: doi,
        depth,
        nodes: nodes,
        edges: edges,
        metadata: metadata
      });
      
      console.log(`✓ Network stored with ID: ${network.id}`);

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
