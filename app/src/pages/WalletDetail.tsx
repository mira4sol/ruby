import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Activity, Copy, Plus, Check, Loader2, TrendingUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PolicyRuleCard } from "@/components/PolicyRuleCard";
import { PolicyRuleForm } from "@/components/PolicyRuleForm";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PositionsTab } from "@/components/wallet/PositionsTab";
import { HistoryTab } from "@/components/wallet/HistoryTab";
import { useAgent, useWalletBalance, usePolicy, useUpdatePolicy, useDeletePolicy } from "@/hooks/use-api";
import { PolicyRule, UpdatePolicyPayload } from "@/lib/types";
import { toast } from "sonner";

const WalletDetail = () => {
  const { agentId, walletId } = useParams<{ agentId: string; walletId: string }>();
  const navigate = useNavigate();

  const { data: agentData } = useAgent(agentId || "");
  const { data: balanceData, isLoading: balanceLoading } = useWalletBalance(agentId || "", walletId || "");
  const { data: policyData, isLoading: policyLoading } = usePolicy(agentId || "", walletId || "");
  const updatePolicy = useUpdatePolicy(agentId || "", walletId || "");
  const deletePolicy = useDeletePolicy(agentId || "", walletId || "");

  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const wallet = agentData?.data?.wallets.find((w) => w.id === walletId);
  const balance = balanceData?.data;
  const policy = policyData?.data;

  if (!agentData && !wallet) {
    return (
      <DashboardLayout>
        <div className="space-y-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!wallet) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-muted-foreground">Wallet not found</p>
          <Button variant="ghost" onClick={() => navigate(`/agents/${agentId}`)} className="mt-4">Go back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.walletAddress);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const buildPolicyPayload = (rules: PolicyRule[]): UpdatePolicyPayload => ({
    name: policy?.name || `${wallet.label} Policy`,
    rules: rules.map((r) => ({
      name: r.name,
      method: r.method,
      action: r.action,
      conditions: r.conditions.map((c) => ({
        fieldSource: c.field_source,
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    })),
  });

  const handleDeleteRule = async (ruleIndex: number) => {
    if (!policy) return;
    const updatedRules = policy.rules.filter((_, i) => i !== ruleIndex);
    try {
      await updatePolicy.mutateAsync(buildPolicyPayload(updatedRules));
      toast.success("Rule removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove rule");
    }
  };

  const handleAddRule = async (rule: PolicyRule) => {
    const currentRules = policy?.rules || [];
    try {
      await updatePolicy.mutateAsync(buildPolicyPayload([...currentRules, rule]));
      setShowAddRule(false);
      toast.success("Rule added");
    } catch (err: any) {
      toast.error(err.message || "Failed to add rule");
    }
  };

  const handleEditRule = async (rule: PolicyRule) => {
    if (editingRuleIndex === null || !policy) return;
    const updatedRules = policy.rules.map((r, i) => (i === editingRuleIndex ? rule : r));
    try {
      await updatePolicy.mutateAsync(buildPolicyPayload(updatedRules));
      setEditingRuleIndex(null);
      toast.success("Rule updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update rule");
    }
  };

  const policyRules = policy?.rules ?? [];

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/agents/${agentId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{wallet.label} Wallet</h1>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-muted-foreground font-mono">{wallet.walletAddress}</code>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
                {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <Badge variant="outline" className="ml-auto">{wallet.purpose}</Badge>
        </div>

        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            {balanceLoading ? (
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
              </div>
            ) : balance ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1">Total USD Value</p>
                      <p className="text-3xl font-bold font-mono">${balance.totalUsd.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1">Tokens</p>
                      <p className="text-3xl font-bold">{balance.items.length}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Token Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {balance.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No tokens found</p>
                    ) : (
                      <div className="space-y-3">
                        {balance.items.map((token) => (
                          <div key={token.address} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              {token.logoURI ? (
                                <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                  {(token.symbol || "?").slice(0, 2)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{token.symbol || token.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground font-mono">{token.address.slice(0, 8)}...</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-medium">{token.uiAmount.toFixed(4)}</p>
                              <p className="text-xs text-muted-foreground">${(token.valueUsd ?? 0).toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Unable to load balance</CardContent></Card>
            )}
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <PositionsTab agentId={agentId!} walletId={walletId!} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <HistoryTab agentId={agentId!} walletId={walletId!} />
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Policy Rules</h3>
                <p className="text-sm text-muted-foreground">
                  DENY by default — only explicitly allowed operations can execute
                </p>
              </div>
              <Button variant="ruby" size="sm" onClick={() => setShowAddRule(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>

            {policyLoading ? (
              <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
            ) : (
              <div className="space-y-3">
                {policyRules.map((rule, index) => (
                  <PolicyRuleCard
                    key={index}
                    rule={{ ...rule, id: String(index) }}
                    onDelete={() => handleDeleteRule(index)}
                    onEdit={() => setEditingRuleIndex(index)}
                  />
                ))}
                {policyRules.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        {policy === null ? "No policy attached — wallet is unrestricted" : "No rules — all operations are DENIED"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Rule Dialog */}
        <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Policy Rule</DialogTitle>
              <DialogDescription>
                Define what this wallet is allowed or denied to do. DENY always takes priority over ALLOW.
              </DialogDescription>
            </DialogHeader>
            <PolicyRuleForm onSubmit={handleAddRule} onCancel={() => setShowAddRule(false)} />
          </DialogContent>
        </Dialog>

        {/* Edit Rule Dialog */}
        <Dialog open={editingRuleIndex !== null} onOpenChange={(open) => !open && setEditingRuleIndex(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Policy Rule</DialogTitle>
              <DialogDescription>
                Modify this rule's conditions. DENY always takes priority over ALLOW.
              </DialogDescription>
            </DialogHeader>
            {editingRuleIndex !== null && policyRules[editingRuleIndex] && (
              <PolicyRuleForm
                initialRule={{ ...policyRules[editingRuleIndex], id: String(editingRuleIndex) }}
                onSubmit={handleEditRule}
                onCancel={() => setEditingRuleIndex(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default WalletDetail;
