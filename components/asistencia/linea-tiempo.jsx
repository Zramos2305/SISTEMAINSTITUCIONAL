"use client";

import { LogIn, LogOut, Coffee, Monitor, RotateCcw } from "lucide-react";

function fmt(h) { 
  if (!h) return "—";
  if (h.toDate) return h.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  return h; 
}

export function LineaTiempo({ registro, modalidad }) {
  const pasos = modalidad === "presencial"
    ? [
      { label: "Entrada", hora: registro?.horaEntrada, icon: LogIn, ok: !!registro?.horaEntrada },
      { label: "Salida", hora: registro?.horaSalida, icon: LogOut, ok: !!registro?.horaSalida },
    ]
    : [
      { label: "Inicio TT", hora: registro?.horaEntrada, icon: Monitor, ok: !!registro?.horaEntrada },
      { label: "Sal. almuerzo", hora: registro?.horaSalidaAlmuerzo, icon: Coffee, ok: !!registro?.horaSalidaAlmuerzo },
      { label: "Reg. almuerzo", hora: registro?.horaEntradaAlmuerzo, icon: RotateCcw, ok: !!registro?.horaEntradaAlmuerzo },
      { label: "Salida", hora: registro?.horaSalida, icon: LogOut, ok: !!registro?.horaSalida },
    ];

  return (
    <div className="flex items-start justify-between relative">
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-border z-0" />
      {pasos.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${p.ok ? "bg-success border-success text-success-foreground" : "bg-card border-border text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs text-muted-foreground text-center leading-tight">{p.label}</span>
            <span className={`text-xs font-medium tabular-nums ${p.ok ? "text-foreground" : "text-muted-foreground"}`}>{fmt(p.hora)}</span>
          </div>
        );
      })}
    </div>
  );
}
