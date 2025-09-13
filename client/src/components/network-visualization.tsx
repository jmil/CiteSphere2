import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { CitationNetwork, NetworkNode, NetworkEdge } from "@shared/schema";
import * as d3 from "d3";

interface NetworkVisualizationProps {
  network: CitationNetwork | null;
  isLoading: boolean;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  showLabels: boolean;
  highlightCitations: boolean;
  showYearClusters: boolean;
  className?: string;
}

interface D3Node extends NetworkNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

interface D3Link extends NetworkEdge {
  source: D3Node;
  target: D3Node;
}

export function NetworkVisualization({
  network,
  isLoading,
  selectedNodeId,
  onNodeSelect,
  showLabels,
  highlightCitations,
  showYearClusters,
  className,
  ...props
}: NetworkVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  useEffect(() => {
    if (!network || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Create nodes and links for D3
    const nodes: D3Node[] = network.nodes.map(node => ({ ...node }));
    const links: D3Link[] = network.edges.map(edge => ({
      ...edge,
      source: nodes.find(n => n.id === edge.source)!,
      target: nodes.find(n => n.id === edge.target)!,
    }));

    // Color scale based on level
    const colorScale = d3.scaleOrdinal()
      .domain([0, 1, 2, 3, 4])
      .range(["hsl(221.2 83.2% 53.3%)", "hsl(142.1 76.2% 36.3%)", "hsl(47.9 95.8% 53.1%)", "hsl(280 100% 70%)", "hsl(0 84% 60%)"]);

    // Create simulation
    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    // Create container group
    const container = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create links
    const link = container.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("class", "citation-edge")
      .style("stroke", highlightCitations ? "hsl(215.4 16.3% 46.9%)" : "hsl(214.3 31.8% 91.4%)")
      .style("stroke-width", highlightCitations ? 2 : 1)
      .style("opacity", 0.6);

    // Create nodes
    const node = container.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("class", "citation-node")
      .attr("r", d => d.level === 0 ? 12 : (d.level === 1 ? 8 : 6))
      .style("fill", d => colorScale(d.level) as string)
      .style("stroke", "#fff")
      .style("stroke-width", d => d.level === 0 ? 2 : 1.5)
      .style("cursor", "pointer")
      .style("opacity", d => selectedNodeId && selectedNodeId !== d.id ? 0.3 : 1)
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeSelect(selectedNodeId === d.id ? null : d.id);
      })
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        
        // Show tooltip
        if (tooltipRef.current) {
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style("display", "block")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        }
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        
        // Hide tooltip
        if (tooltipRef.current) {
          d3.select(tooltipRef.current).style("display", "none");
        }
      });

    // Add labels if enabled
    let labels: d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown> | null = null;
    if (showLabels) {
      labels = container.append("g")
        .selectAll("text")
        .data(nodes)
        .enter().append("text")
        .attr("class", "node-label")
        .style("font-size", "10px")
        .style("font-weight", "500")
        .style("fill", "hsl(222.2 84% 4.9%)")
        .style("text-anchor", "middle")
        .style("pointer-events", "none")
        .text(d => {
          const firstAuthor = d.authors[0]?.split(",")[0] || "Unknown";
          return `${firstAuthor} ${d.year || ""}`;
        });
    }

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as D3Node).x!)
        .attr("y1", d => (d.source as D3Node).y!)
        .attr("x2", d => (d.target as D3Node).x!)
        .attr("y2", d => (d.target as D3Node).y!);

      node
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      if (labels) {
        labels
          .attr("x", d => d.x!)
          .attr("y", d => d.y! - 15);
      }
    });

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, D3Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Clear selection on background click
    svg.on("click", () => {
      onNodeSelect(null);
    });

    return () => {
      simulation.stop();
    };
  }, [network, selectedNodeId, showLabels, highlightCitations, onNodeSelect]);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "citation-network.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <div className={className} {...props}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Citation Network</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {network && (
                <>
                  <span data-testid="text-node-count">Nodes: {network.nodes.length}</span>
                  <span data-testid="text-edge-count">Edges: {network.edges.length}</span>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadSVG}
                disabled={!network}
                className="text-primary hover:text-primary/80"
                data-testid="button-download-svg"
              >
                <Download className="w-4 h-4 mr-1" />
                Download SVG
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <svg
              ref={svgRef}
              width="100%"
              height="600"
              viewBox="0 0 800 600"
              className="border border-border rounded bg-card"
              data-testid="svg-network-graph"
            />
            
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Building citation network...</p>
                </div>
              </div>
            )}

            {!network && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <p className="text-center">
                  Enter a DOI and click "Generate Network" to visualize citations
                </p>
              </div>
            )}
          </div>
          
          {network && (
            <div className="mt-6 flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Original Paper</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142.1 76.2% 36.3%)" }}></div>
                <span>Direct Citations</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(47.9 95.8% 53.1%)" }}></div>
                <span>Second-level Citations</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute bg-card border border-border rounded-md p-3 shadow-lg z-50 max-w-sm pointer-events-none hidden"
        data-testid="tooltip-paper"
      >
        {hoveredNode && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground" data-testid="tooltip-title">
              {hoveredNode.title}
            </h4>
            <p className="text-xs text-muted-foreground" data-testid="tooltip-authors">
              {hoveredNode.authors.slice(0, 3).join(", ")}
              {hoveredNode.authors.length > 3 && ", et al."}
            </p>
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              {hoveredNode.journal && <span data-testid="tooltip-journal">{hoveredNode.journal}</span>}
              {hoveredNode.year && <span data-testid="tooltip-year">{hoveredNode.year}</span>}
              <span data-testid="tooltip-citations">Citations: {hoveredNode.citationCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
