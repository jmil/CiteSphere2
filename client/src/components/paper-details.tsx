import { NetworkNode } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaperDetailsProps {
  paper: NetworkNode;
  className?: string;
}

export function PaperDetails({ paper, className, ...props }: PaperDetailsProps) {
  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle className="text-lg">Selected Paper</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-foreground" data-testid="text-paper-title">
            {paper.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1" data-testid="text-paper-authors">
            {paper.authors.slice(0, 3).join(", ")}
            {paper.authors.length > 3 && `, et al.`}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          {paper.journal && (
            <span data-testid="text-paper-journal">{paper.journal}</span>
          )}
          {paper.year && (
            <span data-testid="text-paper-year">{paper.year}</span>
          )}
          <span data-testid="text-paper-citations">Citations: {paper.citationCount}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="default" className="text-xs" data-testid="badge-paper-level">
            Level {paper.level}
          </Badge>
          {paper.pmid && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-paper-pmid">
              PMID: {paper.pmid}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
