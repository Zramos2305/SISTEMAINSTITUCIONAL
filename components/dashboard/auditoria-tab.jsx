"use client";

import { History, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AuditoriaTab({ logsAuditoria, cargandoAuditoria, cargarAuditoria }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Historial de Auditoría
          </CardTitle>
          <p className="text-sm text-muted-foreground">Registro de acciones administrativas realizadas en el sistema.</p>
        </div>
        <Button variant="outline" size="sm" onClick={cargarAuditoria} disabled={cargandoAuditoria}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${cargandoAuditoria ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {cargandoAuditoria ? (
          <div className="flex items-center justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : logsAuditoria.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No hay registros de auditoría aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Documento/ID</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsAuditoria.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium whitespace-nowrap">
                      {log.fecha?.toDate ? log.fecha.toDate().toLocaleString('es-CO') : 'Reciente'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{log.usuarioNombre}</span>
                        <span className="text-[10px] text-muted-foreground">{log.usuarioEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase">{log.accion}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.documentoId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{log.detalles}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
