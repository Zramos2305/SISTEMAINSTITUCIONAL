"use client";

import { Search, RefreshCcw, ListChecks, MapPin, Trash2, Home, Briefcase, Monitor, Coffee, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ESTADO_ASISTENCIA = {
  trabajando:        { label: "En jornada",   color: "bg-success/15 text-success border-success/30",             icon: Briefcase,     dot: "bg-success" },
  almuerzo:          { label: "En almuerzo",  color: "bg-amber-500/15 text-amber-600 border-amber-500/30",       icon: Coffee,        dot: "bg-amber-500" },
  teletrabajo_activo:{ label: "Teletrabajo",  color: "bg-primary/15 text-primary border-primary/30",            icon: Monitor,       dot: "bg-primary" },
  finalizado:        { label: "Finalizado",   color: "bg-muted text-muted-foreground border-border",            icon: CheckCircle2,  dot: "bg-muted-foreground" },
  fuera_de_jornada:  { label: "Sin registro", color: "bg-muted text-muted-foreground border-border",            icon: Clock,         dot: "bg-muted-foreground" },
};

function BadgeEstado({ estado }) {
  const cfg = ESTADO_ASISTENCIA[estado] || ESTADO_ASISTENCIA.fuera_de_jornada;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function formatearHoraAsistencia(h) {
  if (!h) return "—";
  if (h.toDate) return h.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  return h;
}

export function AsistenciaTab({
  cargandoAsistencias,
  registrosFiltrados,
  fechaAsistencia,
  setFechaAsistencia,
  busquedaAsistencia,
  setBusquedaAsistencia,
  recargar,
  setVerBitacoraDoc,
  esSuperAdmin,
  handleEliminarAsistencia,
  statsAsistencia
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsAsistencia.map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1">Fecha</label>
                <input
                  type="date"
                  value={fechaAsistencia}
                  onChange={(e) => setFechaAsistencia(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="pt-5">
                <Button variant="outline" size="sm" onClick={recargar} disabled={cargandoAsistencias}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${cargandoAsistencias ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado o cargo…"
                value={busquedaAsistencia}
                onChange={(e) => setBusquedaAsistencia(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* tabla de registros */}
      <Card>
        <CardContent className="p-0">
          {cargandoAsistencias ? (
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-8 w-8" />
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <Empty
              title="Sin registros"
              description={`No hay registros de asistencia para el ${fechaAsistencia}`}
              className="py-14"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden sm:table-cell">Cargo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Entrada</TableHead>
                    <TableHead className="hidden lg:table-cell">Sal. Almuerzo</TableHead>
                    <TableHead className="hidden lg:table-cell">Reg. Almuerzo</TableHead>
                    <TableHead className="hidden md:table-cell">Salida</TableHead>
                    <TableHead className="hidden xl:table-cell">Modo</TableHead>
                    <TableHead>Acciones</TableHead>
                    <TableHead className="text-right">Eliminar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosFiltrados.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.nombre}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{reg.cargo || "—"}</TableCell>
                      <TableCell>
                        <BadgeEstado estado={reg.estadoActual} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm tabular-nums">{formatearHoraAsistencia(reg.horaEntrada)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm tabular-nums">{formatearHoraAsistencia(reg.horaSalidaAlmuerzo)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm tabular-nums">{formatearHoraAsistencia(reg.horaEntradaAlmuerzo)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm tabular-nums">{formatearHoraAsistencia(reg.horaSalida)}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {reg.modoTrabajo === "teletrabajo" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <Home className="h-3 w-3" /> Remoto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3" /> Presencial
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {reg.bitacora?.length > 0 && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setVerBitacoraDoc(reg)} title="Ver Bitácora">
                              <ListChecks className="h-4 w-4" />
                            </Button>
                          )}
                          {reg.ubicacion && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success" asChild title="Ver Ubicación">
                              <a href={`https://www.google.com/maps?q=${reg.ubicacion.lat},${reg.ubicacion.lng}`} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {!reg.bitacora && !reg.ubicacion && (
                            <span className="text-xs text-muted-foreground italic">Ninguna</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {esSuperAdmin && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                            onClick={() => handleEliminarAsistencia(reg)}
                            title="Eliminar Asistencia"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
