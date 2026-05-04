"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useDocumentos } from "@/hooks/use-documentos";
import { registrarAuditoria } from "@/lib/auditoria";

// UI Components
import ProtectedRoute from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, Users, LogOut, FileText, Briefcase, 
  RefreshCcw, History, ClipboardList 
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Custom Dashboard Components
import { DocumentosTab } from "@/components/dashboard/documentos-tab";
import { AsistenciaTab } from "@/components/dashboard/asistencia-tab";
import { AuditoriaTab } from "@/components/dashboard/auditoria-tab";
import { InfoModal, BitacoraModal, DeleteDialog } from "@/components/dashboard/dashboard-modals";
import { PersonalReadOnlyList } from "@/components/personal-read-only";

const VERIFICACION_BASE_URL = "https://sistema-verificacion.vercel.app/verificar?doc=";

// --- Helpers ---
function formatearFecha(fecha) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function descargarQR(docObj) {
  const codigo = typeof docObj === "string" ? docObj : docObj.codigo;
  const link = VERIFICACION_BASE_URL + codigo;
  try {
    const QRCode = (await import("qrcode")).default;
    const qrDataUrl = await QRCode.toDataURL(link, {
      width: 400,
      margin: 2,
      color: { dark: "#1e3a5f", light: "#ffffff" },
    });
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${codigo}.png`;
    a.click();
    toast.success("QR generado y listo");
  } catch (err) {
    console.error(err);
    toast.error("Error al generar QR");
  }
}

// --- Hook de Asistencia ---
function useAsistencias(fecha) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!fecha) return;
    setCargando(true);
    try {
      const q = query(collection(db, "asistencias"), where("fecha", "==", fecha), orderBy("creadoEn", "desc"));
      const snap = await getDocs(q);
      setRegistros(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar asistencias");
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);
  return { registros, cargando, recargar: cargar };
}

function DashboardContent() {
  const { user, userData, logout } = useAuth();
  const esSuperAdmin = userData?.rol === "superadmin";

  // State: Documentos
  const { documentos: docsOriginales, cargando, recargar: recargarDocs, toggleEstado, eliminarDocumento } = useDocumentos();
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  // State: Asistencia
  const [fechaAsistencia, setFechaAsistencia] = useState(new Date().toISOString().split("T")[0]);
  const [busquedaAsistencia, setBusquedaAsistencia] = useState("");
  const { registros: asistencias, cargando: cargandoAsistencias, recargar: recargarAsistencias } = useAsistencias(fechaAsistencia);

  // State: Auditoría
  const [logsAuditoria, setLogsAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);

  // Modals
  const [codigoAEliminar, setCodigoAEliminar] = useState(null);
  const [infoDoc, setInfoDoc] = useState(null);
  const [verBitacoraDoc, setVerBitacoraDoc] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  // --- Memos ---
  const filteredDocs = useMemo(() => {
    return docsOriginales.filter((d) => {
      const matchBusqueda = d.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || d.nuip?.includes(busqueda);
      const matchTipo = filtroTipo === "todos" || (filtroTipo === "afiliado" ? d.tipo === "afiliado" : (d.tipo === "documento" || d.tipo === "certificado"));
      return matchBusqueda && matchTipo;
    });
  }, [docsOriginales, busqueda, filtroTipo]);

  const statsDocs = useMemo(() => ([
    { label: "Total Registros", value: docsOriginales.length },
    { label: "Afiliados", value: docsOriginales.filter(d => d.tipo === 'afiliado').length },
    { label: "Documentos", value: docsOriginales.filter(d => d.tipo !== 'afiliado').length }
  ]), [docsOriginales]);

  const filteredAsistencias = useMemo(() => {
    return asistencias.filter(a => a.nombre?.toLowerCase().includes(busquedaAsistencia.toLowerCase()) || a.cargo?.toLowerCase().includes(busquedaAsistencia.toLowerCase()));
  }, [asistencias, busquedaAsistencia]);

  const statsAsistencia = useMemo(() => ([
    { label: "Total Registros", value: asistencias.length, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "En Jornada", value: asistencias.filter(a => a.estadoActual === 'trabajando' || a.estadoActual === 'teletrabajo_activo').length, icon: Briefcase, color: "bg-success/10 text-success" },
    { label: "En Almuerzo", value: asistencias.filter(a => a.estadoActual === 'almuerzo').length, icon: RefreshCcw, color: "bg-amber-500/10 text-amber-600" },
    { label: "Finalizado", value: asistencias.filter(a => a.estadoActual === 'finalizado').length, icon: History, color: "bg-muted text-muted-foreground" },
  ]), [asistencias]);

  // --- Handlers ---
  const cargarAuditoria = useCallback(async () => {
    if (!esSuperAdmin) return;
    setCargandoAuditoria(true);
    try {
      const q = query(collection(db, "auditoria"), orderBy("fecha", "desc"), where("fecha", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
      const snap = await getDocs(q);
      setLogsAuditoria(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar auditoría");
    } finally {
      setCargandoAuditoria(false);
    }
  }, [esSuperAdmin]);

  const confirmEliminar = async () => {
    if (!codigoAEliminar) return;
    setEliminando(true);
    try {
      const res = await eliminarDocumento(codigoAEliminar);
      if (res.success) {
        await registrarAuditoria({ user, userData, accion: "Eliminar Documento", documentoId: codigoAEliminar, detalles: "Eliminación permanente" });
        toast.success("Eliminado con éxito");
        setCodigoAEliminar(null);
      }
    } finally {
      setEliminando(false);
    }
  };

  const handleEliminarAsistencia = async (asistencia) => {
    if (!confirm(`¿Eliminar registro de ${asistencia.nombre}?`)) return;
    try {
      await deleteDoc(doc(db, "asistencias", asistencia.id));
      await registrarAuditoria({ user, userData, accion: "Eliminar Asistencia", documentoId: asistencia.id, detalles: "Borrado de asistencia" });
      toast.success("Eliminado");
      recargarAsistencias();
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={38} height={38} className="rounded-full shadow-sm" />
            <div>
              <h1 className="font-bold text-foreground text-sm tracking-tight">Panel Administrativo</h1>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Fundación Isla Cascajal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/generar">
              <Button size="sm" className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> Nuevo</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs defaultValue="documentos" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="documentos" className="gap-2"><FileText className="h-4 w-4" /> Documentos</TabsTrigger>
            {esSuperAdmin && <TabsTrigger value="asistencia" className="gap-2"><ClipboardList className="h-4 w-4" /> Asistencia</TabsTrigger>}
            {esSuperAdmin && <TabsTrigger value="personal" className="gap-2"><Users className="h-4 w-4" /> Personal</TabsTrigger>}
            {esSuperAdmin && <TabsTrigger value="auditoria" className="gap-2" onClick={cargarAuditoria}><History className="h-4 w-4" /> Auditoría</TabsTrigger>}
          </TabsList>

          <TabsContent value="documentos">
            <DocumentosTab 
              documentos={filteredDocs} busqueda={busqueda} setBusqueda={setBusqueda} 
              filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo} 
              cargando={cargando} stats={statsDocs} descargarQR={descargarQR} 
              setCodigoAEliminar={setCodigoAEliminar} setInfoDoc={setInfoDoc} 
              toggleEstado={toggleEstado} esSuperAdmin={esSuperAdmin} formatearFecha={formatearFecha} 
            />
          </TabsContent>

          {esSuperAdmin && (
            <TabsContent value="asistencia">
              <AsistenciaTab 
                cargandoAsistencias={cargandoAsistencias} registrosFiltrados={filteredAsistencias} 
                fechaAsistencia={fechaAsistencia} setFechaAsistencia={setFechaAsistencia} 
                busquedaAsistencia={busquedaAsistencia} setBusquedaAsistencia={setBusquedaAsistencia} 
                recargar={recargarAsistencias} setVerBitacoraDoc={setVerBitacoraDoc} 
                esSuperAdmin={esSuperAdmin} handleEliminarAsistencia={handleEliminarAsistencia} 
                statsAsistencia={statsAsistencia} 
              />
            </TabsContent>
          )}

          {esSuperAdmin && (
            <TabsContent value="personal">
              <PersonalReadOnlyList />
            </TabsContent>
          )}

          {esSuperAdmin && (
            <TabsContent value="auditoria">
              <AuditoriaTab logsAuditoria={logsAuditoria} cargandoAuditoria={cargandoAuditoria} cargarAuditoria={cargarAuditoria} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <InfoModal infoDoc={infoDoc} setInfoDoc={setInfoDoc} formatearFecha={formatearFecha} />
      <BitacoraModal verBitacoraDoc={verBitacoraDoc} setVerBitacoraDoc={setVerBitacoraDoc} />
      <DeleteDialog codigoAEliminar={codigoAEliminar} setCodigoAEliminar={setCodigoAEliminar} confirmEliminar={confirmEliminar} eliminando={eliminando} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
      <DashboardContent />
    </ProtectedRoute>
  );
}