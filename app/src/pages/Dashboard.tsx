import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Bot, Wallet, ChevronRight, Gem, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiKeyReveal } from "@/components/ApiKeyReveal";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAgents, useCreateAgent } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAgents();
  const createAgent = useCreateAgent();
  const [showCreate, setShowCreate] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [agentName, setAgentName] = useState("");
  const [selectedWallets, setSelectedWallets] = useState<Array<'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'>>(['TRADING', 'GAS']);

  const agents = data?.data?.agents ?? [];

  const walletOptions: { value: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'; label: string; description: string }[] = [
    { value: 'TRADING', label: 'Trading', description: 'For executing trades and swaps' },
    { value: 'GAS', label: 'Gas', description: 'For covering transaction fees' },
    { value: 'SAVINGS', label: 'Savings', description: 'For long-term holding' },
    { value: 'GENERAL', label: 'General', description: 'Multi-purpose wallet' },
  ];

  const toggleWallet = (wallet: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL') => {
    setSelectedWallets(prev =>
      prev.includes(wallet) ? prev.filter(w => w !== wallet) : [...prev, wallet]
    );
  };

  const handleCreate = async () => {
    if (!agentName.trim()) return;
    try {
      const res = await createAgent.mutateAsync({ name: agentName.trim(), wallets: selectedWallets.length > 0 ? selectedWallets : undefined });
      setNewApiKey(res.data.apiKey);
      setShowCreate(false);
      setAgentName("");
      setSelectedWallets(['TRADING', 'GAS']);
      setShowApiKey(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to create agent");
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Agents</h1>
          <p className="text-muted-foreground mt-1">Manage your AI agents and their wallets</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/SKILL.md" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Agent SKILL.md
            </Button>
          </a>
          <Button variant="ruby" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
          <p className="text-destructive mb-2">Failed to load agents</p>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl ruby-gradient ruby-glow-shadow flex items-center justify-center mb-6">
            <Bot className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No agents yet</h2>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first AI agent to get started. Each agent gets its own wallets, policies, and API key.
          </p>
          <Button variant="ruby" size="lg" onClick={() => setShowCreate(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create First Agent
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className="group cursor-pointer hover:ruby-border-glow transition-all duration-300"
              onClick={() => navigate(`/agents/${agent.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-ruby-surface flex items-center justify-center">
                    <Bot className="h-5 w-5 text-ruby" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-ruby transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{agent.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Created {new Date(agent.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    <span>{agent._count.wallets} wallets</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Agent Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Agent</DialogTitle>
            <DialogDescription>
              Give your agent a name. It will be provisioned with Trading and Gas wallets automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input
              placeholder="e.g. Alpha Trading Bot"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div>
              <p className="text-sm font-medium mb-2">Initialize with wallets</p>
              <div className="grid grid-cols-2 gap-2">
                {walletOptions.map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedWallets.includes(opt.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <Checkbox
                      checked={selectedWallets.includes(opt.value)}
                      onCheckedChange={() => toggleWallet(opt.value)}
                    />
                    <div className="leading-none">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="ruby" onClick={handleCreate} disabled={!agentName.trim() || createAgent.isPending}>
              {createAgent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Reveal Dialog */}
      <Dialog open={showApiKey} onOpenChange={setShowApiKey}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agent Created Successfully</DialogTitle>
            <DialogDescription>
              Save this API key now — it won't be shown again. Your agent will use this key to authenticate with Ruby.
            </DialogDescription>
          </DialogHeader>
          <ApiKeyReveal apiKey={newApiKey} />
          <DialogFooter>
            <Button variant="ruby" onClick={() => setShowApiKey(false)}>
              I've saved the key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
