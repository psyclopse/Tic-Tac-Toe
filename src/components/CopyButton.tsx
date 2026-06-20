"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/utils";
import { Button } from "./ui/Button";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleCopy} aria-live="polite">
      {copied ? "Copied!" : label}
    </Button>
  );
}
