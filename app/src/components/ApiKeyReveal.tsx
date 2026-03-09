import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ApiKeyRevealProps {
  apiKey: string;
}

export const ApiKeyReveal = ({ apiKey }: ApiKeyRevealProps) => {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = apiKey.slice(0, 6) + "•".repeat(Math.max(0, apiKey.length - 10)) + apiKey.slice(-4);

  return (
    <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
      <code className="flex-1 text-sm font-mono break-all text-foreground">
        {visible ? apiKey : maskedKey}
      </code>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyKey}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
};
