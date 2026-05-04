"use client";

import { Info, Calendar, Download, User, QrCode, IdCard, ExternalLink, Activity, Clock, MapPin, Briefcase, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- Modal de Información ---
export function InfoModal({ infoDoc, setInfoDoc, formatearFecha }) {
  if (!infoDoc) return null;
  return (
    <Dialog open={!!infoDoc} onOpenChange={() => setInfoDoc(null)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" /> Detalles del Registro
          </DialogTitle>
          <DialogDescription>Información almacenada en la base de datos institucional.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Nombre Completo</p>
              <p className="text-sm font-semibold flex items-center gap-2"><User className="h-3 w-3" /> {infoDoc.nombre}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identificación (NUIP)</p>
              <p className="text-sm font-mono">{infoDoc.nuip}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tipo de Documento</p>
              <Badge variant="outline" className="capitalize">{infoDoc.tipo}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código de Registro</p>
              <p className="text-sm font-mono text-primary font-bold">{infoDoc.codigo}</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Descripción / Evento</p>
            <p className="text-sm bg-muted p-2 rounded-md italic">{infoDoc.descripcion || "Sin descripción adicional"}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fecha de Emisión</p>
              <p className="text-xs flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {formatearFecha(infoDoc.fecha)}</p>
            </div>
            {infoDoc.tipo === "afiliado" && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vencimiento</p>
                <p className="text-xs font-bold text-destructive flex items-center gap-1.5"><Clock className="h-3 w-3" /> {infoDoc.fechaVencimiento || "Indefinido"}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="w-full" onClick={() => window.open(`https://sistema-verificacion.vercel.app/verificar?doc=${infoDoc.codigo}`, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" /> Ver Vista Pública
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Modal de Bitácora ---
export function BitacoraModal({ verBitacoraDoc, setVerBitacoraDoc }) {
  if (!verBitacoraDoc) return null;
  return (
    <Dialog open={!!verBitacoraDoc} onOpenChange={() => setVerBitacoraDoc(null)}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Bitácora de Actividades
          </DialogTitle>
          <DialogDescription>
            Cronología de tareas registradas por <strong>{verBitacoraDoc.nombre}</strong> el día {verBitacoraDoc.fecha}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[350px] pr-4 mt-2">
          <div className="space-y-4">
            {verBitacoraDoc.bitacora?.map((item, idx) => (
              <div key={idx} className="relative pl-6 pb-4 border-l border-primary/20 last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <Clock className="h-3 w-3" /> {item.hora}
                  </span>
                  <p className="text-sm bg-card border rounded-lg p-2.5 shadow-sm leading-relaxed">
                    {item.actividad}
                  </p>
                </div>
              </div>
            ))}
            {(!verBitacoraDoc.bitacora || verBitacoraDoc.bitacora.length === 0) && (
              <div className="text-center py-10 text-muted-foreground italic">
                No se registraron actividades detalladas en esta jornada.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t mt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-2 rounded-lg bg-muted/50 border">
            <p className="text-[10px] uppercase text-muted-foreground font-bold">Modo</p>
            <p className="text-xs font-semibold capitalize flex items-center justify-center gap-1.5">
              {verBitacoraDoc.modoTrabajo === 'presencial' ? <Briefcase className="h-3 w-3"/> : <Monitor className="h-3 w-3"/>}
              {verBitacoraDoc.modoTrabajo}
            </p>
          </div>
          {verBitacoraDoc.ubicacion && (
             <div className="text-center p-2 rounded-lg bg-success/5 border-success/20 border">
                <p className="text-[10px] uppercase text-success font-bold">Ubicación</p>
                <a 
                  href={`https://www.google.com/maps?q=${verBitacoraDoc.ubicacion.lat},${verBitacoraDoc.ubicacion.lng}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-success hover:underline flex items-center justify-center gap-1"
                >
                  <MapPin className="h-3 w-3"/> Ver Mapa
                </a>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Diálogo de Eliminación ---
export function DeleteDialog({ codigoAEliminar, setCodigoAEliminar, confirmEliminar, eliminando }) {
  return (
    <Dialog open={!!codigoAEliminar} onOpenChange={() => setCodigoAEliminar(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Estás completamente seguro?</DialogTitle>
          <DialogDescription>
            Esta acción eliminará permanentemente el registro con código{" "}
            <strong>{codigoAEliminar}</strong>. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setCodigoAEliminar(null)} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmEliminar} disabled={eliminando}>
            {eliminando ? "Eliminando..." : "Sí, eliminar registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
