import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CitationNetwork } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useNetworkData() {
  const [network, setNetwork] = useState<CitationNetwork | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async ({ doi, depth }: { doi: string; depth: number }) => {
      const response = await apiRequest("POST", "/api/generate-network", { doi, depth });
      return response.json();
    },
    onSuccess: (data: CitationNetwork) => {
      setNetwork(data);
      toast({
        title: "Success",
        description: `Citation network generated with ${data.nodes.length} papers and ${data.edges.length} connections.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate citation network",
        variant: "destructive",
      });
    },
  });

  const generateNetwork = (doi: string, depth: number) => {
    generateMutation.mutate({ doi, depth });
  };

  const clearNetwork = () => {
    setNetwork(null);
  };

  return {
    network,
    isLoading: generateMutation.isPending,
    error: generateMutation.error?.message || null,
    generateNetwork,
    clearNetwork,
  };
}
