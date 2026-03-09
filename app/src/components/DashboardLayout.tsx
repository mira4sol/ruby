import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem } from "lucide-react";

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg ruby-gradient flex items-center justify-center">
              <Gem className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient-ruby">Ruby</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">mainnet</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
};
