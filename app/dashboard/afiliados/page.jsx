"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/protected-route";
import { useAfiliados } from "@/hooks/use-afiliados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { toast } from "sonner";
import {
  Search, User, Phone, Eye, AlertCircle, Download, Users, CheckCircle2,
  XCircle, ArrowLeft, MoreVertical, FileText, QrCode, Trash2, PawPrint, FileSpreadsheet, Plus, X, UserPlus, LogOut
} from "lucide-react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

const COLORS = {
  azul: "#3f7384",
  verde: "#606f3a",
  amarillo: "#f4b958",
  rojo: "#cd7243"
};

const getVerificacionBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/verificar?doc=`;
  }
  return "https://cascajal.com/verificar?doc=";
};

function formatearFecha(fecha) {
  if (!fecha) return "-";
  let dateObj;
  if (typeof fecha.toDate === "function") {
    dateObj = fecha.toDate();
  } else if (fecha && typeof fecha.seconds === "number") {
    dateObj = new Date(fecha.seconds * 1000);
  } else {
    dateObj = new Date(fecha);
  }
  if (isNaN(dateObj.getTime())) return "Fecha inválida";
  return dateObj.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function exportarCSV(lista, nombre) {
  if (lista.length === 0) {
    toast.error("No hay datos para exportar");
    return;
  }
  const encabezados = ["Código", "Nombre", "NUIP", "Email", "Teléfono", "Estado", "Membresías", "Referidor", "Fecha Ingreso"];
  const filas = lista.map((item) => {
    return [
      item.codigo || "",
      item.nombre || "",
      item.cedula || "",
      item.email || "",
      item.telefono || "",
      item.estado || "",
      item.membresias?.map(m => m.tipo).join(" / ") || "",
      item.codigoReferidor || "",
      formatearFecha(item.fechaCreacion || item.fechaIngreso)
    ];
  });
  const contenido = [encabezados, ...filas].map((e) => e.map(s => `"${String(s).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Exportacion_${nombre}_${new Date().getTime()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function CRM_Afiliados() {
  const { user, userData, loading: authLoading, logout } = useAuth();
  const isLiderComercial = userData?.rol === "lider_comercial";
  const { afiliados, isLoading } = useAfiliados();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [membresiaFilter, setMembresiaFilter] = useState("todas");
  const [paisFilter, setPaisFilter] = useState("todos");
  const [referidorFilter, setReferidorFilter] = useState("");
  
  // Selección múltiple
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkChangeStatusOpen, setIsBulkChangeStatusOpen] = useState(false);
  const [bulkNewStatus, setBulkNewStatus] = useState("activo");

  // Estado del modal de perfil
  const [selectedAfiliado, setSelectedAfiliado] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState("resumen"); // resumen, beneficiarios, mascotas
  
  // Edición temporal de beneficiarios y mascotas
  const [tempBeneficiarios, setTempBeneficiarios] = useState([]);
  const [tempMascotas, setTempMascotas] = useState([]);

  // Estado descargas
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentCertData, setCurrentCertData] = useState(null);
  const carnetRef = useRef(null);

  // Eliminación
  const [afiliadoAEliminar, setAfiliadoAEliminar] = useState(null);

  const paisesUnicos = useMemo(() => {
    const paises = new Set(afiliados.map(a => a.pais).filter(Boolean));
    return Array.from(paises).sort();
  }, [afiliados]);

  // Filtro avanzado
  const afiliadosFiltrados = useMemo(() => {
    const ahora = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(ahora.getDate() + 30);

    return afiliados.filter((afiliado) => {
      // 1. Texto
      const matchSearch =
        afiliado.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        afiliado.cedula?.includes(searchTerm) ||
        afiliado.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        afiliado.telefono?.includes(searchTerm);

      // 2. Estado
      let matchStatus = true;
      if (statusFilter === "por_expirar") {
        matchStatus = afiliado.membresias?.some(m => {
          if (!m.fechaExpiracion) return false;
          const exp = new Date(m.fechaExpiracion);
          return exp > ahora && exp <= en30Dias;
        }) || false;
      } else if (statusFilter === "vencidos") {
        matchStatus = afiliado.membresias?.some(m => {
          if (!m.fechaExpiracion) return false;
          const exp = new Date(m.fechaExpiracion);
          return exp < ahora;
        }) || false;
      } else if (statusFilter !== "todos") {
        matchStatus = afiliado.estado === statusFilter;
      }
      
      // 3. Membresía
      let matchMembresia = true;
      if (membresiaFilter !== "todas") {
        matchMembresia = afiliado.membresias?.some(m => m.tipo.toLowerCase() === membresiaFilter) || false;
      }

      // 4. País
      let matchPais = true;
      if (paisFilter !== "todos") {
        matchPais = afiliado.pais === paisFilter;
      }

      // 5. Referidor
      let matchReferidor = true;
      if (referidorFilter.trim() !== "") {
        matchReferidor = afiliado.codigoReferidor?.toLowerCase().includes(referidorFilter.toLowerCase());
      }

      return matchSearch && matchStatus && matchMembresia && matchPais && matchReferidor;
    });
  }, [afiliados, searchTerm, statusFilter, membresiaFilter, paisFilter, referidorFilter]);

  const stats = useMemo(() => {
    const activos = afiliados.filter(a => a.estado === "activo").length;
    const inactivos = afiliados.filter(a => a.estado === "inactivo").length;
    const pendientes = afiliados.filter(a => a.estado === "pendiente").length;
    return { activos, inactivos, pendientes, total: afiliados.length };
  }, [afiliados]);

  // Selección
  const toggleSelectAll = () => {
    if (selectedIds.size === afiliadosFiltrados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(afiliadosFiltrados.map(a => a.id)));
    }
  };

  const toggleSelectOne = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // WhatsApp
  const handleWhatsApp = (telefono) => {
    if (!telefono) {
      toast.error("Este afiliado no tiene número de teléfono registrado.");
      return;
    }
    const cleanPhone = telefono.replace(/\D/g, '');
    window.open(`https://wa.me/57${cleanPhone}?text=Hola,%20te%20escribimos%20de%20la%20Fundación%20Isla%20Cascajal.`, '_blank');
  };

  // Abrir Perfil
  const verPerfil = (afiliado) => {
    setSelectedAfiliado(afiliado);
    setTempBeneficiarios(afiliado.beneficiarios || []);
    setTempMascotas(afiliado.mascotas || []);
    setProfileTab("resumen");
    setIsProfileModalOpen(true);
  };

  // Guardar Beneficiarios
  const guardarBeneficiarios = async () => {
    try {
      await updateDoc(doc(db, "afiliados", selectedAfiliado.id), { beneficiarios: tempBeneficiarios });
      setSelectedAfiliado(prev => ({ ...prev, beneficiarios: tempBeneficiarios }));
      toast.success("Beneficiarios actualizados");
    } catch (e) {
      toast.error("Error al guardar beneficiarios");
    }
  };

  // Guardar Mascotas
  const guardarMascotas = async () => {
    try {
      await updateDoc(doc(db, "afiliados", selectedAfiliado.id), { mascotas: tempMascotas });
      setSelectedAfiliado(prev => ({ ...prev, mascotas: tempMascotas }));
      toast.success("Mascotas actualizadas");
    } catch (e) {
      toast.error("Error al guardar mascotas");
    }
  };

  // Cambiar estado individual
  const cambiarEstadoIndividual = async (nuevoEstado) => {
    try {
      await updateDoc(doc(db, "afiliados", selectedAfiliado.id), { estado: nuevoEstado });
      setSelectedAfiliado(prev => ({ ...prev, estado: nuevoEstado }));
      toast.success("Estado actualizado");
    } catch (e) {
      toast.error("Error actualizando estado");
    }
  };

  // Acciones Masivas
  const exportarSeleccionados = () => {
    const seleccionados = afiliadosFiltrados.filter(a => selectedIds.has(a.id));
    exportarCSV(seleccionados, "AfiliadosSeleccionados");
  };

  const ejecutarCambioMasivoEstado = async () => {
    setIsDownloading(true);
    try {
      const promesas = Array.from(selectedIds).map(id => 
        updateDoc(doc(db, "afiliados", id), { estado: bulkNewStatus })
      );
      await Promise.all(promesas);
      toast.success(`${promesas.length} afiliados actualizados a ${bulkNewStatus}`);
      setSelectedIds(new Set());
      setIsBulkChangeStatusOpen(false);
    } catch (e) {
      toast.error("Error en cambio masivo");
    } finally {
      setIsDownloading(false);
    }
  };

  // Eliminar
  const ejecutarEliminacion = async () => {
    if (!afiliadoAEliminar) return;
    try {
      await deleteDoc(doc(db, "afiliados", afiliadoAEliminar.id));
      toast.success("Afiliado eliminado correctamente");
      setAfiliadoAEliminar(null);
      if (selectedAfiliado?.id === afiliadoAEliminar.id) {
        setIsProfileModalOpen(false);
      }
    } catch (e) {
      toast.error("Error eliminando afiliado");
    }
  };

  // Descargas
  const descargarCarnet = async () => {
    if (!selectedAfiliado || !carnetRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(carnetRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [380, 580] });
      pdf.addImage(imgData, "PNG", 0, 0, 380, 580);
      pdf.save(`Carnet_${selectedAfiliado.nombre.replace(/\s+/g, "_")}.pdf`);
      toast.success("Carnet descargado");
    } catch (error) {
      toast.error("Error al generar el carnet");
    } finally {
      setIsDownloading(false);
    }
  };

  const descargarQR = async () => {
    if (!selectedAfiliado) return;
    try {
      const url = await QRCode.toDataURL(`${getVerificacionBaseUrl()}${selectedAfiliado.codigo}`, { width: 300, margin: 2 });
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR_${selectedAfiliado.nombre.replace(/\s+/g, "_")}.png`;
      a.click();
    } catch (e) {
      toast.error("Error generando QR");
    }
  };

  const descargarCertificado = async (membresia) => {
    setCurrentCertData({ persona: selectedAfiliado, membresia });
    setIsDownloading(true);
    toast.info(`Generando certificado...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 800)); // Esperar render
      const templateId = membresia.tipo === "educativa" ? "hidden-cert-edu" : "hidden-cert-integral";
      const element = document.getElementById(templateId);
      if (!element) throw new Error("Template no encontrado");

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const qrDataUrl = await QRCode.toDataURL(`${getVerificacionBaseUrl()}${selectedAfiliado.codigo}`);
      const qrSize = 35;
      const marginX = pdfWidth - qrSize - 20;
      const marginY = pdf.internal.pageSize.getHeight() - qrSize - 30;

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(marginX - 2, marginY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F');
      pdf.addImage(qrDataUrl, "PNG", marginX, marginY, qrSize, qrSize);

      pdf.save(`Certificado_${membresia.tipo.toUpperCase()}_${selectedAfiliado.nombre.replace(/\s+/g, "_")}.pdf`);
      toast.success("Certificado descargado");
    } catch (err) {
      toast.error("Error al generar PDF");
    } finally {
      setIsDownloading(false);
      setCurrentCertData(null);
    }
  };

  const getPeriodoEducativo = (fechaExp) => {
    if (!fechaExp) return "";
    const date = new Date(fechaExp);
    const year = date.getFullYear();
    const month = date.getMonth();
    const letra = month <= 5 ? "A" : "B";
    return `${year}${letra}`;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "superadmin", "lider_comercial"]}>
      <div className="min-h-screen bg-slate-50 pb-12">
        <header className="bg-white border-b shadow-sm sticky top-0 z-20">
          <div className="w-full px-4 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isLiderComercial && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-800">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              )}
              <h1 className="font-black text-slate-800 text-xl flex items-center gap-2" style={{ color: COLORS.verde }}>
                <Users className="h-6 w-6" /> CRM Afiliados Avanzado
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/afiliar">
                <Button className="font-bold shadow-md h-10" style={{ backgroundColor: COLORS.azul }}>
                  <UserPlus className="h-4 w-4 mr-2" /> Nueva Afiliación
                </Button>
              </Link>
              {isLiderComercial && (
                <Button variant="outline" className="font-bold shadow-sm h-10 text-red-600 border-red-200 hover:bg-red-50" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" /> Salir
                </Button>
              )}
            </div>

          </div>
          <div className="h-1 w-full flex">
            <div style={{ flex: 1, backgroundColor: COLORS.azul }} />
            <div style={{ flex: 1, backgroundColor: COLORS.verde }} />
            <div style={{ flex: 1, backgroundColor: COLORS.amarillo }} />
            <div style={{ flex: 1, backgroundColor: COLORS.rojo }} />
          </div>
        </header>

        <main className="w-full px-4 lg:px-8 mt-8">
          
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total</p>
                  <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 bg-green-50 rounded-2xl">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Activos</p>
                  <p className="text-3xl font-black text-slate-800">{stats.activos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 bg-red-50 rounded-2xl">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Inactivos</p>
                  <p className="text-3xl font-black text-slate-800">{stats.inactivos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-4 bg-amber-50 rounded-2xl">
                  <AlertCircle className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pendientes</p>
                  <p className="text-3xl font-black text-slate-800">{stats.pendientes}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buscador y Filtros Avanzados */}
          <Card className="shadow-sm border-0 bg-white mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input 
                    placeholder="Buscar por Nombre, Cédula, Código..." 
                    className="pl-10 h-12 bg-slate-50 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los Estados</SelectItem>
                      <SelectItem value="activo">Activos</SelectItem>
                      <SelectItem value="inactivo">Inactivos</SelectItem>
                      <SelectItem value="pendiente">Pendientes</SelectItem>
                      <SelectItem value="por_expirar">Por expirar (30d)</SelectItem>
                      <SelectItem value="vencidos">Membresía Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select value={membresiaFilter} onValueChange={setMembresiaFilter}>
                    <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Membresía" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas Membresías</SelectItem>
                      <SelectItem value="educativa">Educativa</SelectItem>
                      <SelectItem value="integral">Integral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Select value={paisFilter} onValueChange={setPaisFilter}>
                    <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200">
                      <SelectValue placeholder="País" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los Países</SelectItem>
                      {paisesUnicos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barra de Acciones Masivas */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between sticky top-[72px] z-10 shadow-md">
              <span className="font-semibold text-blue-800 text-sm">
                {selectedIds.size} afiliados seleccionados
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-100" onClick={exportarSeleccionados}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Selección
                </Button>
                <Button size="sm" onClick={() => setIsBulkChangeStatusOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Cambiar Estado
                </Button>
              </div>
            </div>
          )}

          {/* Tabla */}
          <Card className="shadow-sm border-0 bg-white overflow-hidden rounded-2xl">
            <div className="overflow-x-auto min-h-[400px]">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="w-[40px] pl-4">
                      <Checkbox 
                        checked={selectedIds.size === afiliadosFiltrados.length && afiliadosFiltrados.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Seleccionar todos"
                      />
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-widest py-4">Afiliado</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-widest py-4">Membresía</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-widest py-4">Estado</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-widest py-4">Contacto</TableHead>
                    <TableHead className="font-bold text-slate-500 uppercase text-xs tracking-widest py-4 text-right pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {afiliadosFiltrados.length > 0 ? (
                    afiliadosFiltrados.map((afiliado) => (
                      <TableRow key={afiliado.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <TableCell className="pl-4">
                          <Checkbox 
                            checked={selectedIds.has(afiliado.id)}
                            onCheckedChange={() => toggleSelectOne(afiliado.id)}
                            aria-label={`Seleccionar ${afiliado.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100 border flex items-center justify-center overflow-hidden shrink-0">
                              {afiliado.foto ? <img src={afiliado.foto} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-slate-400" />}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{afiliado.nombre}</p>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">CC: {afiliado.cedula} • {afiliado.codigo}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5 flex-wrap">
                            {afiliado.membresias?.length > 0 ? afiliado.membresias.map((m, i) => (
                              <Badge key={i} variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${m.tipo === 'educativa' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                {m.tipo}
                              </Badge>
                            )) : <span className="text-xs text-slate-400 italic">Sin asignar</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={afiliado.estado === "activo" ? "default" : "secondary"} className={`uppercase text-[10px] font-bold tracking-wider ${afiliado.estado === 'activo' ? 'bg-green-100 text-green-800' : afiliado.estado === 'inactivo' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                            {afiliado.estado || "Desconocido"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600 font-medium">
                            <p>{afiliado.email || "Sin correo"}</p>
                            <p className="text-slate-400">{afiliado.telefono || "Sin teléfono"}</p>
                          </div>
                        </TableCell>
                        {!isLiderComercial && (
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleWhatsApp(afiliado.telefono)} title="WhatsApp">
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 text-slate-600 hover:bg-slate-50 font-semibold" onClick={() => verPerfil(afiliado)}>
                                Ver Perfil
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Empty icon={<Users className="h-10 w-10 text-slate-300" />} title="No hay afiliados" description="Intenta buscar con otros términos." />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </main>

        {/* Modal de Perfil Completo */}
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="p-0 overflow-hidden flex flex-col bg-slate-50 border-0 shadow-2xl rounded-2xl" style={{ maxWidth: '1100px', width: '95vw', height: '95vh' }}>
            {selectedAfiliado && (
              <>
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                      {selectedAfiliado.foto ? <img src={selectedAfiliado.foto} className="h-full w-full object-cover" /> : <User className="h-6 w-6 text-slate-400" />}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black text-slate-800">{selectedAfiliado.nombre}</DialogTitle>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">CÓDIGO: {selectedAfiliado.codigo}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <Select value={selectedAfiliado.estado} onValueChange={(val) => cambiarEstadoIndividual(val)}>
                        <SelectTrigger className={`h-8 w-[120px] text-xs font-bold uppercase tracking-wider ${selectedAfiliado.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">ACTIVO</SelectItem>
                          <SelectItem value="inactivo">INACTIVO</SelectItem>
                          <SelectItem value="pendiente">PENDIENTE</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                </div>

                <div className="flex border-b bg-white px-4 gap-4 shrink-0 overflow-x-auto">
                  <button onClick={() => setProfileTab("resumen")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'resumen' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Resumen y Documentos</button>
                  <button onClick={() => setProfileTab("beneficiarios")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'beneficiarios' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Beneficiarios</button>
                  <button onClick={() => setProfileTab("mascotas")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'mascotas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Mascotas</button>
                  <button onClick={() => setProfileTab("referidos")} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${profileTab === 'referidos' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Red de Referidos</button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-50">
                  {profileTab === "resumen" && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
                      <div className="space-y-6">
                        <Card className="shadow-sm border-0">
                          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Datos Personales</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-slate-500">NUIP</div><div className="font-semibold text-slate-800">{selectedAfiliado.cedula}</div>
                              <div className="text-slate-500">Fecha Ingreso</div><div className="font-semibold text-slate-800">{formatearFecha(selectedAfiliado.fechaCreacion || selectedAfiliado.fechaIngreso)}</div>
                              <div className="text-slate-500">Email</div><div className="font-semibold text-slate-800">{selectedAfiliado.email || "-"}</div>
                              <div className="text-slate-500">Teléfono</div><div className="font-semibold text-slate-800">{selectedAfiliado.telefono || "-"}</div>
                              <div className="text-slate-500">País</div><div className="font-semibold text-slate-800">{selectedAfiliado.pais || "-"}</div>
                              <div className="text-slate-500">Referido Por</div><div className="font-semibold text-slate-800">{selectedAfiliado.codigoReferidor || "-"}</div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="shadow-sm border-0">
                          <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Descargas</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start font-semibold text-blue-700 hover:bg-blue-50" onClick={descargarQR}>
                              <QrCode className="h-4 w-4 mr-2" /> Descargar Código QR
                            </Button>
                            {selectedAfiliado.membresias?.map((m, i) => (
                               <Button key={i} variant="outline" className="w-full justify-start font-semibold text-green-700 hover:bg-green-50" onClick={() => descargarCertificado(m)} disabled={isDownloading}>
                                {isDownloading ? <Spinner className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />} 
                                Certificado {m.tipo}
                              </Button>
                            ))}
                          </CardContent>
                        </Card>
                        
                        <div className="pt-4 mt-8 border-t border-red-200">
                          <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setAfiliadoAEliminar(selectedAfiliado)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Eliminar Afiliado Permanentemente
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <div className="mb-4 w-full">
                           <Button className="w-full font-bold shadow-md h-12" style={{ backgroundColor: COLORS.azul }} onClick={descargarCarnet} disabled={isDownloading}>
                            {isDownloading ? <Spinner className="mr-2 h-5 w-5" /> : <Download className="mr-2 h-5 w-5" />} Descargar Carnet
                          </Button>
                        </div>
                        {/* Visualización del Carnet (Tamaño Real, Sin Escalar) */}
                        <div id="carnet-virtual" ref={carnetRef} style={{ width: '380px', height: '580px', background: '#ffffff', position: 'relative', overflow: 'hidden', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ width: '100%', height: '20px', display: 'flex', flexShrink: 0 }}>
                            <div style={{ flex: 1, backgroundColor: COLORS.rojo }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.amarillo }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.verde }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.azul }} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '8px', position: 'relative' }}>
                            <img src="/logo.png" alt="Logo" crossOrigin="anonymous" style={{ width: '115px', height: '115px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }} />
                            <h2 style={{ color: COLORS.verde, fontWeight: 900, fontSize: '26px', margin: 0, marginTop: '4px', lineHeight: 1.2 }}>ISLA CASCAJAL</h2>
                            <p style={{ color: '#ea580c', fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', margin: 0, marginTop: '-2px', letterSpacing: '1px' }}>Fundación</p>
                            <div style={{ marginTop: '12px', width: '100px', height: '110px', borderRadius: '12px', backgroundColor: '#f1f5f9', border: '2px solid #e2e8f0', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              {selectedAfiliado?.foto ? <img src={selectedAfiliado.foto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User className="h-8 w-8 text-slate-300" />}
                            </div>
                            <div style={{ marginTop: '12px', width: '100%', textAlign: 'center' }}>
                              <h3 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.2, color: COLORS.verde, margin: 0 }}>{selectedAfiliado?.nombre}</h3>
                              <p style={{ fontWeight: 900, fontSize: '14px', color: '#ea580c', margin: 0, marginTop: '2px' }}>NUIP. {selectedAfiliado?.cedula}</p>
                            </div>
                            <div style={{ marginTop: '8px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 8px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '24px' }}>
                                  <div>
                                    <p style={{ fontSize: '11px', fontWeight: 900, color: COLORS.verde, margin: 0 }}>CÓDIGO</p>
                                    <p style={{ fontSize: '14px', fontWeight: 900, color: '#ea580c', margin: 0 }}>{selectedAfiliado?.codigo}</p>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: '11px', fontWeight: 900, color: COLORS.verde, margin: 0 }}>RH</p>
                                    <p style={{ fontSize: '14px', fontWeight: 900, color: '#ea580c', margin: 0 }}>{selectedAfiliado?.rh || "A+"}</p>
                                  </div>
                                </div>
                                <div style={{ marginTop: '4px' }}>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedAfiliado?.membresias?.map((m, i) => (
                                      <span key={i} style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: m.tipo === 'educativa' ? '#1d4ed8' : '#15803d', backgroundColor: m.tipo === 'educativa' ? '#dbeafe' : '#dcfce3', padding: '4px 12px', borderRadius: '12px', border: `1px solid ${m.tipo === 'educativa' ? '#93c5fd' : '#86efac'}` }}>{m.tipo}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div style={{ padding: '4px', borderRadius: '12px', border: '3px solid #854d0e', backgroundColor: 'white' }}>
                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=05318a&data=${encodeURIComponent(getVerificacionBaseUrl() + selectedAfiliado?.codigo)}`} crossOrigin="anonymous" style={{ width: "85px", height: "85px" }} />
                              </div>
                            </div>
                            <div style={{ position: 'absolute', bottom: '8px', right: '16px' }}>
                              <p style={{ fontSize: '12px', fontWeight: 900, color: COLORS.azul, margin: 0 }}>@fundacionislacascajal</p>
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '20px', display: 'flex', marginTop: 'auto', flexShrink: 0 }}>
                            <div style={{ flex: 1, backgroundColor: COLORS.azul }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.verde }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.amarillo }} />
                            <div style={{ flex: 1, backgroundColor: COLORS.rojo }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === "beneficiarios" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-slate-800">Beneficiarios Asociados</h3>
                         <Button size="sm" onClick={() => setTempBeneficiarios([...tempBeneficiarios, { nombre: "", nuip: "", parentesco: "" }])}>
                           <Plus className="h-4 w-4 mr-2"/> Agregar
                         </Button>
                      </div>
                      {tempBeneficiarios.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No hay beneficiarios registrados.</p>
                      ) : (
                        <div className="space-y-3">
                          {tempBeneficiarios.map((b, index) => (
                            <div key={index} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm border items-center">
                               <Input value={b.nombre} onChange={e => { const newB = [...tempBeneficiarios]; newB[index].nombre = e.target.value; setTempBeneficiarios(newB); }} placeholder="Nombre Completo" />
                               <Input value={b.nuip} onChange={e => { const newB = [...tempBeneficiarios]; newB[index].nuip = e.target.value; setTempBeneficiarios(newB); }} placeholder="NUIP" className="w-32" />
                               <Input value={b.parentesco} onChange={e => { const newB = [...tempBeneficiarios]; newB[index].parentesco = e.target.value; setTempBeneficiarios(newB); }} placeholder="Parentesco" className="w-32" />
                               <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => { const newB = tempBeneficiarios.filter((_, i) => i !== index); setTempBeneficiarios(newB); }}>
                                 <X className="h-4 w-4"/>
                               </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-4 flex justify-end">
                         <Button className="bg-blue-600 hover:bg-blue-700" onClick={guardarBeneficiarios}>Guardar Cambios</Button>
                      </div>
                    </div>
                  )}

                  {profileTab === "mascotas" && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                         <h3 className="text-lg font-bold text-slate-800">Mascotas Asociadas</h3>
                         <Button size="sm" onClick={() => setTempMascotas([...tempMascotas, { nombre: "", tipo: "", raza: "" }])}>
                           <PawPrint className="h-4 w-4 mr-2"/> Agregar
                         </Button>
                      </div>
                      {tempMascotas.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No hay mascotas registradas.</p>
                      ) : (
                        <div className="space-y-3">
                          {tempMascotas.map((m, index) => (
                            <div key={index} className="flex gap-3 bg-white p-3 rounded-xl shadow-sm border items-center">
                               <Input value={m.nombre} onChange={e => { const newM = [...tempMascotas]; newM[index].nombre = e.target.value; setTempMascotas(newM); }} placeholder="Nombre Mascota" />
                               <Input value={m.tipo} onChange={e => { const newM = [...tempMascotas]; newM[index].tipo = e.target.value; setTempMascotas(newM); }} placeholder="Tipo (ej. Perro, Gato)" className="w-32" />
                               <Input value={m.raza} onChange={e => { const newM = [...tempMascotas]; newM[index].raza = e.target.value; setTempMascotas(newM); }} placeholder="Raza" className="w-32" />
                               <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => { const newM = tempMascotas.filter((_, i) => i !== index); setTempMascotas(newM); }}>
                                 <X className="h-4 w-4"/>
                               </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="pt-4 flex justify-end">
                         <Button className="bg-blue-600 hover:bg-blue-700" onClick={guardarMascotas}>Guardar Mascotas</Button>
                      </div>
                    </div>
                  )}

                  {profileTab === "referidos" && (
                    <div className="space-y-6">
                      <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <Users className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-amber-900">
                              {selectedAfiliado.referidosExitosos || 0} Personas Referidas
                            </h3>
                            <p className="text-sm font-semibold text-amber-700">
                              Acumulados para próximo descuento: {selectedAfiliado.referidosExitosos || 0}/5
                            </p>
                          </div>
                        </div>
                        {selectedAfiliado.referidosExitosos >= 5 && (
                          <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg text-sm font-bold flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2" /> 
                            Este afiliado ya tiene derecho a acceder al Plan Referidos.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800">Historial de Referidos</h3>
                        {(!selectedAfiliado.listaReferidos || selectedAfiliado.listaReferidos.length === 0) ? (
                          <Empty icon={<Users className="h-8 w-8 text-slate-300" />} title="Sin referidos aún" description="Este afiliado no ha traído referidos al programa." />
                        ) : (
                          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <div className="divide-y">
                              {[...selectedAfiliado.listaReferidos].reverse().map((refItem, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                      <User className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-800 text-sm">{refItem.nombre}</p>
                                      <p className="text-xs font-semibold text-slate-500 mt-0.5 uppercase">Afiliación Activa</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Exitoso</Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmación de Eliminación */}
        <AlertDialog open={!!afiliadoAEliminar} onOpenChange={(open) => !open && setAfiliadoAEliminar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600 flex items-center gap-2"><AlertCircle className="h-5 w-5"/> Confirmar Eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas eliminar permanentemente a <strong>{afiliadoAEliminar?.nombre}</strong>? 
                Esta acción no se puede deshacer y borrará toda la información relacionada con este afiliado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={ejecutarEliminacion}>Sí, Eliminar Permanentemente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal Confirmación Bulk Estado */}
        <AlertDialog open={isBulkChangeStatusOpen} onOpenChange={setIsBulkChangeStatusOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cambio de Estado Masivo</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a cambiar el estado de {selectedIds.size} afiliados seleccionados. Elige el nuevo estado:
              </AlertDialogDescription>
              <div className="py-4">
                 <Select value={bulkNewStatus} onValueChange={setBulkNewStatus}>
                  <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">ACTIVOS</SelectItem>
                    <SelectItem value="inactivo">INACTIVOS</SelectItem>
                    <SelectItem value="pendiente">PENDIENTES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white" onClick={ejecutarCambioMasivoEstado}>Aplicar Cambios</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Templates ocultos para descarga de certificados */}
        <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
          {currentCertData && (
            <>
              {/* Template de Aval Educativo */}
              <div id="hidden-cert-edu" style={{ width: "800px", padding: "80px", background: "white", fontFamily: "'Times New Roman', serif", color: "#1a1a1a", lineHeight: "1.6", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: `2px solid ${COLORS.azul}`, paddingBottom: "15px" }}>
                  <img src="/logo.png" alt="Logo" style={{ width: "90px", height: "90px", borderRadius: "50%" }} />
                  <div style={{ textAlign: "right" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: COLORS.azul }}>FUNDACIÓN ISLA CASCAJAL</h1>
                    <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0, color: "#666", textTransform: "uppercase" }}>NIT: 900.248.351-0</p>
                  </div>
                </div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", textDecoration: "underline", margin: 0 }}>CERTIFICADO DE AVAL EDUCATIVO</h2>
                </div>
                <div style={{ fontSize: "14px", textAlign: "justify" }}>
                  <p>La presente organización de base denominada FUNDACIÓN ISLA CASCAJAL “FICong”, identificada con NIT: 900.248.351-0, con domicilio principal en el Distrito de Santiago de Cali, República de Colombia, se permite presentar a <strong>{currentCertData.persona.nombre}</strong> con NUIP. <strong>{currentCertData.persona.cedula}</strong>, quien cuenta con registro oficial en nuestra base de datos institucional y con membresía activa para acceder a nuestros convenios educativos.</p>
                  <p>Esta membresía fue realizada el día {formatearFecha(currentCertData.persona.fechaCreacion || currentCertData.persona.fechaIngreso)}, bajo el código institucional <strong>{currentCertData.persona.codigo}</strong> y tiene validez y cobertura para los convenios Nacionales e Internacionales y le permite acceder a los programas, actividades y procesos académicos establecidos y ofertados por los aliados estratégicos de la Fundación Isla Cascajal y por ella misma.</p>
                  <p>Después de corroborar que se asumirán los compromisos académicos, sociales y morales por parte del titular de este documento, se procede a conceder AVAL y se le solicita a la institución educativa receptora de este documento, que, de acuerdo al convenio interinstitucional firmado por las partes, se avance en el otorgamiento de los correspondientes descuentos para programas académicos y demás servicios educativos para el período académico {getPeriodoEducativo(currentCertData.membresia.fechaExpiracion)}. El presente documento se expide a los {new Date().getDate().toString().padStart(2, '0')} días del mes de {new Date().toLocaleString('es-CO', { month: 'long' })} de {new Date().getFullYear()} en Santiago de Cali por interés del solicitante.</p>
                </div>
                <div style={{ marginTop: "20px", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                    <img src="/firma.jpeg" alt="Firma" style={{ height: "60px", marginBottom: "5px" }} onError={(e) => e.target.style.display = 'none'} />
                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Diana C. Rojas V.</p>
                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Directora Administrativa</p>
                    <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic" }}>Fundación Isla Cascajal</p>
                    <p style={{ margin: 0, fontSize: "10px", fontStyle: "italic" }}>Documento electrónico verificable con el código QR.</p>
                  </div>
                </div>
              </div>

              {/* Template de Afiliación Integral */}
              <div id="hidden-cert-integral" style={{ width: "800px", padding: "80px", background: "white", fontFamily: "'Times New Roman', serif", color: "#1a1a1a", lineHeight: "1.6", boxSizing: "border-box" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: `2px solid ${COLORS.azul}`, paddingBottom: "15px" }}>
                  <img src="/logo.png" alt="Logo" style={{ width: "90px", height: "90px", borderRadius: "50%" }} />
                  <div style={{ textAlign: "right" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: COLORS.azul }}>FUNDACIÓN ISLA CASCAJAL</h1>
                    <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0, color: "#666", textTransform: "uppercase" }}>NIT: 900.248.351-0</p>
                  </div>
                </div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "20px", fontWeight: "bold", textDecoration: "underline", margin: 0 }}>CERTIFICADO DE AFILIACIÓN INTEGRAL</h2>
                </div>
                <div style={{ fontSize: "14px", textAlign: "justify" }}>
                  <p>La presente organización de base denominada FUNDACIÓN ISLA CASCAJAL “FICong”, identificada con NIT: 900.248.351-0, con domicilio principal en el Distrito de Santiago de Cali, República de Colombia, se permite presentar a <strong>{currentCertData.persona.nombre}</strong> con NUIP. <strong>{currentCertData.persona.cedula}</strong>, bajo el código institucional <strong>{currentCertData.persona.codigo}</strong> y le permite acceder a los descuentos que otorgan nuestros convenios interinstitucionales.</p>
                  <p>Esta membresía tiene validez y cobertura para los convenios Nacionales e Internacionales y le permite acceder a los programas, actividades y procesos establecidos por la Fundación Isla Cascajal, así pues; después de corroborar que se asumirán los compromisos sociales y morales por parte del titular de este documento, se procede a reconocer su AFILIACIÓN ACTIVA y se le solicita a la organización receptora de este documento, que, de acuerdo al convenio interinstitucional firmado por las partes, se avance en el otorgamiento de los correspondientes descuentos especiales tanto al titular de la membresía como a sus beneficiarios y mascotas hasta las 11:59 p.m. del día {formatearFecha(currentCertData.membresia.fechaExpiracion)}.</p>
                </div>
                {currentCertData.persona.beneficiarios?.length > 0 && (
                  <div style={{ marginTop: "15px", border: "1px solid #000", padding: "8px", paddingBottom: "10px" }}>
                    <p style={{ color: "#0070C0", margin: 0, marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}>BENEFICIARIOS:</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {currentCertData.persona.beneficiarios.map((b, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", paddingRight: "20px" }}>
                          <span>{b.nombre}</span><span>NUIP: {b.nuip || "Sin registro"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {currentCertData.persona.mascotas?.length > 0 && (
                  <div style={{ marginTop: "10px", border: "1px solid #000", padding: "8px", paddingBottom: "10px" }}>
                    <p style={{ color: "#0070C0", margin: 0, marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}>MASCOTAS (PLAN INTEGRAL):</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      {currentCertData.persona.mascotas.map((m, i) => (
                        <div key={i} style={{ fontSize: "11px" }}>{m.nombre} ({m.tipo}{m.raza ? ` - ${m.raza}` : ''})</div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: "20px", paddingBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "12px", marginBottom: "20px" }}>El presente documento se expide a los {new Date().getDate().toString().padStart(2, '0')} días del mes de {new Date().toLocaleString('es-CO', { month: 'long' })} de {new Date().getFullYear()} en Santiago de Cali.</p>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
                    <img src="/firma.jpeg" alt="Firma" style={{ height: "60px", marginBottom: "5px" }} onError={(e) => e.target.style.display = 'none'} />
                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Diana C. Rojas V.</p>
                    <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Directora Administrativa</p>
                    <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic" }}>Fundación Isla Cascajal</p>
                    <p style={{ margin: 0, fontSize: "10px", fontStyle: "italic" }}>Documento electrónico verificable con el código QR.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
