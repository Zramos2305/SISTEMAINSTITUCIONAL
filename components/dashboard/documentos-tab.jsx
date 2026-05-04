"use client";

import { Search, Filter, Info, QrCode, Trash2, ToggleRight, ToggleLeft } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DocumentosTab({
  documentos,
  busqueda,
  setBusqueda,
  filtroTipo,
  setFiltroTipo,
  cargando,
  stats,
  descargarQR,
  setCodigoAEliminar,
  setInfoDoc,
  toggleEstado,
  esSuperAdmin,
  formatearFecha
}) {
  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buscador y Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o NUIP..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo de registro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="afiliado">Afiliados</SelectItem>
                  <SelectItem value="documento">Documentos/Certificados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : documentos.length === 0 ? (
            <Empty
              title="No se encontraron registros"
              description="Intenta ajustar tus criterios de búsqueda o filtros."
              className="py-20"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre / Beneficiario</TableHead>
                    <TableHead className="hidden md:table-cell">Identificación (NUIP)</TableHead>
                    <TableHead>Tipo / Código</TableHead>
                    <TableHead className="hidden sm:table-cell">Estado</TableHead>
                    <TableHead className="hidden xl:table-cell">Fecha Emisión</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc) => {
                    const isExpired = doc.tipo === "afiliado" && doc.fechaVencimiento && new Date(doc.fechaVencimiento) < new Date();
                    const esActivo = doc.activo !== false;

                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{doc.nombre}</span>
                            <span className="text-[10px] text-muted-foreground md:hidden">{doc.nuip}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm font-mono">
                          {doc.nuip}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs capitalize font-medium">{doc.tipo}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{doc.codigo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {doc.tipo === "afiliado" ? (
                            <button
                              onClick={() => {
                                if (isExpired) return;
                                toggleEstado(doc.codigo, esActivo);
                              }}
                              disabled={isExpired}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                isExpired
                                  ? "bg-destructive/10 text-destructive border-destructive/30 cursor-not-allowed"
                                  : esActivo
                                  ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                              }`}
                            >
                              {cargando ? (
                                <Spinner className="h-3 w-3" />
                              ) : esActivo ? (
                                <ToggleRight className="h-3.5 w-3.5" />
                              ) : (
                                <ToggleLeft className="h-3.5 w-3.5" />
                              )}
                              {isExpired ? "Vencido" : esActivo ? "Activo" : "Inactivo"}
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-success/10 text-success border-success/30 opacity-80 cursor-default">
                              <ToggleRight className="h-3.5 w-3.5" />
                              Activo
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                          {formatearFecha(doc.fecha)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-info hover:text-info"
                              title="Información"
                              onClick={() => setInfoDoc(doc)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => descargarQR(doc)}
                              title="Descargar QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            {esSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar"
                                onClick={() => setCodigoAEliminar(doc.codigo)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
