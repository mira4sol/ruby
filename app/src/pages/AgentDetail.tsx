import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Key, Eye, EyeOff, Wallet, Shield, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ApiKeyReveal } from "@/components/ApiKeyReveal";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAgent, useDeleteAgent, useRegenerateKey } from "@/hooks/use-api";
import { toast } from "sonner";

const AgentDetail = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAgent(agentId || "");
  const deleteAgent = useDeleteAgent();
  const regenerateKey = useRegenerateKey();

  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const agent = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !agent) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-muted-foreground">{error ? (error as Error).message : "Agent not found"}</p>
          <Button variant="ghost" onClick={() => navigate("/")} className="mt-4">Go back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteAgent.mutateAsync(agentId!);
      toast.success("Agent deleted");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete agent");
    }
  };

  const handleRegenerate = async () => {
    try {
      const res = await regenerateKey.mutateAsync(agentId!);
      setNewApiKey(res.data.apiKey);
      setShowApiKey(true);
      toast.success("API key regenerated");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate key");
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-lg ruby-gradient flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">Created {new Date(agent.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerateKey.isPending}>
              {regenerateKey.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Rotate Key
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* API Key Section */}
        {showApiKey && newApiKey && (
          <div className="mb-6 animate-fade-in">
            <Card className="ruby-border-glow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-ruby" />
                  <span className="text-sm font-medium">Agent API Key — save it now!</span>
                </div>
                <ApiKeyReveal apiKey={newApiKey} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Wallets</p>
              <p className="text-2xl font-bold">{agent.wallets.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="default" className="mt-1 bg-success text-success-foreground">
                {agent.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Wallets */}
        <h2 className="text-xl font-semibold mb-4">Wallets</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agent.wallets.map((wallet) => (
            <Card
              key={wallet.id}
              className="group cursor-pointer hover:ruby-border-glow transition-all duration-300"
              onClick={() => navigate(`/agents/${agentId}/wallets/${wallet.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-ruby" />
                    <span className="font-semibold">{wallet.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{wallet.purpose}</Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground truncate">{wallet.walletAddress}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Agent</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{agent.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteAgent.isPending}>
                {deleteAgent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AgentDetail;
