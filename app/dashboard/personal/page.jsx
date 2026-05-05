"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/protected-route";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { useEmpleados, DIAS_SEMANA, MODALIDADES, calcularResumenHorario } from "@/hooks/use-empleados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  UserPlus,
  RefreshCcw,
  LogOut,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Briefcase,
  CalendarDays,
  Monitor,
  Home,
  CheckCircle2,
  Eye,
  EyeOff,
  Search
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { crearUsuarioInstitucional, eliminarUsuarioInstitucional } from "@/app/actions/usuarios";
import { registrarAuditoria } from "@/lib/auditoria";

const DIA_LABELS = {
  lunes: "Lun",
  martes: "Mar",
  miercoles: "Mié",
  jueves: "Jue",
  viernes: "Vie",
  sabado: "Sáb",
  domingo: "Dom",
};

const MODALIDAD_CONFIG = {
  presencial: { icon: Briefcase, label: "Presencial", color: "text-foreground" },
  teletrabajo: { icon: Monitor, label: "Teletrabajo", color: "text-primary border-primary/50" },
  libre: { icon: Home, label: "Día Libre", color: "text-muted-foreground bg-muted/30" },
};

function PersonalContent() {
  const { user, userData, logout } = useAuth();
  
  const [usuarios, setUsuarios] = useState([]);
  const { empleados, isLoading: cargandoEmpleados, recargar: recargarEmpleados, actualizarModalidad } = useEmpleados();
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  
  // Modal Crear Personal
  const [openCrear, setOpenCrear] = useState(false);
  const [creando, setCreando] = useState(false);
  const [formData, setFormData] = useState({
    cargo: ""
  });
  const [showPassword, setShowPassword] = useState(false);

  // Modal Horario
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [horarioEdit, setHorarioEdit] = useState({});
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cargarDatos = async () => {
    setCargandoUsuarios(true);
    try {
      const usersSnap = await getDocs(collection(db, "usuarios"));
      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(usersList);
      
      // Aseguramos que los logs de auditoría estén frescos si es necesario
      await recargarEmpleados();
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los datos");
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!formData.correo || !formData.password || !formData.nombre || !formData.rol) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (formData.rol === "empleado" && !formData.cargo) {
      toast.error("Debe especificar el cargo del empleado");
      return;
    }

    setCreando(true);
    try {
      const payload = {
        ...formData,
        creadoPorUid: user.uid
      };

      const result = await crearUsuarioInstitucional(payload);

      if (result.success) {
        await registrarAuditoria({
          user,
          userData,
          accion: "Crear Personal",
          documentoId: result.uid || formData.correo,
          detalles: `Se creó un nuevo usuario con rol ${formData.rol}: ${formData.nombre} (${formData.correo}).`
        });
        toast.success("Personal creado exitosamente");
        setOpenCrear(false);
        setFormData({ nombre: "", correo: "", password: "", rol: "empleado", cargo: "" });
        cargarDatos();
      } else {
        toast.error(result.error || "Error al crear el usuario");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error inesperado");
    } finally {
      setCreando(false);
    }
  };

  const handleEliminar = async (usuario) => {
    if (!confirm(`¿Estás seguro de eliminar a ${usuario.nombre}? Esta acción borrará su acceso y su perfil de personal permanentemente.`)) return;
    
    try {
      const result = await eliminarUsuarioInstitucional(usuario.id, usuario.empleadoId);
      if (result.success) {
        await registrarAuditoria({
          user,
          userData,
          accion: "Eliminar Personal",
          documentoId: usuario.id,
          detalles: `Se eliminó permanentemente al usuario ${usuario.nombre} (${usuario.correo}) y su perfil de empleado.`
        });
        toast.success("Personal eliminado correctamente");
        cargarDatos();
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    }
  };

  const abrirModalHorario = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setHorarioEdit({ ...empleado.horarioModalidad });
  };

  const handleCambioModalidad = (dia, nuevaModalidad) => {
    setHorarioEdit((prev) => ({ ...prev, [dia]: nuevaModalidad }));
  };

  const handleGuardarHorario = async () => {
    if (!empleadoSeleccionado) return;
    setGuardandoHorario(true);
    try {
      await actualizarModalidad(empleadoSeleccionado.id, horarioEdit);
      await registrarAuditoria({
        user,
        userData,
        accion: "Actualizar Horario",
        documentoId: empleadoSeleccionado.id,
        detalles: `Se actualizó la programación semanal de modalidad laboral para ${empleadoSeleccionado.nombre}.`
      });
      toast.success("Horario guardado");
      setEmpleadoSeleccionado(null);
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar horario");
    } finally {
      setGuardandoHorario(false);
    }
  };

  const cargando = cargandoUsuarios || cargandoEmpleados;

  const usuariosFiltrados = usuarios.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(query) ||
      u.correo?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-full" />
            <div>
              <h1 className="font-semibold text-foreground text-sm leading-tight">
                Gestión de Personal
              </h1>
              <p className="text-xs text-muted-foreground">Administración Integrada</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={cargarDatos} title="Recargar">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Directorio de Personal
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Administra accesos, roles, cargos y la programación laboral de la fundación.
            </p>
          </div>
          <Button onClick={() => setOpenCrear(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            Ingresar Personal
          </Button>
        </div>
        
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-card border-primary/20 focus-visible:ring-primary shadow-sm"
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Personal</TableHead>
                    <TableHead>Rol / Cargo</TableHead>
                    <TableHead>Modalidad Laboral</TableHead>
                    <TableHead>Estado Acceso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((u) => {
                    const empleado = u.empleadoId ? empleados.find(e => e.id === u.empleadoId) : null;
                    const resumenHorario = empleado ? calcularResumenHorario(empleado.horarioModalidad) : null;
                    
                    return (
                      <TableRow key={u.id}>
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {empleado && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => abrirModalHorario(empleado)}
                                className="h-8 gap-1.5"
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Horario</span>
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEliminar(u)}
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={u.id === user.uid}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {usuariosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-8 w-8 opacity-20" />
                          <p>No se encontraron resultados para "{searchQuery}"</p>
                          {searchQuery && (
                            <Button variant="link" onClick={() => setSearchQuery("")} className="text-primary p-0 h-auto text-xs">
                              Limpiar búsqueda
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Modal Crear Personal */}
      <Dialog open={openCrear} onOpenChange={setOpenCrear}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ingresar Personal</DialogTitle>
            <DialogDescription>
              Crea una cuenta de acceso y un perfil administrativo de una vez.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCrearUsuario} className="space-y-4 mt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  required
                  placeholder="Ej. Juan Pérez" 
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo de acceso</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  required
                  type="email"
                  placeholder="correo@ejemplo.com" 
                  value={formData.correo}
                  onChange={e => setFormData({...formData, correo: e.target.value})}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Rol del Sistema</label>
                <Select 
                  value={formData.rol} 
                  onValueChange={v => setFormData({...formData, rol: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña inicial</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 chars" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {formData.rol === "empleado" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium text-primary flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> Cargo Administrativo
                </label>
                <Input 
                  required={formData.rol === "empleado"}
                  placeholder="Ej. Asistente Administrativo" 
                  value={formData.cargo}
                  onChange={e => setFormData({...formData, cargo: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Al crear este usuario, se generará automáticamente su perfil de empleado listo para registrar asistencia y programar su modalidad laboral.
                </p>
              </div>
            )}

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenCrear(false)} disabled={creando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creando}>
                {creando && <Spinner className="mr-2 h-4 w-4" />}
                Ingresar Personal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Horario */}
      <Dialog open={!!empleadoSeleccionado} onOpenChange={(open) => !open && setEmpleadoSeleccionado(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Modalidad Laboral
            </DialogTitle>
            <DialogDescription>
              Programación semanal para <strong className="text-foreground">{empleadoSeleccionado?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((dia) => {
                const modalidadActual = horarioEdit[dia] || "libre";
                const cfg = MODALIDAD_CONFIG[modalidadActual];
                
                return (
                  <div key={dia} className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-center text-muted-foreground uppercase">
                      {DIA_LABELS[dia]}
                    </span>
                    <Select value={modalidadActual} onValueChange={(v) => handleCambioModalidad(dia, v)}>
                      <SelectTrigger
                        className={`h-9 px-0 justify-center [&>span]:w-full [&>span]:text-center [&>svg]:hidden border-2 ${cfg.color}`}
                        title={`${DIA_LABELS[dia]}: ${cfg.label}`}
                      >
                        <SelectValue>
                          <div className="flex justify-center w-full">
                            <cfg.icon className="h-4 w-4" />
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {MODALIDADES.map((m) => {
                          const mc = MODALIDAD_CONFIG[m];
                          return (
                            <SelectItem key={m} value={m} className="text-xs py-2">
                              <div className="flex items-center gap-2">
                                <mc.icon className="h-3.5 w-3.5" />
                                <span>{mc.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-muted/30 p-3 rounded-lg text-xs flex justify-center gap-4 text-muted-foreground border">
              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-foreground"/> Presencial</span>
              <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5 text-primary"/> Teletrabajo</span>
              <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5"/> Libre</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEmpleadoSeleccionado(null)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarHorario} disabled={guardandoHorario}>
              {guardandoHorario ? <Spinner className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Guardar Programación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default function PersonalPage() {
  return (
    <ProtectedRoute allowedRoles={["superadmin"]}>
      <PersonalContent />
    </ProtectedRoute>
  );
}
