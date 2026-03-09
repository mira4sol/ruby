import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl ruby-gradient ruby-glow-shadow animate-pulse flex items-center justify-center">
          <Gem className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl ruby-gradient ruby-glow-shadow flex items-center justify-center">
            <Gem className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-gradient-ruby">Ruby</h1>
            <p className="text-muted-foreground mt-1">Wallet-as-a-Service for AI Agents</p>
          </div>
        </div>

        {/* Login */}
        <div className="space-y-4">
          <Button variant="ruby" size="lg" className="w-full text-base" onClick={login}>
            Sign In
          </Button>
          <p className="text-xs text-muted-foreground">
            Connect with your email, social account, or wallet to get started.
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/50">
          Powered by Solana Mainnet
        </p>
      </div>
    </div>
  );
};

export default Login;
