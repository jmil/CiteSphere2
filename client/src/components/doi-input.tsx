import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface DOIInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DOIInput({ value, onChange, className, ...props }: DOIInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Validate DOI when debounced value changes
  const { data: validation, isLoading: isValidating } = useQuery({
    queryKey: ["/api/validate-doi", debouncedValue],
    queryFn: async () => {
      const response = await fetch("/api/validate-doi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doi: debouncedValue }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Validation failed");
      }
      
      return response.json();
    },
    enabled: !!debouncedValue && debouncedValue.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (validation?.valid && validation?.found) {
      onChange(debouncedValue);
    }
  }, [validation, debouncedValue, onChange]);

  const getValidationIndicator = () => {
    if (isValidating) {
      return <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" title="Validating..." />;
    }
    
    if (validation?.valid && validation?.found) {
      return <div className="w-2 h-2 bg-green-500 rounded-full" title="Valid DOI found in PubMed" />;
    }
    
    if (validation?.valid && !validation?.found) {
      return <div className="w-2 h-2 bg-orange-500 rounded-full" title="Valid DOI format but not found in PubMed" />;
    }
    
    if (validation && !validation.valid) {
      return <div className="w-2 h-2 bg-red-500 rounded-full" title="Invalid DOI format" />;
    }
    
    return <div className="w-2 h-2 bg-gray-300 rounded-full" title="Enter DOI to validate" />;
  };

  return (
    <div className={className} {...props}>
      <Label htmlFor="doi-input" className="block text-sm font-medium text-foreground mb-2">
        DOI Input
      </Label>
      <div className="relative">
        <Input 
          id="doi-input"
          type="text" 
          placeholder="10.1126/science.1225829"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pr-8"
          data-testid="input-doi"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getValidationIndicator()}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Enter a valid DOI to begin visualization
      </p>
    </div>
  );
}
