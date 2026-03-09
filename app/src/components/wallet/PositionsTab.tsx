import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Crosshair, ArrowRightLeft } from "lucide-react";
import { useOrders } from "@/hooks/use-api";
import type { TriggerOrder, RecurringOrder } from "@/lib/types";

function shortenMint(mint: string) {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function formatCycleFrequency(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  const s = status.toLowerCase();
  if (s === "open" || s === "active") return "default";
  if (s === "cancelled" || s === "failed") return "destructive";
  return "secondary";
}

function TriggerOrderRow({ order }: { order: TriggerOrder }) {
  return (
    <Card className="mb-3 last:mb-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {order.makingAmount} {shortenMint(order.inputMint)}
              </span>
              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-sm">
                {order.takingAmount} {shortenMint(order.outputMint)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Remaining: {order.remainingMakingAmount} → {order.remainingTakingAmount}
            </p>
            {order.trades.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {order.trades.length} fill{order.trades.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="text-right space-y-1.5">
            <Badge variant={statusVariant(order.status)} className="text-xs capitalize">
              {order.status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecurringOrderRow({ order }: { order: RecurringOrder }) {
  const deposited = parseFloat(order.inDeposited) || 0;
  const used = parseFloat(order.inUsed) || 0;
  const progress = deposited > 0 ? Math.min(Math.round((used / deposited) * 100), 100) : 0;

  return (
    <Card className="mb-3 last:mb-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {order.inAmountPerCycle} {shortenMint(order.inputMint)}
              </span>
              <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-sm">
                {shortenMint(order.outputMint)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Every {formatCycleFrequency(order.cycleFrequency)} · {order.trades.length} fill{order.trades.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              Used {order.inUsed} / {order.inDeposited} · Received {order.outReceived}
            </p>
          </div>
          <div className="text-right space-y-1.5">
            <Badge variant={statusVariant(order.status)} className="text-xs capitalize">
              {order.status}
            </Badge>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PositionsTab({ agentId, walletId }: { agentId: string; walletId: string }) {
  const [orderStatus, setOrderStatus] = useState<'active' | 'history'>('active');
  const { data, isLoading } = useOrders(agentId, walletId, orderStatus);
  const trigger = data?.data?.trigger ?? [];
  const recurring = data?.data?.recurring ?? [];

  return (
    <div className="space-y-4">
      {/* Active / History toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setOrderStatus('active')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            orderStatus === 'active'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setOrderStatus('history')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            orderStatus === 'history'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          History
        </button>
      </div>

      <Tabs defaultValue="recurring" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="recurring" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> DCA ({isLoading ? "…" : recurring.length})
          </TabsTrigger>
          <TabsTrigger value="trigger" className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" /> Limit ({isLoading ? "…" : trigger.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recurring">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recurring (DCA) Orders</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <OrdersSkeleton />
              ) : recurring.length === 0 ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No DCA orders found</p>
                </div>
              ) : (
                recurring.map((o) => <RecurringOrderRow key={o.orderKey} order={o} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trigger">
          <Card>
            <CardHeader><CardTitle className="text-lg">Limit (Trigger) Orders</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <OrdersSkeleton />
              ) : trigger.length === 0 ? (
                <div className="text-center py-8">
                  <Crosshair className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No limit orders found</p>
                </div>
              ) : (
                trigger.map((o) => <TriggerOrderRow key={o.orderKey} order={o} />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
