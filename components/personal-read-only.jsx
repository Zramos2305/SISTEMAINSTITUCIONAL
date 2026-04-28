"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEmpleados, calcularResumenHorario } from "@/hooks/use-empleados";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Monitor } from "lucide-react";

export function PersonalReadOnlyList() {
  const [usuarios, setUsuarios] = useState([]);
  const { empleados, isLoading: cargandoEmpleados, recargar } = useEmpleados();
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

  useEffect(() => {
    async function fetchUsuarios() {
      try {
        const usersSnap = await getDocs(collection(db, "usuarios"));
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsuarios(usersList);
      } catch (error) {
        console.error("Error loading users", error);
      } finally {
        setCargandoUsuarios(false);
      }
    }
    fetchUsuarios();
    recargar();
  }, [recargar]);

  if (cargandoUsuarios || cargandoEmpleados) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="border rounded-md mt-6 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Personal</TableHead>
            <TableHead>Rol / Cargo</TableHead>
            <TableHead>Modalidad Laboral</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => {
            const empleado = u.empleadoId ? empleados.find(e => e.id === u.empleadoId) : null;
            const resumenHorario = empleado ? calcularResumenHorario(empleado.horarioModalidad) : null;
            
            return (
              <TableRow key={u.id} className="bg-background">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{u.nombre}</span>
                    <span className="text-xs text-muted-foreground">{u.correo}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant="outline" className={
                      u.rol === 'superadmin' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                      u.rol === 'admin' ? 'bg-primary/10 text-primary border-primary/20' :
                      'bg-muted'
                    }>
                      {u.rol}
                    </Badge>
                    {empleado && (
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={empleado.cargo}>
                        {empleado.cargo}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {empleado && resumenHorario ? (
                    <div className="flex gap-1.5 flex-wrap">
                      {resumenHorario.presencial > 0 && (
                        <span className="inline-flex items-center text-xs font-medium text-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {resumenHorario.presencial}d pres.
                        </span>
                      )}
                      {resumenHorario.teletrabajo > 0 && (
                        <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                          <Monitor className="w-3 h-3 mr-1" /> {resumenHorario.teletrabajo}d TT
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No aplica</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={u.activo !== false ? "success" : "secondary"}>
                    {u.activo !== false ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
          {usuarios.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No hay personal registrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
