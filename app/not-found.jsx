"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
          <FileQuestion className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-foreground">404</h1>
          <h2 className="text-lg font-bold text-foreground">Página no encontrada</h2>
          <p className="text-sm text-muted-foreground">
            La ruta o recurso al que intentas acceder no existe o fue movido en el Sistema Institucional Integral.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard" className="flex items-center justify-center gap-2">
              <Home className="w-4 h-4" />
              Panel Principal
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/" className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
