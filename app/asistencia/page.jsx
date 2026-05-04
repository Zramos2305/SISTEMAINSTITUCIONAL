"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/protected-route";
import { getDiaActualES, normalizarHorario } from "@/hooks/use-empleados";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registrarAuditoria } from "@/lib/auditoria";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Image from "next/image";
import {
  LogIn, LogOut, Coffee, RotateCcw, Monitor, CheckCircle2,
  Clock, User, Sun, Briefcase, CalendarOff
} from "lucide-react";

// Independent Attendance Components
import { RelojVivo } from "@/components/asistencia/reloj-vivo";
import { BadgeConexion } from "@/components/asistencia/badge-conexion";
import { LineaTiempo } from "@/components/asistencia/linea-tiempo";
import { AccionesAsistencia, BitacoraSeccion, ResumenRegistro } from "@/components/asistencia/asistencia-ui";

const IP_AUTORIZADA = "181.54.0.27";

// --- Helpers ---
function horaActual() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fechaHoy() { return new Date().toISOString().split("T")[0]; }

const MODALIDAD_DISPLAY = {
  presencial: { label: "Presencial", icon: Briefcase, color: "bg-success/15 text-success border-success/30" },
  teletrabajo: { label: "Teletrabajo", icon: Monitor, color: "bg-primary/15 text-primary border-primary/30" },
  libre: { label: "Día libre", icon: CalendarOff, color: "bg-muted text-muted-foreground border-border" },
};

