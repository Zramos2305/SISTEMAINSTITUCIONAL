"use client";

import { useState, useEffect } from "react";

export function RelojVivo() {
  const [hora, setHora] = useState("");
  const [fecha, setFecha] = useState("");
  
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setHora(n.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
      setFecha(n.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="text-center select-none">
      <p className="text-4xl font-bold tabular-nums tracking-tight text-primary">{hora || "—"}</p>
      <p className="text-sm text-muted-foreground mt-1 capitalize">{fecha}</p>
    </div>
  );
}
