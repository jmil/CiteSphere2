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
      console.log(`Searching for DOI: ${doi}`);
      const rootPmid = await pubmedService.searchByDoi(doi);
      console.log(`Found PMID: ${rootPmid}`);
      
      if (!rootPmid) {
        return res.status(404).json({ error: "Paper not found in PubMed" });
      }

      const nodes: NetworkNode[] = [];
      const edges: NetworkEdge[] = [];
      const processedPmids = new Set<string>();

      console.log(`\n=== Starting network generation for DOI: ${doi}, depth: ${depth} ===`);
      console.log(`Initial state: ${nodes.length} nodes, ${edges.length} edges`);

      // Process papers recursively
      const processPaper = async (pmid: string, currentDepth: number): Promise<void> => {
        console.log(`\n>>> Processing paper at depth ${currentDepth}: PMID ${pmid}`);
        console.log(`    Current network state: ${nodes.length} nodes, ${edges.length} edges`);
        
        if (currentDepth > depth || processedPmids.has(pmid)) {
          console.log(`    ⚠️ Skipping: depth exceeded (${currentDepth} > ${depth}) or already processed`);
          return;
        }

        processedPmids.add(pmid);
        console.log(`    ✓ Added PMID ${pmid} to processed set (total: ${processedPmids.size})`);
        
        // Get paper details
        const paperDetails = await pubmedService.getPaperDetails(pmid);
        if (!paperDetails) {
          console.log(`  No paper details found for PMID ${pmid}`);
          return;
        }
        console.log(`  Found paper: "${paperDetails.title}"`);
        

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
        const node = {
          id: pmid,
          pmid: paperDetails.pmid,
          doi: paperDetails.doi,
          title: paperDetails.title,
          authors: paperDetails.authors,
          journal: paperDetails.journal,
          year: paperDetails.year,
          citationCount: 0,
          level: currentDepth
        };
        nodes.push(node);
        console.log(`    ✓ Added node #${nodes.length}: "${node.title.substring(0, 50)}..."`);
        console.log(`    Node details: PMID=${node.pmid}, DOI=${node.doi || 'N/A'}, Year=${node.year || 'N/A'}`);

        if (currentDepth < depth) {
          console.log(`    → Fetching connections (currentDepth ${currentDepth} < maxDepth ${depth})`);
          
          // Get papers that cite this one
          console.log(`    → Looking for papers citing PMID ${pmid}...`);
          const citingPapers = await pubmedService.findSimilarPapers(pmid, 5);
          console.log(`    ✓ Found ${citingPapers.length} citing papers`);
          
          const citingPromises: Promise<void>[] = [];
          for (const citingPmid of citingPapers) {
            if (!processedPmids.has(citingPmid)) {
              edges.push({
                source: citingPmid,
                target: pmid,
                type: 'cites'
              });
              console.log(`      + Added edge: ${citingPmid} → ${pmid} (total edges: ${edges.length})`);
              citingPromises.push(processPaper(citingPmid, currentDepth + 1));
            } else {
              console.log(`      - Skipping already processed: ${citingPmid}`);
            }
          }

          // Get related papers (simulating references)
          console.log(`    → Looking for related papers to PMID ${pmid}...`);
          const relatedPapers = await pubmedService.getRelatedPapers(pmid, 3);
          console.log(`    ✓ Found ${relatedPapers.length} related papers`);
          
          const relatedPromises: Promise<void>[] = [];
          for (const relatedPmid of relatedPapers) {
            if (!processedPmids.has(relatedPmid)) {
              edges.push({
                source: pmid,
                target: relatedPmid,
                type: 'cites'
              });
              console.log(`      + Added edge: ${pmid} → ${relatedPmid} (total edges: ${edges.length})`);
              relatedPromises.push(processPaper(relatedPmid, currentDepth + 1));
            } else {
              console.log(`      - Skipping already processed: ${relatedPmid}`);
            }
          }
          
          // Process all papers in parallel
          console.log(`    → Processing ${citingPromises.length + relatedPromises.length} papers in parallel...`);
          await Promise.all([...citingPromises, ...relatedPromises]);
          console.log(`    ✓ Completed processing connections for PMID ${pmid}`);
        } else {
          console.log(`    → Reached max depth ${depth}, not fetching connections`);
        }
      };

      console.log(`\n>>> Starting recursive processing from root PMID: ${rootPmid}`);
      await processPaper(rootPmid, 0);
      
      console.log(`\n=== Network generation completed ===`);
      console.log(`Final network: ${nodes.length} nodes, ${edges.length} edges`);
      console.log(`Processed PMIDs: ${Array.from(processedPmids).join(', ')}`);
      
      // Debug: Log all nodes
      console.log(`\nNodes in network:`);
      nodes.forEach((node, idx) => {
        console.log(`  ${idx + 1}. PMID: ${node.pmid}, Level: ${node.level}, Title: "${node.title.substring(0, 40)}..."`);
      });
      
      // Debug: Log all edges
      console.log(`\nEdges in network:`);
      edges.forEach((edge, idx) => {
        console.log(`  ${idx + 1}. ${edge.source} → ${edge.target} (${edge.type})`);
      });

      const processingTime = Date.now() - startTime;
      
      const metadata: NetworkMetadata = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        processingTime,
        maxDepth: depth
      };

      // Create and store network
      console.log(`\n>>> Storing network in database...`);
      console.log(`Data to store: rootDoi=${doi}, depth=${depth}, nodes=${nodes.length}, edges=${edges.length}`);
      
      const network = await storage.createCitationNetwork({
        rootDoi: doi,
        depth,
        nodes: nodes,
        edges: edges,
        metadata: metadata
      });
      
      console.log(`✓ Network stored with ID: ${network.id}`);
      console.log(`Stored network has ${network.nodes?.length || 0} nodes and ${network.edges?.length || 0} edges`);

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