const ESTADO_DISPLAY = {
  trabajando: { label: "En jornada", color: "bg-success/15 text-success border-success/30", dot: "bg-success", icon: Briefcase },
  almuerzo: { label: "En almuerzo", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", dot: "bg-amber-500", icon: Coffee },
  teletrabajo_activo: { label: "Teletrabajo", color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary", icon: Monitor },
  finalizado: { label: "Finalizado", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: CheckCircle2 },
  fuera_de_jornada: { label: "Sin registro", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: Clock },
};

function getAcciones(modalidad, registro) {
  const r = registro;
  if (modalidad === "presencial") {
    return [
      { id: "entrada", label: "Registrar Entrada", icon: LogIn, campo: "horaEntrada", estadoResultante: "trabajando", color: "bg-success hover:bg-success/90 text-success-foreground", show: !r?.horaEntrada, desc: "Marca el inicio de tu jornada presencial" },
      { id: "salida", label: "Registrar Salida", icon: LogOut, campo: "horaSalida", estadoResultante: "finalizado", color: "bg-destructive hover:bg-destructive/90 text-destructive-foreground", show: !!r?.horaEntrada && !r?.horaSalida, desc: "Marca el fin de tu jornada presencial" },
    ].filter((a) => a.show);
  }
  if (modalidad === "teletrabajo") {
    return [
      { id: "entrada", label: "Activar Teletrabajo", icon: Monitor, campo: "horaEntrada", estadoResultante: "teletrabajo_activo", color: "bg-primary hover:bg-primary/90 text-primary-foreground", show: !r?.horaEntrada, desc: "Inicia tu jornada en modalidad remota" },
      { id: "salidaAlmuerzo", label: "Salida Almuerzo", icon: Coffee, campo: "horaSalidaAlmuerzo", estadoResultante: "almuerzo", color: "bg-amber-500 hover:bg-amber-500/90 text-white", show: !!r?.horaEntrada && !r?.horaSalidaAlmuerzo, desc: "Marca tu salida para almorzar" },
      { id: "entradaAlmuerzo", label: "Regreso de Almuerzo", icon: RotateCcw, campo: "horaEntradaAlmuerzo", estadoResultante: "teletrabajo_activo", color: "bg-info hover:bg-info/90 text-info-foreground", show: !!r?.horaSalidaAlmuerzo && !r?.horaEntradaAlmuerzo, desc: "Regresa a tu jornada remota" },
      { id: "salida", label: "Registrar Salida", icon: LogOut, campo: "horaSalida", estadoResultante: "finalizado", color: "bg-destructive hover:bg-destructive/90 text-destructive-foreground", show: !!r?.horaEntrada && !r?.horaSalida && (!!r?.horaEntradaAlmuerzo || !r?.horaSalidaAlmuerzo), desc: "Finaliza tu jornada remota" },
    ].filter((a) => a.show);
  }
  return [];
}

function AsistenciaContent() {
  const { user, userData, empleadoData, empleadoId, loading, logout } = useAuth();
  const [registroHoy, setRegistroHoy] = useState(null);
  const [cargandoReg, setCargandoReg] = useState(true);
  const [accionEnCurso, setAccionEnCurso] = useState(null);
  const [actividad, setActividad] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [wifiValido, setWifiValido] = useState(false);
  const [gpsValido, setGpsValido] = useState(false);
  const [redValida, setRedValida] = useState(false);
  const [ipActual, setIpActual] = useState("");
  const [coords, setCoords] = useState(null);

  const hoy = fechaHoy();
  const diaActual = getDiaActualES();
  const horario = normalizarHorario(empleadoData?.horarioModalidad);
  const modalidadPermitida = horario[diaActual] || "libre";
  const modalidadCfg = MODALIDAD_DISPLAY[modalidadPermitida] || MODALIDAD_DISPLAY.libre;

  // --- Efectos: Conectividad y Carga ---
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsValido(true); setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => setGpsValido(false), { timeout: 5000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    setWifiValido(navigator.onLine);
    const on = () => setWifiValido(true);
    const off = () => setWifiValido(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const cargarRegistro = useCallback(async () => {
    if (!empleadoId) return;
    try {
      const snap = await getDoc(doc(db, "asistencias", `${hoy}_${empleadoId}`));
      if (snap.exists()) setRegistroHoy(snap.data());
      else setRegistroHoy(null);
    } finally { setCargandoReg(false); }
  }, [empleadoId, hoy]);

  useEffect(() => {
    async function checkRed() {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        setIpActual(data.ip);
        setRedValida(data.ip === IP_AUTORIZADA);
      } catch (e) { console.error("Error IP:", e); }
    }
    checkRed();
    cargarRegistro();
  }, [cargarRegistro]);

  // --- Handlers ---
  const handleAccion = async (accion) => {
    if (!wifiValido) return toast.error("Sin internet");
    if (modalidadPermitida === "presencial" && !redValida) return toast.error("Solo en red autorizada");
    setAccionEnCurso(accion.id);
    let ubicacionFinal = coords;
    const ref = doc(db, "asistencias", `${hoy}_${empleadoId}`);
    try {
      if (modalidadPermitida === "presencial" && !ubicacionFinal) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          ubicacionFinal = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) { console.warn("GPS falló"); }
      }
      const base = {
        [accion.campo]: serverTimestamp(),
        estadoActual: accion.estadoResultante,
        modoTrabajo: modalidadPermitida,
        modalidadAsignada: modalidadPermitida,
        wifiValidado: wifiValido,
        gpsValidado: !!ubicacionFinal,
        ubicacion: modalidadPermitida === "presencial" ? ubicacionFinal : null,
        redInstitucional: redValida,
        ipPublica: ipActual,
        actualizadoEn: serverTimestamp(),
      };
      if (!registroHoy) {
        await setDoc(ref, { ...base, id: `${hoy}_${empleadoId}`, empleadoId, nombre: empleadoData.nombre, cargo: empleadoData.cargo, fecha: hoy, creadoEn: serverTimestamp() });
      } else {
        await updateDoc(ref, base);
      }
      await registrarAuditoria({ user, userData: userData || empleadoData, accion: `Registro: ${accion.label}`, documentoId: `${hoy}_${empleadoId}`, detalles: `Registro ${accion.label} validado por servidor.` });
      await cargarRegistro();
      toast.success(`${accion.label} registrado`);
    } catch (e) { toast.error("Error al registrar"); }
    finally { setAccionEnCurso(null); }
  };

  const handleGuardarActividad = async () => {
    if (!actividad.trim() || !registroHoy) return;
    setEnviando(true);
    const hora = horaActual();
    try {
      await updateDoc(doc(db, "asistencias", `${hoy}_${empleadoId}`), {
        bitacora: arrayUnion({ actividad: actividad.trim(), hora, timestamp: new Date().toISOString() }),
        actualizadoEn: serverTimestamp(),
      });
      await registrarAuditoria({ user, userData: userData || empleadoData, accion: "Nueva Actividad", documentoId: `${hoy}_${empleadoId}`, detalles: `Actividad: ${actividad.substring(0, 50)}...` });
      setActividad("");
      await cargarRegistro();
      toast.success("Tarea guardada");
    } catch (e) { toast.error("Error"); }
    finally { setEnviando(false); }
  };

  // --- UI State ---
  if (loading || cargandoReg) return <div className="min-h-screen flex items-center justify-center bg-background"><Spinner className="h-10 w-10 text-primary" /></div>;
  
  const estadoActual = registroHoy?.estadoActual || "fuera_de_jornada";
  const estadoCfg = ESTADO_DISPLAY[estadoActual] || ESTADO_DISPLAY.fuera_de_jornada;
  const EIcon = estadoCfg.icon;
  const acciones = getAcciones(modalidadPermitida, registroHoy);
  const finalizado = estadoActual === "finalizado";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-2xl">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="rounded-full" />
            <div>
              <h1 className="font-semibold text-sm text-foreground">Control de Asistencia</h1>
              <p className="text-xs text-muted-foreground">Fundación Isla Cascajal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{empleadoData?.nombre || user?.email}</p>
              <p className="text-xs text-muted-foreground">{empleadoData?.cargo || "Empleado"}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">
        {/* Reloj y Conexión */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 px-6 pt-6 pb-4 space-y-4">
            <RelojVivo />
            {modalidadPermitida === "presencial" && <BadgeConexion wifiValido={wifiValido} gpsValido={gpsValido} redValida={redValida} />}
          </div>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-medium text-sm ${modalidadCfg.color}`}>
              <modalidadCfg.icon className="h-4 w-4" />
              <span>Modalidad hoy: <strong>{modalidadCfg.label}</strong></span>
              <span className="ml-auto text-xs opacity-70 capitalize">{diaActual}</span>
            </div>
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${estadoCfg.color}`}>
              <span className={`w-2 h-2 rounded-full ${estadoCfg.dot} animate-pulse`} />
              <EIcon className="h-4 w-4" />
              <span className="font-medium text-sm">{estadoCfg.label}</span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {modalidadPermitida !== "libre" && (
          <Card>
            <CardContent className="pt-6 pb-6"><LineaTiempo registro={registroHoy} modalidad={modalidadPermitida} /></CardContent>
          </Card>
        )}

        {/* Día Libre */}
        {modalidadPermitida === "libre" && (
          <Card><CardContent className="py-10 text-center space-y-4">
            <CalendarOff className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-semibold text-foreground">Hoy no tienes jornada laboral asignada</p>
          </CardContent></Card>
        )}

        {/* Finalizado */}
        {finalizado && modalidadPermitida !== "libre" && (
          <Card><CardContent className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <p className="font-semibold text-lg text-success">Jornada completada 🎉</p>
            <p className="text-sm text-muted-foreground italic">¡Buen trabajo, hasta mañana!</p>
          </CardContent></Card>
        )}

        {/* Acciones */}
        {!finalizado && modalidadPermitida !== "libre" && (
          <AccionesAsistencia acciones={acciones} handleAccion={handleAccion} accionEnCurso={accionEnCurso} />
        )}

        {/* Bitácora */}
        <BitacoraSeccion 
          registroHoy={registroHoy} actividad={actividad} setActividad={setActividad} 
          handleGuardarActividad={handleGuardarActividad} enviando={enviando} finalizado={finalizado} 
        />

        {/* Resumen */}
        <ResumenRegistro registroHoy={registroHoy} />

        <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest pb-4">
          Fundación Isla Cascajal · Gestión Institucional
        </p>
      </main>
    </div>
  );
}

export default function AsistenciaPage() {
  return (
    <ProtectedRoute allowedRoles={["empleado"]}>
      <AsistenciaContent />
    </ProtectedRoute>
  );
}
