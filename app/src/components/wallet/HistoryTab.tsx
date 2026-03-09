import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useTransactions } from "@/hooks/use-api";
import type { BirdEyeTransaction } from "@/lib/types";

function TxRow({ tx }: { tx: BirdEyeTransaction }) {
  const date = new Date(tx.blockTime);

  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0 gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {tx.status ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{tx.mainAction || "Unknown"}</span>
          {tx.contractLabel?.name && (
            <Badge variant="outline" className="text-xs shrink-0">{tx.contractLabel.name}</Badge>
          )}
        </div>

        {tx.balanceChange.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-6">
            {tx.balanceChange.map((bc, i) => (
              <span key={i} className={`text-xs font-mono ${bc.amount >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                {bc.amount >= 0 ? "+" : ""}{bc.amount} {bc.symbol}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground pl-6 font-mono">
          Fee: {tx.fee} SOL
        </p>
      </div>

      <div className="text-right shrink-0 space-y-1">
        <p className="text-xs text-muted-foreground">
          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <a
          href={`https://solscan.io/tx/${tx.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {tx.txHash.slice(0, 8)}…
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export function HistoryTab({ agentId, walletId }: { agentId: string; walletId: string }) {
  const { data, isLoading } = useTransactions(agentId, walletId);
  const txs = data?.data?.solana ?? [];

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        {txs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No transactions found</p>
          </div>
        ) : (
          txs.map((tx) => <TxRow key={tx.txHash} tx={tx} />)
        )}
      </CardContent>
    </Card>
  );
}
