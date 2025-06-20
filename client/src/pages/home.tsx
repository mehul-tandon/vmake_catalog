import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, ExternalLink, User } from "lucide-react";
import Navigation from "@/components/layout/navigation";
import WhatsAppVerification from "@/components/auth/whatsapp-verification";
import ProductGrid from "@/components/product/product-grid";
import SearchFilters from "@/components/product/search-filters";
import WishlistModal from "@/components/wishlist/wishlist-modal";
import ProductModal from "@/components/product/product-modal";
import ContactSection from "@/components/contact/contact-section";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

export default function Home() {
  const { user, isLoading, refetch, forceRefresh } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [boundUser, setBoundUser] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    category: "all",
    finish: "all",
    material: "all",
    sortBy: "name",
  });
  
  // Check for bound user on component mount
  useEffect(() => {
    const storedBoundUser = localStorage.getItem('boundUser');
    if (storedBoundUser) {
      try {
        setBoundUser(JSON.parse(storedBoundUser));
      } catch (e) {
        console.error("Error parsing bound user:", e);
        localStorage.removeItem('boundUser');
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  // Handle contact actions
  const handleWhatsAppContact = () => {
    window.open('https://wa.me/918882636296?text=Hi%2C%20I%20came%20from%20your%20catalog%20can%20you%20give%20me%20access%20of%20it', '_blank');
  };

  const handleGoogleContact = () => {
    window.open('https://g.co/kgs/evVbwcC', '_blank');
  };

  // Function to handle login as bound user
  const handleLoginAsBoundUser = async () => {
    if (!boundUser) return;
    
    setIsLoggingIn(true);
    try {
      console.log("Logging in as bound user:", boundUser.name);
      
      const response = await fetch('/api/auth/login-bound-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log("Login response status:", response.status);
      
      if (!response.ok) {
        throw new Error('Failed to login');
      }
      
      const data = await response.json();
      console.log("Login response data:", data);
      
      if (data.success) {
        // Clear bound user from localStorage
        localStorage.removeItem('boundUser');
        
        // Show success message
        toast({
          title: "Welcome Back!",
          description: `You are now logged in as ${data.user.name}`,
        });
        
        // Force refresh auth state
        forceRefresh();
        
        // Wait a moment for the auth state to update
        setTimeout(() => {
          // Redirect to catalog with a hard reload to ensure fresh state
          window.location.href = '/catalog';
        }, 500);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: "There was an error logging in",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check if we're on the catalog page with a session but no user data
  // This could happen if the session was just established but the auth state hasn't updated yet
  const isOnCatalogPage = window.location.pathname === '/catalog';
  
  // Show contact options for non-authenticated users
  if (!user) {
    // If we're on the catalog page and there might be a pending session, try to refresh auth state
    if (isOnCatalogPage) {
      // Try to refresh the auth state one more time
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Show loading state while we check again
      return (
        <div className="min-h-screen bg-black-primary flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <p className="text-white">Loading catalog access...</p>
          </div>
        </div>
      );
    }
    
    // Standard access required screen
    return (
      <div className="min-h-screen bg-black-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black-secondary border-black-accent">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gold rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={vmakeLogo}
                alt="VMake Finessee Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">VMake Finessee</h2>
            <h3 className="text-lg font-semibold text-gold mb-4">Catalog Access Required</h3>
            <p className="text-gray-300 mb-6">
              To view our premium catalog, please contact our admin for access.
            </p>

            <div className="space-y-3">
              {/* Show login button if there's a bound user */}
              {boundUser && (
                <Button
                  onClick={handleLoginAsBoundUser}
                  className="w-full bg-gold hover:bg-gold/90 text-black font-semibold"
                  disabled={isLoggingIn}
                >
                  <User className="w-4 h-4 mr-2" />
                  {isLoggingIn ? "Logging in..." : `Login as ${boundUser.name}`}
                </Button>
              )}
              
              <Button
                onClick={handleWhatsAppContact}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Admin on WhatsApp
              </Button>

              <Button
                onClick={handleGoogleContact}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit Our Google Page
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              {boundUser 
                ? "You've previously accessed this catalog. Click 'Login' to continue." 
                : "Click the buttons above to get catalog access from our admin"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black-primary text-white">
      <Navigation
        onWishlistClick={() => setIsWishlistOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ProductGrid
          searchQuery={searchQuery}
          filters={filters}
          onProductSelect={setSelectedProduct}
          viewMode={viewMode}
        />

        {/* Contact Section */}
        <ContactSection />
      </div>

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
      />

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
