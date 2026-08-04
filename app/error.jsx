"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Error capturado por error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto text-destructive">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Algo no salió como se esperaba</h2>
          <p className="text-sm text-muted-foreground">
            Ocurrió un problema temporal al cargar esta vista del Sistema Institucional Integral.
          </p>
        </div>

        <div className="pt-2">
          <Button onClick={() => reset()} className="w-full gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
