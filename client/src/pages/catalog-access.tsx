import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import TokenVerification from "@/components/auth/token-verification";
import RequestAccess from "@/components/auth/request-access";
import Home from "@/pages/home";

export default function CatalogAccess() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isTokenProcessing, setIsTokenProcessing] = useState(false);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  // Show loading state while checking authentication or processing token
  if (isLoading || isTokenProcessing) {
    return (
      <div className="min-h-screen bg-black-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  // If user is already authenticated, show the catalog
  if (user) {
    return <Home />;
  }

  // If there's a token in the URL, show token verification
  if (token) {
    return (
      <TokenVerification
        token={token}
        onSuccess={() => {
          // This callback is no longer used since TokenVerification handles redirect directly
        }}
      />
    );
  }

  // Otherwise, show the request access form
  return <RequestAccess />;
}
