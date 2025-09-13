import { CitationNetwork } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatisticsPanelProps {
  network: CitationNetwork;
  className?: string;
}

export function StatisticsPanel({ network, className, ...props }: StatisticsPanelProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle className="text-lg">Network Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-papers">
              {network.metadata?.totalNodes || network.nodes.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Papers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-citations">
              {network.metadata?.totalEdges || network.edges.length}
            </div>
            <div className="text-sm text-muted-foreground">Citation Links</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-network-depth">
              {network.depth}
            </div>
            <div className="text-sm text-muted-foreground">Network Depth</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid="stat-processing-time">
              {network.metadata?.processingTime ? formatTime(network.metadata.processingTime) : "N/A"}
            </div>
            <div className="text-sm text-muted-foreground">Processing Time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
