import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolicyRule } from "@/lib/types";

interface PolicyRuleFormProps {
  onSubmit: (rule: PolicyRule) => void;
  onCancel: () => void;
  initialRule?: PolicyRule;
}

const METHODS: { value: string; label: string }[] = [
  { value: "signAndSendTransaction", label: "Sign & Send Transaction" },
  { value: "signTransaction", label: "Sign Transaction" },
  { value: "signMessage", label: "Sign Message" },
  { value: "exportPrivateKey", label: "Export Private Key" },
  { value: "*", label: "All Methods (*)" },
];

const FIELD_SOURCES = [
  { value: "solana_system_program_instruction", label: "System Program" },
  { value: "solana_token_program_instruction", label: "Token Program" },
  { value: "solana_program_instruction", label: "Program Instruction" },
  { value: "system", label: "System (timestamps)" },
];

const FIELD_OPTIONS: Record<string, { value: string; label: string }[]> = {
  solana_system_program_instruction: [
    { value: "Transfer.lamports", label: "Transfer.lamports — SOL amount in lamports" },
    { value: "Transfer.to", label: "Transfer.to — Recipient address" },
    { value: "instructionName", label: "instructionName — e.g. Create, Transfer" },
    { value: "CreateWithSeed.lamports", label: "CreateWithSeed.lamports" },
    { value: "Allocate.space", label: "Allocate.space" },
  ],
  solana_token_program_instruction: [
    { value: "TransferChecked.mint", label: "TransferChecked.mint — Token mint address" },
    { value: "TransferChecked.amount", label: "TransferChecked.amount — Token amount" },
    { value: "TransferChecked.destination", label: "TransferChecked.destination — Recipient" },
    { value: "instructionName", label: "instructionName — e.g. TransferChecked, CloseAccount" },
  ],
  solana_program_instruction: [
    { value: "programId", label: "programId — Program address" },
  ],
  system: [
    { value: "current_unix_timestamp", label: "current_unix_timestamp — Current time (seconds)" },
  ],
};

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "≠ (not equal)" },
  { value: "lte", label: "≤ (less or equal)" },
  { value: "gte", label: "≥ (greater or equal)" },
  { value: "lt", label: "< (less than)" },
  { value: "gt", label: "> (greater than)" },
  { value: "in", label: "in (list)" },
];

export const PolicyRuleForm = ({ onSubmit, onCancel, initialRule }: PolicyRuleFormProps) => {
  const cond = initialRule?.conditions?.[0];
  const [name, setName] = useState(initialRule?.name || "");
  const [method, setMethod] = useState(initialRule?.method || "signAndSendTransaction");
  const [action, setAction] = useState<"ALLOW" | "DENY">(initialRule?.action || "ALLOW");
  const [fieldSource, setFieldSource] = useState(cond?.field_source || "solana_system_program_instruction");
  const [field, setField] = useState(cond?.field || "Transfer.lamports");
  const [operator, setOperator] = useState(cond?.operator || "lte");
  const [value, setValue] = useState(cond ? (Array.isArray(cond.value) ? cond.value.join(", ") : String(cond.value)) : "");
  const [hasConditions, setHasConditions] = useState(initialRule ? (initialRule.conditions.length > 0) : true);

  const fieldOptions = useMemo(() => FIELD_OPTIONS[fieldSource] || [], [fieldSource]);

  // Reset field when field source changes
  const handleFieldSourceChange = (newSource: string) => {
    setFieldSource(newSource);
    const options = FIELD_OPTIONS[newSource] || [];
    if (options.length > 0 && !options.find(o => o.value === field)) {
      setField(options[0].value);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const rule: PolicyRule = {
      id: initialRule?.id || String(Date.now()),
      name: name.trim(),
      method,
      action,
      conditions: hasConditions ? [{
        field_source: fieldSource,
        field,
        operator,
        value: operator === "in" ? value.split(",").map(v => v.trim()) : value,
      }] : [],
    };
    onSubmit(rule);
  };

  return (
    <div className="space-y-4 py-2">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Rule Name</label>
        <Input placeholder="e.g. Allow SOL transfers up to 5 SOL" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Method</label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={method}
            onChange={e => setMethod(e.target.value)}
          >
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Action</label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={action === "ALLOW" ? "default" : "outline"}
              className={action === "ALLOW" ? "flex-1 bg-success hover:bg-success/90 text-success-foreground" : "flex-1"}
              onClick={() => setAction("ALLOW")}
            >
              ALLOW
            </Button>
            <Button
              type="button"
              variant={action === "DENY" ? "destructive" : "outline"}
              className="flex-1"
              onClick={() => setAction("DENY")}
            >
              DENY
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hasConditions}
          onChange={e => setHasConditions(e.target.checked)}
          className="rounded"
          id="has-conditions"
        />
        <label htmlFor="has-conditions" className="text-sm text-foreground">Add conditions</label>
      </div>

      {hasConditions && (
        <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Field Source</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={fieldSource}
                onChange={e => handleFieldSourceChange(e.target.value)}
              >
                {FIELD_SOURCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Field</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={field}
                onChange={e => setField(e.target.value)}
              >
                {fieldOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Operator</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={operator}
                onChange={e => setOperator(e.target.value)}
              >
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
              <Input className="h-9 text-xs font-mono" placeholder="1000000000" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </div>
          {operator === "in" && (
            <p className="text-xs text-muted-foreground">Comma-separated values for "in" operator</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="ruby" onClick={handleSubmit} disabled={!name.trim()}>{initialRule ? "Save Changes" : "Add Rule"}</Button>
      </div>
    </div>
  );
};
