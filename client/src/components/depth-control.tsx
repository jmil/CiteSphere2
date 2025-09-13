import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface DepthControlProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function DepthControl({ value, onChange, className, ...props }: DepthControlProps) {
  return (
    <div className={className} {...props}>
      <Label className="block text-sm font-medium text-foreground mb-2">
        Citation Depth
      </Label>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Levels</span>
          <span className="text-sm font-medium" data-testid="text-depth-level">{value}</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={1}
          max={4}
          step={1}
          className="w-full"
          data-testid="slider-depth"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Higher levels increase processing time
      </p>
    </div>
  );
}
