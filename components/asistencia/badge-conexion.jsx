"use client";

import { Wifi, WifiOff, MapPin, MapPinOff, ShieldCheck, AlertCircle } from "lucide-react";

export function BadgeConexion({ wifiValido, gpsValido, redValida }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4 text-xs">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${wifiValido ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
          {wifiValido ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {wifiValido ? "Conexión OK" : "Sin Internet"}
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${gpsValido ? "bg-success/10 text-success border-success/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
          {gpsValido ? <MapPin className="h-3 w-3" /> : <MapPinOff className="h-3 w-3" />}
          {gpsValido ? "GPS OK" : "Sin GPS"}
        </span>
      </div>
      <div className="flex justify-center">
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider transition-all duration-300 ${redValida ? "bg-success text-success-foreground border-success/50" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
          {redValida ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {redValida ? "Red Institucional Detectada" : "Red Externa / No Autorizada"}
        </span>
      </div>
    </div>
  );
}
