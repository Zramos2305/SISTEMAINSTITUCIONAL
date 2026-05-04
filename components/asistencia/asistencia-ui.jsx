"use client";

import { Activity, Send, Clock, CheckCircle2, Briefcase, Monitor, Coffee, MapPin, Spinner as SpinnerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const Spinner = ({ className }) => <SpinnerIcon className={`animate-spin ${className}`} />;

function fmt(h) { 
  if (!h) return "—";
  if (h.toDate) return h.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  return h; 
}

// --- Botones de Acción ---
export function AccionesAsistencia({ acciones, handleAccion, accionEnCurso }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" /> Acciones disponibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {acciones.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay acciones disponibles en este momento.</p>
        ) : (
          acciones.map((accion) => {
            const Icon = accion.icon;
            const enCurso = accionEnCurso === accion.id;
            return (
              <button
                key={accion.id}
                onClick={() => handleAccion(accion)}
                disabled={!!accionEnCurso}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${accion.color}`}
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  {enCurso ? <Spinner className="h-5 w-5 text-white" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-sm">{accion.label}</p>
                  <p className="text-xs opacity-80">{accion.desc}</p>
                </div>
                <Clock className="h-4 w-4 opacity-60" />
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// --- Registro de Bitácora ---
export function BitacoraSeccion({ registroHoy, actividad, setActividad, handleGuardarActividad, enviando, finalizado }) {
  if (!registroHoy || finalizado) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" /> ¿Qué estás haciendo ahora?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Ej: Diseñando piezas para la campaña de mayo…"
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          className="resize-none min-h-[90px] text-sm"
          maxLength={300}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{actividad.length}/300</span>
          <Button size="sm" onClick={handleGuardarActividad} disabled={enviando || !actividad.trim()}>
            {enviando ? <Spinner className="mr-2 h-3 w-3" /> : <Send className="mr-2 h-3 w-3" />}
            Registrar tarea
          </Button>
        </div>
        {registroHoy?.bitacora?.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de hoy</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {[...registroHoy.bitacora].reverse().map((item, idx) => (
                <div key={idx} className="text-xs bg-muted/50 rounded-lg px-3 py-2 border flex justify-between gap-3 items-start">
                  <span className="flex-1 italic">"{item.actividad}"</span>
                  <span className="text-[10px] font-bold text-primary whitespace-nowrap bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                    {item.hora}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Resumen Final ---
export function ResumenRegistro({ registroHoy }) {
  if (!registroHoy) return null;

  const campos = [
    { label: "Empleado", val: registroHoy.nombre },
    { label: "Cargo", val: registroHoy.cargo || "—" },
    { label: "Modalidad", val: registroHoy.modalidadAsignada || registroHoy.modoTrabajo || "—" },
    { label: "Entrada", val: fmt(registroHoy.horaEntrada) },
    { label: "Sal. almuerzo", val: fmt(registroHoy.horaSalidaAlmuerzo) },
    { label: "Reg. almuerzo", val: fmt(registroHoy.horaEntradaAlmuerzo) },
    { label: "Salida", val: fmt(registroHoy.horaSalida) },
    { label: "IP Registro", val: registroHoy.ipPublica || "No reg." },
    { label: "Red Inst.", val: registroHoy.redInstitucional ? "✅ Sí" : "❌ No" },
    { label: "WiFi validado", val: registroHoy.wifiValidado ? "✅ Sí" : "❌ No" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Resumen del registro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {campos.map((item) => (
            <div key={item.label} className="bg-muted/40 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-medium text-foreground truncate capitalize">{item.val}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
