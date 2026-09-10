"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, FileText, Lock } from "lucide-react";
import { Markdown } from "./markdown";
import { PRIVACY_POLICY, TERMS_OF_USE } from "@/lib/legal-content";

interface PrivacyTermsProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Which tab to show first when opened */
  defaultTab?: "privacy" | "terms";
}

export function PrivacyTerms({
  open,
  onOpenChange,
  defaultTab = "privacy",
}: PrivacyTermsProps) {
  const [tab, setTab] = useState<"privacy" | "terms">(defaultTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-w-[95vw] max-h-[85vh] p-0 overflow-hidden gap-0">
        <div className="border-b border-border bg-emerald-500/5 px-5 py-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-emerald-950 shadow-sm">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base">
                  Privacy &amp; Terms
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  How your data is handled and the rules of using Developer's Ai.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "privacy" | "terms")}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="border-b border-border px-3 pt-2">
            <TabsList className="grid w-full grid-cols-2 bg-muted/40">
              <TabsTrigger
                value="privacy"
                className="gap-1.5 text-xs data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
              >
                <Lock className="h-3.5 w-3.5" />
                Privacy Policy
              </TabsTrigger>
              <TabsTrigger
                value="terms"
                className="gap-1.5 text-xs data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300"
              >
                <FileText className="h-3.5 w-3.5" />
                Terms of Use
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[60vh] sm:h-[65vh]">
            <div className="px-5 py-4">
              <TabsContent value="privacy" className="mt-0">
                <Markdown content={PRIVACY_POLICY} />
              </TabsContent>
              <TabsContent value="terms" className="mt-0">
                <Markdown content={TERMS_OF_USE} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="border-t border-border bg-muted/30 px-5 py-3 text-center text-[11px] text-muted-foreground">
          By continuing to chat, you agree to both the Privacy Policy and Terms
          of Use. Stay safe &amp; build cool things! 🚀
        </div>
      </DialogContent>
    </Dialog>
  );
}
