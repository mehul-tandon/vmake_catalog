import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Mail, Shield, CheckCircle } from "lucide-react";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

interface TokenVerificationProps {
  token: string;
  onSuccess: () => void;
}

export default function TokenVerification({ token, onSuccess }: TokenVerificationProps) {
  const [step, setStep] = useState<'validating' | 'user-info' | 'success' | 'error'>('validating');
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [city, setCity] = useState("");
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Validate token on component mount
  const validateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("GET", `/api/auth/validate-token?token=${token}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Token validation failed');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setEmail(data.email);
      setTokenId(data.tokenId);
      setUser(data.user);

      // Pre-populate form with existing user data if available
      if (data.user) {
        setName(data.user.name || "");
        setWhatsappNumber(data.user.whatsappNumber?.replace("+91", "") || "");
        setCity(data.user.city || "");
      }

      if (data.requiresProfileCompletion) {
        setStep('user-info');
        toast({
          title: "Complete Your Profile",
          description: "Please provide your details to access the catalog.",
        });
      } else {
        // For returning users who already have a completed profile
        setStep('success');
        toast({
          title: "Welcome Back!",
          description: "Redirecting to catalog...",
        });

        // For returning users, invalidate and refetch auth query to ensure user is authenticated
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        // Force a refetch to update the auth state
        const authResult = await queryClient.fetchQuery({ 
          queryKey: ["/api/auth/me"],
          queryFn: async () => {
            const response = await fetch('/api/auth/me');
            if (!response.ok) {
              console.error("Failed to fetch auth state for returning user");
            }
            return response.json();
          }
        });
        
        console.log("Auth state for returning user:", authResult);

        // Show the redirecting screen for 2-3 seconds before redirecting
        setTimeout(() => {
          // Redirect directly to catalog page
          window.location.href = '/catalog';
        }, 2500); // 2.5 seconds
      }
    },
    onError: (error: any) => {
      setStep('error');
      setErrorMessage(error.message);
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  useEffect(() => {
    if (token) {
      validateTokenMutation.mutate(token);
    }
  }, [token]);

  // Submit user information
  const submitUserInfoMutation = useMutation({
    mutationFn: async (data: { name: string; whatsappNumber: string; city: string; email: string; tokenId: number }) => {
      const response = await apiRequest("POST", "/api/auth/update-user-info", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user information');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      setStep('success');
      toast({
        title: "Profile Complete",
        description: "Welcome to VMake Catalog!",
      });

      // Ensure the user is properly authenticated in the session
      // First invalidate the auth query
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Force a refetch to update the auth state
      const authResult = await queryClient.fetchQuery({ 
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
          const response = await fetch('/api/auth/me');
          if (!response.ok) {
            console.error("Failed to fetch auth state after profile completion");
          }
          return response.json();
        }
      });
      
      console.log("Auth state after profile completion:", authResult);

      // Add a small delay to ensure the auth state is updated
      setTimeout(() => {
        // Redirect directly to catalog page
        window.location.href = '/catalog';
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  
  const handleUserInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsappNumber.trim() || !city.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Format WhatsApp number with +91 prefix if not already present
    const formattedNumber = whatsappNumber.startsWith("+91")
      ? whatsappNumber
      : `+91${whatsappNumber.replace(/^0+/, "")}`;    

    submitUserInfoMutation.mutate({
      name: name.trim(),
      whatsappNumber: formattedNumber,
      city: city.trim(),
      email,
      tokenId: tokenId as number
    });
  };

  const renderContent = () => {
    switch (step) {
      case 'validating':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-white mb-2">Validating Access</h2>
            <p className="text-gray-400">Please wait while we verify your access link...</p>
          </div>
        );


        
      case 'user-info':
        return (
          <div>
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gold/20 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-gold" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white text-center mb-2">
              Complete Your Profile
            </h2>
            <p className="text-gray-400 text-center mb-6">
              Please provide the following information to complete your registration
            </p>

            <form onSubmit={handleUserInfoSubmit} className="space-y-4">
              <div>
                <Label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-black-primary border-black-accent text-white placeholder-gray-500"
                  disabled={submitUserInfoMutation.isPending}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-300 mb-2">
                  WhatsApp Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    +91
                  </span>
                  <Input
                    type="tel"
                    placeholder="9876543210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="pl-12 bg-black-primary border-black-accent text-white placeholder-gray-500"
                    disabled={submitUserInfoMutation.isPending}
                    maxLength={10}
                  />
                </div>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-300 mb-2">
                  City
                </Label>
                <Input
                  type="text"
                  placeholder="Enter your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-black-primary border-black-accent text-white placeholder-gray-500"
                  disabled={submitUserInfoMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                disabled={submitUserInfoMutation.isPending}
                className="w-full bg-gold hover:bg-gold-light text-black-primary font-semibold"
              >
                {submitUserInfoMutation.isPending ? "Submitting..." : "Complete Registration"}
              </Button>
            </form>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-500/20 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">Access Granted!</h2>
            <p className="text-gray-400 mb-4">
              Welcome to VMake Catalog. Redirecting you now...
            </p>
            
            {/* Loading animation */}
            <div className="flex justify-center items-center space-x-2 mt-6">
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-6 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gold h-1.5 rounded-full animate-progress"></div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">{errorMessage}</p>
            <p className="text-gray-500 text-sm">
              Please contact support if you believe this is an error.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black-secondary border-black-accent">
        <CardContent className="pt-6">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gold rounded flex items-center justify-center overflow-hidden">
                <img
                  src={vmakeLogo}
                  alt="Vmake Finessee Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">Vmake</h1>
                <p className="text-xs text-gold">Finessee</p>
              </div>
            </div>
          </div>

          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
