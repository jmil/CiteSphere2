import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DOIInput } from "@/components/doi-input";
import { DepthControl } from "@/components/depth-control";
import { VisualizationControls } from "@/components/visualization-controls";
import { StatusPanel } from "@/components/status-panel";
import { PaperDetails } from "@/components/paper-details";
import { NetworkVisualization } from "@/components/network-visualization";
import { StatisticsPanel } from "@/components/statistics-panel";
import { useNetworkData } from "@/hooks/use-network-data";

export default function Visualizer() {
  const [selectedDoi, setSelectedDoi] = useState<string>("10.1126/science.1225829");
  const [depth, setDepth] = useState<number>(2);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [highlightCitations, setHighlightCitations] = useState<boolean>(true);
  const [showYearClusters, setShowYearClusters] = useState<boolean>(false);
  
  const { 
    network, 
    isLoading, 
    error, 
    generateNetwork, 
    clearNetwork 
  } = useNetworkData();

  const handleGenerate = () => {
    if (selectedDoi) {
      generateNetwork(selectedDoi, depth);
    }
  };

  const selectedNode = network?.nodes.find(node => node.id === selectedNodeId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Scientific Citation Visualizer</h1>
              <p className="text-muted-foreground mt-1">Explore citation networks and research connections</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Powered by PubMed API</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Control Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 space-y-6">
              <DOIInput 
                value={selectedDoi}
                onChange={setSelectedDoi}
                data-testid="doi-input"
              />
              
              <DepthControl 
                value={depth}
                onChange={setDepth}
                data-testid="depth-control"
              />
              
              <VisualizationControls
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
                highlightCitations={highlightCitations}
                onHighlightCitationsChange={setHighlightCitations}
                showYearClusters={showYearClusters}
                onShowYearClustersChange={setShowYearClusters}
                data-testid="visualization-controls"
              />

              <div className="space-y-3">
                <button 
                  className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  onClick={handleGenerate}
                  disabled={isLoading || !selectedDoi}
                  data-testid="button-generate"
                >
                  {isLoading ? "Generating..." : "Generate Network"}
                </button>
                <button 
                  className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                  onClick={clearNetwork}
                  data-testid="button-clear"
                >
                  Clear Graph
                </button>
              </div>

              <StatusPanel 
                isLoading={isLoading}
                error={error}
                progress={network ? 100 : 0}
                data-testid="status-panel"
              />
            </Card>

            {selectedNode && (
              <PaperDetails 
                paper={selectedNode}
                className="mt-6"
                data-testid="paper-details"
              />
            )}
          </div>

          {/* Visualization Area */}
          <div className="lg:col-span-3">
            <NetworkVisualization
              network={network}
              isLoading={isLoading}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              showLabels={showLabels}
              highlightCitations={highlightCitations}
              showYearClusters={showYearClusters}
              data-testid="network-visualization"
            />

            {network && (
              <StatisticsPanel 
                network={network}
                className="mt-6"
                data-testid="statistics-panel"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
