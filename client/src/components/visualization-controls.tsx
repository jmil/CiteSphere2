import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface VisualizationControlsProps {
  showLabels: boolean;
  onShowLabelsChange: (value: boolean) => void;
  highlightCitations: boolean;
  onHighlightCitationsChange: (value: boolean) => void;
  showYearClusters: boolean;
  onShowYearClustersChange: (value: boolean) => void;
  className?: string;
}

export function VisualizationControls({
  showLabels,
  onShowLabelsChange,
  highlightCitations,
  onHighlightCitationsChange,
  showYearClusters,
  onShowYearClustersChange,
  className,
  ...props
}: VisualizationControlsProps) {
  return (
    <div className={className} {...props}>
      <Label className="block text-sm font-medium text-foreground mb-3">
        Display Options
      </Label>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-labels"
            checked={showLabels}
            onCheckedChange={onShowLabelsChange}
            data-testid="checkbox-show-labels"
          />
          <Label htmlFor="show-labels" className="text-sm text-foreground cursor-pointer">
            Show node labels
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="highlight-citations"
            checked={highlightCitations}
            onCheckedChange={onHighlightCitationsChange}
            data-testid="checkbox-highlight-citations"
          />
          <Label htmlFor="highlight-citations" className="text-sm text-foreground cursor-pointer">
            Highlight citations
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-year-clusters"
            checked={showYearClusters}
            onCheckedChange={onShowYearClustersChange}
            data-testid="checkbox-show-year-clusters"
          />
          <Label htmlFor="show-year-clusters" className="text-sm text-foreground cursor-pointer">
            Show year clusters
          </Label>
        </div>
      </div>
    </div>
  );
}
