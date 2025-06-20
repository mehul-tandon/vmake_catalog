import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useState } from "react";

export function useAuth() {
  const [forceRefresh, setForceRefresh] = useState(0);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/me", forceRefresh], // Add forceRefresh to force refetch when needed
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Reduce retry attempts to avoid excessive requests
    staleTime: 5000, // Reduce stale time to 5 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
    refetchOnReconnect: true, // Refetch on reconnect
  });

  // Force a refetch when on the catalog page to ensure we have the latest auth state
  useEffect(() => {
    const isOnCatalogPage = window.location.pathname === '/catalog';
    if (isOnCatalogPage && !data?.user) {
      // If we're on the catalog page but don't have user data, try refetching
      const checkAuth = async () => {
        console.log("Checking auth state on catalog page...");
        await refetch();
      };
      checkAuth();
    }
  }, [data?.user, refetch]);
  
  // Check for auth state changes when the component mounts
  useEffect(() => {
    const checkInitialAuth = async () => {
      console.log("Initial auth check...");
      await refetch();
    };
    
    checkInitialAuth();
    
    // Set up an interval to periodically check auth state
    const interval = setInterval(() => {
      setForceRefresh(prev => prev + 1);
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [refetch]);

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    refetch, // Expose refetch function
    forceRefresh: () => setForceRefresh(prev => prev + 1), // Expose force refresh function
  };
}
