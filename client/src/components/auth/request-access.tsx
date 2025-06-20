import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, CheckCircle } from "lucide-react";
import vmakeLogo from "@assets/339076826_1147709369229224_1319750110613322317_n.jpg";

export default function RequestAccess() {
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const requestTokenMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/auth/generate-token", { email });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate access token');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Access Link Sent!",
        description: "Please check your email for the access link.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    requestTokenMutation.mutate(email.trim().toLowerCase());
  };

  if (isSuccess) {
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

            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <h2 className="text-xl font-semibold text-white mb-2">
                Access Link Sent!
              </h2>
              <p className="text-gray-400 mb-4">
                We've sent a secure access link to your email address:
              </p>
              <p className="text-gold font-medium mb-6">{email}</p>
              
              <div className="bg-black-primary p-4 rounded-lg border border-black-accent">
                <p className="text-gray-300 text-sm mb-2">
                  <strong>Next steps:</strong>
                </p>
                <ol className="text-gray-400 text-sm text-left space-y-1">
                  <li>1. Check your email inbox</li>
                  <li>2. Click the access link in the email</li>
                  <li>3. Complete email verification</li>
                  <li>4. Access your personalized catalog</li>
                </ol>
              </div>

              <p className="text-gray-500 text-xs mt-4">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <Button
                onClick={() => setIsSuccess(false)}
                variant="outline"
                className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Request Another Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gold/20 p-3 rounded-full">
                <Mail className="w-8 h-8 text-gold" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2">
              Request Catalog Access
            </h2>
            <p className="text-gray-400">
              Enter your email to receive a secure access link to the VMake product catalog.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black-primary border-black-accent text-white placeholder-gray-500"
                disabled={requestTokenMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={requestTokenMutation.isPending}
              className="w-full bg-gold hover:bg-gold-light text-black-primary font-semibold"
            >
              {requestTokenMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black-primary"></div>
                  Sending...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Access Link
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-black-primary rounded-lg border border-black-accent">
            <p className="text-gray-300 text-sm mb-2">
              <strong>Secure Access:</strong>
            </p>
            <ul className="text-gray-400 text-xs space-y-1">
              <li>• One-time use access links</li>
              <li>• Device and location binding</li>
              <li>• Email verification required</li>
              <li>• Links expire after use</li>
            </ul>
          </div>

          <p className="text-gray-500 text-xs text-center mt-4">
            By requesting access, you agree to our terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
