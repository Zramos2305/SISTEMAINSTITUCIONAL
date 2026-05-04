"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/protected-route";
import { getDiaActualES, normalizarHorario } from "@/hooks/use-empleados";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registrarAuditoria } from "@/lib/auditoria";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import {
  LogIn, LogOut, Coffee, RotateCcw, Monitor, CheckCircle2,
  Clock, User, Wifi, WifiOff, MapPin, MapPinOff, Activity,
  Send, Sun, Briefcase, AlertCircle, Home, CalendarOff, ShieldCheck
} from "lucide-react";

const IP_AUTORIZADA = "181.54.0.27";

// ─── helpers ─────────────────────────────────────────────────────────────────

function horaActual() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fechaHoy() { return new Date().toISOString().split("T")[0]; }
function fmt(h) { 
  if (!h) return "—";
  if (h.toDate) return h.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  return h; 
}

// ─── config visual modalidad ──────────────────────────────────────────────────

const MODALIDAD_DISPLAY = {
  presencial: { label: "Presencial", icon: Briefcase, color: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  teletrabajo: { label: "Teletrabajo", icon: Monitor, color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  libre: { label: "Día libre", icon: CalendarOff, color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const ESTADO_DISPLAY = {
  trabajando: { label: "En jornada", color: "bg-success/15 text-success border-success/30", dot: "bg-success", icon: Briefcase },
  almuerzo: { label: "En almuerzo", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", dot: "bg-amber-500", icon: Coffee },
  teletrabajo_activo: { label: "Teletrabajo", color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary", icon: Monitor },
  finalizado: { label: "Finalizado", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: CheckCircle2 },
  fuera_de_jornada: { label: "Sin registro", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: Clock },
};

// ─── flujos por modalidad ─────────────────────────────────────────────────────

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

// ─── sub-componentes ──────────────────────────────────────────────────────────

function RelojVivo() {
  const [hora, setHora] = useState("");
  const [fecha, setFecha] = useState("");
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setHora(n.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
      setFecha(n.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center select-none">
      <p className="text-4xl font-bold tabular-nums tracking-tight text-primary">{hora || "—"}</p>
      <p className="text-sm text-muted-foreground mt-1 capitalize">{fecha}</p>
    </div>
  );
}

function BadgeConexion({ wifiValido, gpsValido, redValida }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4 text-xs">
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${wifiValido ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
          {wifiValido ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {wifiValido ? "Conexión OK" : "Sin Internet"}
        </span>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${gpsValido ? "bg-success/10 text-success border-success/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
          {gpsValido ? <MapPin className="h-3 w-3" /> : <MapPinOff className="h-3 w-3" />}
          {gpsValido ? "GPS OK" : "Sin GPS"}
        </span>
      </div>
      <div className="flex justify-center">
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] uppercase font-bold tracking-wider transition-all duration-300 ${redValida ? "bg-success text-success-foreground border-success/50" : "bg-destructive/10 text-destructive border-destructive/30"}`}>
          {redValida ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {redValida ? "Red Institucional Detectada" : "Red Externa / No Autorizada"}
        </span>
      </div>
    </div>
  );
}

function LineaTiempo({ registro, modalidad }) {
  const pasos = modalidad === "presencial"
    ? [
      { label: "Entrada", hora: registro?.horaEntrada, icon: LogIn, ok: !!registro?.horaEntrada },
      { label: "Salida", hora: registro?.horaSalida, icon: LogOut, ok: !!registro?.horaSalida },
    ]
    : [
      { label: "Inicio TT", hora: registro?.horaEntrada, icon: Monitor, ok: !!registro?.horaEntrada },
      { label: "Sal. almuerzo", hora: registro?.horaSalidaAlmuerzo, icon: Coffee, ok: !!registro?.horaSalidaAlmuerzo },
      { label: "Reg. almuerzo", hora: registro?.horaEntradaAlmuerzo, icon: RotateCcw, ok: !!registro?.horaEntradaAlmuerzo },
      { label: "Salida", hora: registro?.horaSalida, icon: LogOut, ok: !!registro?.horaSalida },
    ];
  return (
    <div className="flex items-start justify-between relative">
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-border z-0" />
      {pasos.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${p.ok ? "bg-success border-success text-success-foreground" : "bg-card border-border text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs text-muted-foreground text-center leading-tight">{p.label}</span>
            <span className={`text-xs font-medium tabular-nums ${p.ok ? "text-foreground" : "text-muted-foreground"}`}>{fmt(p.hora)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

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

  // Detectar modalidad asignada para hoy
  const horario = normalizarHorario(empleadoData?.horarioModalidad);
  const modalidadPermitida = horario[diaActual] || "libre";
  const modalidadCfg = MODALIDAD_DISPLAY[modalidadPermitida] || MODALIDAD_DISPLAY.libre;
  const ModIcon = modalidadCfg.icon;

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsValido(true);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setGpsValido(false),
      { timeout: 5000, enableHighAccuracy: true }
    );
  }, []);

  // WiFi
  useEffect(() => {
    setWifiValido(navigator.onLine);
    const on = () => setWifiValido(true);
    const off = () => setWifiValido(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Verificar IP pública y Red
  const verificarRed = useCallback(async () => {
    try {
      // Añadimos un timestamp para evitar que el navegador guarde la IP en caché
      const res = await fetch(`https://api.ipify.org?format=json&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setIpActual(data.ip);
      const esValida = data.ip === IP_AUTORIZADA;
      setRedValida(esValida);
      return data.ip;
    } catch (e) {
      console.error("Error detectando IP:", e);
      setRedValida(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (wifiValido) verificarRed();
  }, [wifiValido, verificarRed]);

  // Cargar registro del día
  const cargarRegistro = useCallback(async () => {
    if (!empleadoId) return;
    setCargandoReg(true);
    try {
      const ref = doc(db, "asistencias", `${hoy}_${empleadoId}`);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setRegistroHoy(snap.data());
        // No limpiamos el campo de texto, solo cargamos el estado
      } else {
        setRegistroHoy(null);
      }
    } catch (e) { console.error(e); toast.error("Error al cargar el registro"); }
    finally { setCargandoReg(false); }
  }, [empleadoId, hoy]);

  useEffect(() => {
    if (!loading) {
      if (empleadoId) {
        cargarRegistro();
      } else {
        setCargandoReg(false);
      }
    }
  }, [loading, empleadoId, cargarRegistro]);

  // Ejecutar acción
  const handleAccion = async (accion) => {
    if (!empleadoId) { toast.error("Sin perfil de empleado"); return; }
    setAccionEnCurso(accion.id);

    // Re-verificar IP antes de proceder si es presencial
    let ipParaRegistrar = ipActual;
    let esRedValida = redValida;

    if (modalidadPermitida === "presencial") {
      toast.loading("Validando conexión institucional...", { id: "val-ip" });
      const currentIp = await verificarRed();
      toast.dismiss("val-ip");

      if (currentIp !== IP_AUTORIZADA) {
        toast.error(`Acceso denegado: Estás conectado desde una red externa (${currentIp || 'Desconocida'}). Para registro presencial usa el WiFi de la Fundación.`, { duration: 5000 });
        setAccionEnCurso(null);
        return;
      }
      ipParaRegistrar = currentIp;
      esRedValida = true;
    }

    const ref = doc(db, "asistencias", `${hoy}_${empleadoId}`);
    try {
      // Capturar ubicación en el momento exacto si es presencial y no la tenemos
      let ubicacionFinal = coords;
      if (modalidadPermitida === "presencial" && !ubicacionFinal) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
          });
          ubicacionFinal = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(ubicacionFinal);
          setGpsValido(true);
        } catch (error) {
          console.warn("No se pudo obtener la ubicación exacta:", error);
        }
      }

      const snap = await getDoc(ref);
      const base = {
        [accion.campo]: serverTimestamp(), // Seguridad de servidor
        estadoActual: accion.estadoResultante,
        modoTrabajo: modalidadPermitida,
        modalidadAsignada: modalidadPermitida,
        wifiValidado: wifiValido,
        gpsValidado: !!ubicacionFinal,
        ubicacion: modalidadPermitida === "presencial" ? ubicacionFinal : null,
        redInstitucional: esRedValida,
        ipPublica: ipParaRegistrar,
        actualizadoEn: serverTimestamp(),
      };
      if (!snap.exists()) {
        await setDoc(ref, {
          fecha: hoy,
          empleadoId,
          nombre: empleadoData?.nombre || userData?.nombre || user?.email,
          cargo: empleadoData?.cargo || "",
          bitacora: [],
          creadoEn: serverTimestamp(),
          ...base,
        });
      } else {
        await updateDoc(ref, base);
      }

      // Registrar en Auditoría el movimiento del usuario
      await registrarAuditoria({
        user,
        userData: userData || empleadoData,
        accion: `Registro: ${accion.label}`,
        documentoId: `${hoy}_${empleadoId}`,
        detalles: `Registro de ${accion.label} (Modo: ${modalidadPermitida}) validado por servidor.`
      });

      await cargarRegistro();
      toast.success(`✅ ${accion.label} registrado correctamente`);
    } catch (e) { console.error(e); toast.error("Error al registrar. Intenta de nuevo."); }
    finally { setAccionEnCurso(null); }
  };

  // Guardar actividad
  const handleGuardarActividad = async () => {
    if (!actividad.trim()) { toast.error("Escribe una actividad"); return; }
    if (!registroHoy) { toast.error("Primero registra tu entrada"); return; }
    setEnviando(true);
    const hora = horaActual();
    try {
      await updateDoc(doc(db, "asistencias", `${hoy}_${empleadoId}`), {
        bitacora: arrayUnion({
          actividad: actividad.trim(),
          hora,
          timestamp: new Date().toISOString()
        }),
        actualizadoEn: serverTimestamp(),
      });

      // Registrar en Auditoría la adición de actividad
      await registrarAuditoria({
        user,
        userData: userData || empleadoData,
        accion: "Bitácora: Actividad",
        documentoId: `${hoy}_${empleadoId}`,
        detalles: `El usuario agregó una actividad a su bitácora: "${actividad.trim().substring(0, 50)}${actividad.trim().length > 50 ? '...' : ''}"`
      });

      toast.success("Actividad registrada en la bitácora ✔");
      setActividad(""); // Limpiar campo tras guardar
      await cargarRegistro();
    } catch (e) { toast.error("Error al guardar"); }
    finally { setEnviando(false); }
  };

  // Loading
  if (loading || cargandoReg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Spinner className="h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Cargando tu jornada…</p>
      </div>
    );
  }
  if (!user) return null;

  if (!empleadoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center shadow-lg border-primary/20">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Sin perfil de empleado</h2>
              <p className="text-sm text-muted-foreground px-2">
                Tu cuenta no está vinculada a un perfil administrativo. Contacta al administrador.
              </p>
              {userData && (
                <div className="mt-4 p-3 bg-muted rounded text-xs text-left text-muted-foreground break-all">
                  <p><strong>Debug info:</strong></p>
                  <p>Correo: {userData.correo}</p>
                  <p>Rol: {userData.rol}</p>
                  <p>EmpleadoID Vinculado: {userData.empleadoId || 'null'}</p>
                  {userData._debugError && (
                    <p className="text-destructive font-semibold mt-2">Error FS: {userData._debugError}</p>
                  )}
                </div>
              )}
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <Button asChild variant="default" className="w-full">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={logout}>
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estadoActual = registroHoy?.estadoActual || "fuera_de_jornada";
  const estadoCfg = ESTADO_DISPLAY[estadoActual] || ESTADO_DISPLAY.fuera_de_jornada;
  const EIcon = estadoCfg.icon;
  const acciones = getAcciones(modalidadPermitida, registroHoy);
  const finalizado = estadoActual === "finalizado";

  return (
    <div className="min-h-screen bg-background">
      {/* header */}
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
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="ml-1 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-4">

        {/* Reloj + estado conexión */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 px-6 pt-6 pb-4 space-y-4">
            <RelojVivo />
            {modalidadPermitida === "presencial" && (
              <BadgeConexion wifiValido={wifiValido} gpsValido={gpsValido} redValida={redValida} />
            )}
          </div>
          <CardContent className="pt-4 pb-4 space-y-3">
            {/* Modalidad autorizada hoy */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-medium text-sm ${modalidadCfg.color}`}>
              <ModIcon className="h-4 w-4" />
              <span>Modalidad autorizada hoy: <strong>{modalidadCfg.label}</strong></span>
              <span className="ml-auto text-xs opacity-70 capitalize">{diaActual}</span>
            </div>
            {/* Estado actual */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${estadoCfg.color}`}>
              <span className={`w-2 h-2 rounded-full ${estadoCfg.dot} animate-pulse`} />
              <EIcon className="h-4 w-4" />
              <span className="font-medium text-sm">{estadoCfg.label}</span>
            </div>
          </CardContent>
        </Card>

        {/* Línea de tiempo */}
        {modalidadPermitida !== "libre" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sun className="h-4 w-4" /> Registro de hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineaTiempo registro={registroHoy} modalidad={modalidadPermitida} />
            </CardContent>
          </Card>
        )}

        {/* Día libre */}
        {modalidadPermitida === "libre" && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <CalendarOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">Hoy no tienes jornada laboral asignada</p>
              <p className="text-sm text-muted-foreground">Disfruta tu día. El administrador no ha programado actividad para hoy.</p>
              <Badge variant="outline" className="capitalize">{diaActual} · Día libre</Badge>
            </CardContent>
          </Card>
        )}

        {/* Jornada finalizada */}
        {finalizado && modalidadPermitida !== "libre" && (
          <Card>
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <p className="font-semibold">Jornada completada 🎉</p>
              <p className="text-sm text-muted-foreground">Hasta mañana, {empleadoData?.nombre?.split(" ")[0] || "compañero/a"} 👋</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {registroHoy?.horaEntrada && <p>Entrada: <strong>{registroHoy.horaEntrada}</strong></p>}
                {registroHoy?.horaSalida && <p>Salida: <strong>{registroHoy.horaSalida}</strong></p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones de acción */}
        {!finalizado && modalidadPermitida !== "libre" && (
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
                        {enCurso ? <Spinner className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
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
        )}

        {/* Actualizar actividad */}
        {registroHoy && !finalizado && modalidadPermitida !== "libre" && (
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
        )}

        {/* Resumen */}
        {registroHoy && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Resumen del registro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
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
                ].map((item) => (
                  <div key={item.label} className="bg-muted/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium text-foreground truncate capitalize">{item.val}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Fundación Isla Cascajal · Sistema de Asistencia
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
