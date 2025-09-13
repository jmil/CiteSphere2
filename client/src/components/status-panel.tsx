import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StatusPanelProps {
  isLoading: boolean;
  error: string | null;
  progress: number;
  className?: string;
}

export function StatusPanel({ isLoading, error, progress, className, ...props }: StatusPanelProps) {
  const getStatusIcon = () => {
    if (error) {
      return <AlertCircle className="w-2 h-2 text-red-500" />;
    }
    if (isLoading) {
      return <Loader2 className="w-2 h-2 text-amber-500 animate-spin" />;
    }
    if (progress === 100) {
      return <CheckCircle className="w-2 h-2 text-green-500" />;
    }
    return <div className="w-2 h-2 bg-gray-300 rounded-full" />;
  };

  const getStatusMessage = () => {
    if (error) {
      return `Error: ${error}`;
    }
    if (isLoading) {
      return "Processing citations...";
    }
    if (progress === 100) {
      return "Network generation complete";
    }
    return "Ready to generate network";
  };

  return (
    <div className={`bg-muted rounded-md p-4 ${className}`} {...props}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Status</span>
        {getStatusIcon()}
      </div>
      <p className="text-xs text-muted-foreground mb-3" data-testid="text-status-message">
        {getStatusMessage()}
      </p>
      <div className="space-y-1">
        <Progress value={progress} className="h-2" data-testid="progress-status" />
      </div>
    </div>
  );
}
