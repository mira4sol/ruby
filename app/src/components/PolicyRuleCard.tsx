import { Shield, ShieldOff, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PolicyRule } from "@/lib/types";

interface PolicyRuleCardProps {
  rule: PolicyRule;
  onDelete: () => void;
  onEdit: () => void;
}

export const PolicyRuleCard = ({ rule, onDelete, onEdit }: PolicyRuleCardProps) => {
  const isAllow = rule.action === "ALLOW";

  return (
    <Card className={isAllow ? "border-success/20" : "border-destructive/20"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isAllow ? "bg-success/10" : "bg-destructive/10"
            }`}>
              {isAllow ? (
                <Shield className="h-4 w-4 text-success" />
              ) : (
                <ShieldOff className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{rule.name}</span>
                <Badge
                  variant={isAllow ? "default" : "destructive"}
                  className={isAllow ? "bg-success text-success-foreground" : ""}
                >
                  {rule.action}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                method: {rule.method}
              </p>
              {rule.conditions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {rule.conditions.map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-mono">
                      {c.field} {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : c.value}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
