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
  Send, Sun, Briefcase, AlertCircle, Home, CalendarOff, ShieldCheck, FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IPS_AUTORIZADAS = ["181.57.30.136", "191.156.13.184", "181.54.0.27"];

// ─── helpers ─────────────────────────────────────────────────────────────────

function horaActual() {
  return new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fechaHoy() { return new Date().toISOString().split("T")[0]; }
function fmt(h) {
  if (!h) return "—";
  if (typeof h.toDate === "function") {
    return h.toDate().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (h && typeof h.seconds === "number") {
    return new Date(h.seconds * 1000).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  return typeof h === "object" ? "—" : h;
}

function diffMinutos(hora1, hora2) {
  if (!hora1 || !hora2) return 0;
  const [h1, m1] = hora1.split(':').map(Number);
  const [h2, m2] = hora2.split(':').map(Number);
  return (h1 * 60 + m1) - (h2 * 60 + m2);
}

function fmtDiferencia(minutos) {
  const m = Math.abs(minutos);
  if (m < 60) return `${m} min`;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ─── config visual modalidad ──────────────────────────────────────────────────

const MODALIDAD_DISPLAY = {
  presencial: { label: "Presencial", icon: Briefcase, color: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  teletrabajo: { label: "Teletrabajo", icon: Monitor, color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  presencial_sin_horario: { label: "Presencial (Sin Horario)", icon: Briefcase, color: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  teletrabajo_sin_horario: { label: "Teletrabajo (Sin Horario)", icon: Monitor, color: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
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
  if (modalidad === "presencial" || modalidad === "presencial_sin_horario") {
    return [
      { id: "entrada", label: "Entrada Primera Jornada", icon: LogIn, campo: "horaEntrada", estadoResultante: "trabajando", color: "bg-success hover:bg-success/90 text-success-foreground", show: !r?.horaEntrada, desc: "Inicia tu primera jornada presencial" },
      { id: "salidaAlmuerzo", label: "Salida Primera Jornada", icon: Coffee, campo: "horaSalidaAlmuerzo", estadoResultante: "almuerzo", color: "bg-amber-500 hover:bg-amber-500/90 text-white", show: !!r?.horaEntrada && !r?.horaSalidaAlmuerzo, desc: "Finaliza tu primera jornada" },
      { id: "entradaAlmuerzo", label: "Entrada Segunda Jornada", icon: RotateCcw, campo: "horaEntradaAlmuerzo", estadoResultante: "trabajando", color: "bg-info hover:bg-info/90 text-info-foreground", show: !!r?.horaSalidaAlmuerzo && !r?.horaEntradaAlmuerzo, desc: "Inicia tu segunda jornada presencial" },
      { id: "salida", label: "Salida Segunda Jornada", icon: LogOut, campo: "horaSalida", estadoResultante: "finalizado", color: "bg-destructive hover:bg-destructive/90 text-destructive-foreground", show: !!r?.horaEntrada && !r?.horaSalida && (!!r?.horaEntradaAlmuerzo || !r?.horaSalidaAlmuerzo), desc: "Finaliza tu segunda jornada" },
    ].filter((a) => a.show);
  }
  if (modalidad === "teletrabajo" || modalidad === "teletrabajo_sin_horario") {
    return [
      { id: "entrada", label: "Entrada Primera Jornada", icon: Monitor, campo: "horaEntrada", estadoResultante: "teletrabajo_activo", color: "bg-primary hover:bg-primary/90 text-primary-foreground", show: !r?.horaEntrada, desc: "Inicia tu primera jornada remota" },
      { id: "salidaAlmuerzo", label: "Salida Primera Jornada", icon: Coffee, campo: "horaSalidaAlmuerzo", estadoResultante: "almuerzo", color: "bg-amber-500 hover:bg-amber-500/90 text-white", show: !!r?.horaEntrada && !r?.horaSalidaAlmuerzo, desc: "Finaliza tu primera jornada remota" },
      { id: "entradaAlmuerzo", label: "Entrada Segunda Jornada", icon: RotateCcw, campo: "horaEntradaAlmuerzo", estadoResultante: "teletrabajo_activo", color: "bg-info hover:bg-info/90 text-info-foreground", show: !!r?.horaSalidaAlmuerzo && !r?.horaEntradaAlmuerzo, desc: "Inicia tu segunda jornada remota" },
      { id: "salida", label: "Salida Segunda Jornada", icon: LogOut, campo: "horaSalida", estadoResultante: "finalizado", color: "bg-destructive hover:bg-destructive/90 text-destructive-foreground", show: !!r?.horaEntrada && !r?.horaSalida && (!!r?.horaEntradaAlmuerzo || !r?.horaSalidaAlmuerzo), desc: "Finaliza tu segunda jornada remota" },
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
  const pasos = [
    { label: modalidad === "presencial" ? "Entrada" : "Inicio TT", hora: registro?.horaEntrada, icon: modalidad === "presencial" ? LogIn : Monitor, ok: !!registro?.horaEntrada },
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
  const [horasTrabajadas, setHorasTrabajadas] = useState("0h 0m");
  const [showRemuneracionModal, setShowRemuneracionModal] = useState(false);
  const [generandoCert, setGenerandoCert] = useState(false);
  const [certConRemuneracion, setCertConRemuneracion] = useState(false);

  const [generandoAfiliacion, setGenerandoAfiliacion] = useState(false);
  const [generandoAval, setGenerandoAval] = useState(false);
  const [generandoDesprendible, setGenerandoDesprendible] = useState(false);
  const [showDesprendibleModal, setShowDesprendibleModal] = useState(false);
  const [desprendibleMes, setDesprendibleMes] = useState(new Date().getMonth());
  const [desprendibleQuincena, setDesprendibleQuincena] = useState("1");

  const hoy = fechaHoy();
  const diaActual = getDiaActualES();

  // Detectar modalidad asignada para hoy
  const horario = normalizarHorario(empleadoData?.horarioModalidad);
  const horarioHoy = horario[diaActual] || { modalidad: "libre", entrada: "08:00", salida: "17:00" };
  const modalidadPermitida = horarioHoy.modalidad;
  const modalidadCfg = MODALIDAD_DISPLAY[modalidadPermitida] || MODALIDAD_DISPLAY.libre;
  const ModIcon = modalidadCfg.icon;

  // Calcular horas trabajadas dinámicamente
  useEffect(() => {
    const calc = () => {
      if (!registroHoy || !registroHoy.horaEntrada) return;
      const sec = (ts) => {
        if (!ts) return 0;
        if (ts.seconds) return ts.seconds;
        if (ts.toDate) return Math.floor(ts.toDate().getTime() / 1000);
        return Math.floor(new Date(ts).getTime() / 1000);
      };

      const entrada = sec(registroHoy.horaEntrada);
      const salidaAlmuerzo = sec(registroHoy.horaSalidaAlmuerzo);
      const entradaAlmuerzo = sec(registroHoy.horaEntradaAlmuerzo);
      const salida = registroHoy.horaSalida ? sec(registroHoy.horaSalida) : Math.floor(Date.now() / 1000);

      let totalSegundos = 0;

      if (salidaAlmuerzo) {
        totalSegundos += (salidaAlmuerzo - entrada);
        if (entradaAlmuerzo) {
          totalSegundos += (salida - entradaAlmuerzo);
        }
      } else {
        totalSegundos += (salida - entrada);
      }

      if (totalSegundos < 0) totalSegundos = 0;

      const horas = Math.floor(totalSegundos / 3600);
      const minutos = Math.floor((totalSegundos % 3600) / 60);
      setHorasTrabajadas(`${horas}h ${minutos}m`);
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [registroHoy]);

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
      const esValida = IPS_AUTORIZADAS.includes(data.ip);
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

    if (modalidadPermitida === "presencial" || modalidadPermitida === "presencial_sin_horario") {
      toast.loading("Validando conexión institucional...", { id: "val-ip" });
      const currentIp = await verificarRed();
      toast.dismiss("val-ip");

      if (!IPS_AUTORIZADAS.includes(currentIp)) {
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
      if ((modalidadPermitida === "presencial" || modalidadPermitida === "presencial_sin_horario") && !ubicacionFinal) {
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

      const ahora = new Date();
      const horaHHMM = ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

      const snap = await getDoc(ref);
      let dataExistente = snap.exists() ? snap.data() : null;

      let minutosDiferencia = 0;
      let extraData = {};
      const tieneHorario = !["presencial_sin_horario", "teletrabajo_sin_horario"].includes(modalidadPermitida);

      let horaProgramadaEntrada = dataExistente?.horaProgramadaEntrada || null;
      let horaProgramadaSalida = dataExistente?.horaProgramadaSalida || null;

      if (tieneHorario) {
        let horaEsperada = null;
        if (accion.id === "entrada") { horaEsperada = horarioHoy.entrada1 || horarioHoy.entrada; horaProgramadaEntrada = horaEsperada; }
        else if (accion.id === "salidaAlmuerzo") { horaEsperada = horarioHoy.salida1 || horarioHoy.salidaAlmuerzo; }
        else if (accion.id === "entradaAlmuerzo") { horaEsperada = horarioHoy.entrada2 || horarioHoy.entradaAlmuerzo; }
        else if (accion.id === "salida") { horaEsperada = horarioHoy.salida2 || horarioHoy.salida; horaProgramadaSalida = horaEsperada; }

        if (horaEsperada) {
          minutosDiferencia = diffMinutos(horaHHMM, horaEsperada);
          
          if ((accion.id === "salida" || accion.id === "salidaAlmuerzo") && minutosDiferencia > 0) {
            let extrasDiurnas = 0;
            let extrasNocturnas = 0;
            
            const [hE, mE] = horaEsperada.split(":").map(Number);
            let tiempoTemp = new Date();
            tiempoTemp.setHours(hE, mE, 0, 0);

            const [hR, mR] = horaHHMM.split(":").map(Number);
            let tiempoReal = new Date();
            tiempoReal.setHours(hR, mR, 0, 0);
            
            if (tiempoReal < tiempoTemp) tiempoReal.setDate(tiempoReal.getDate() + 1);

            while (tiempoTemp < tiempoReal) {
              const h = tiempoTemp.getHours();
              if (h >= 6 && h < 21) {
                extrasDiurnas++;
              } else {
                extrasNocturnas++;
              }
              tiempoTemp.setMinutes(tiempoTemp.getMinutes() + 1);
            }

            const prevExtras = dataExistente?.horasExtras || { solicitadasMinutos: 0, solicitadasDiurnas: 0, solicitadasNocturnas: 0 };
            extraData.horasExtras = {
              solicitadasMinutos: (prevExtras.solicitadasMinutos || 0) + extrasDiurnas + extrasNocturnas,
              solicitadasDiurnas: (prevExtras.solicitadasDiurnas || 0) + extrasDiurnas,
              solicitadasNocturnas: (prevExtras.solicitadasNocturnas || 0) + extrasNocturnas,
              estado: "pendiente",
              notas: ""
            };
          }
        }
      }

      const base = {
        usuarioId: user.uid,
        [accion.campo]: serverTimestamp(),
        [`${accion.id}DiferenciaMinutos`]: tieneHorario ? minutosDiferencia : 0,
        estadoActual: accion.estadoResultante,
        modoTrabajo: modalidadPermitida,
        modalidadAsignada: modalidadPermitida,
        horaProgramadaEntrada,
        horaProgramadaSalida,
        wifiValidado: wifiValido,
        gpsValidado: !!ubicacionFinal,
        ubicacion: (modalidadPermitida === "presencial" || modalidadPermitida === "presencial_sin_horario") ? ubicacionFinal : null,
        redInstitucional: esRedValida,
        ipPublica: ipParaRegistrar,
        actualizadoEn: serverTimestamp(),
        ...extraData
      };
      if (!snap.exists()) {
        await setDoc(ref, {
          fecha: hoy,
          usuarioId: user.uid,
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
      /*await registrarAuditoria({
        user,
        userData: userData || empleadoData,
        accion: `Registro: ${accion.label}`,
        documentoId: `${hoy}_${empleadoId}`,
        detalles: `Registro de ${accion.label} (Modo: ${modalidadPermitida}) validado por servidor.`
      });*/

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

  // ─── Certificado Laboral ───────────────────────────────────────────────────
  const solicitarCertificado = () => {
    const fechaIngreso = new Date(empleadoData?.fechaIngreso);
    const hoyDate = new Date();
    const diffDias = Math.floor((hoyDate - fechaIngreso) / (1000 * 60 * 60 * 24));

    if (diffDias < 30) {
      const faltan = 30 - diffDias;
      toast.error(`El certificado laboral estará disponible en ${faltan} día${faltan !== 1 ? 's' : ''}. Se requieren al menos 30 días laborando.`);
      return;
    }
    setShowRemuneracionModal(true);
  };

  const generarCertificadoLaboral = async (conRemuneracion) => {
    setGenerandoCert(true);
    toast.info("Generando certificado...");
    try {
      const element = document.getElementById("hidden-cert-empleado");
      if (!element) throw new Error("Template no encontrado");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const QRCode = (await import("qrcode")).default;

      element.style.display = "block";
      await new Promise(resolve => setTimeout(resolve, 600));

      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      element.style.display = "none";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const qrUrl = await QRCode.toDataURL(`${window.location.origin}/verificar?doc=${empleadoData?.codigoInstitucional}`);
      const qrSize = 35;
      const marginX = pdfWidth - qrSize - 20;
      const marginY = pdf.internal.pageSize.getHeight() - qrSize - 30;
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(marginX - 2, marginY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F');
      pdf.addImage(qrUrl, "PNG", marginX, marginY, qrSize, qrSize);

      pdf.save(`Certificado_Laboral_${empleadoData?.nombre?.replace(/\s+/g, "_")}.pdf`);
      toast.success("¡Certificado descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el certificado");
    } finally {
      setGenerandoCert(false);
    }
  };

  const solicitarAvalEducativo = () => {
    if (!empleadoData?.fechaIngreso) {
      toast.error("No se registra fecha de ingreso.");
      return;
    }
    const partes = empleadoData.fechaIngreso.split("-");
    const fIngreso = new Date(partes[0], partes[1] - 1, partes[2]);
    const fHoy = new Date();
    const diffMs = fHoy - fIngreso;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 30) {
      const faltan = 30 - diffDias;
      toast.error(`El Aval Educativo estará disponible en ${faltan} día${faltan !== 1 ? 's' : ''}. Se requieren al menos 30 días laborando.`);
      return;
    }
    generarAvalEducativo();
  };

  const generarAfiliacionIntegral = async () => {
    setGenerandoAfiliacion(true);
    toast.info("Generando Certificado Integral...");
    try {
      const element = document.getElementById("hidden-cert-integral");
      if (!element) throw new Error("Template no encontrado");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      element.style.display = "block";
      await new Promise(resolve => setTimeout(resolve, 600));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      element.style.display = "none";
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Afiliacion_Integral_${empleadoData?.nombre?.replace(/\s+/g, "_")}.pdf`);
      toast.success("¡Certificado descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el certificado");
    } finally {
      setGenerandoAfiliacion(false);
    }
  };

  const generarAvalEducativo = async () => {
    setGenerandoAval(true);
    toast.info("Generando Aval Educativo...");
    try {
      const element = document.getElementById("hidden-cert-aval");
      if (!element) throw new Error("Template no encontrado");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      element.style.display = "block";
      await new Promise(resolve => setTimeout(resolve, 600));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      element.style.display = "none";
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Aval_Educativo_${empleadoData?.nombre?.replace(/\s+/g, "_")}.pdf`);
      toast.success("¡Aval Educativo descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el aval");
    } finally {
      setGenerandoAval(false);
    }
  };

  const solicitarDesprendible = () => setShowDesprendibleModal(true);

  const generarDesprendiblePago = async () => {
    setGenerandoDesprendible(true);
    setShowDesprendibleModal(false);
    toast.info("Generando Desprendible...");
    try {
      const element = document.getElementById("hidden-cert-desprendible");
      if (!element) throw new Error("Template no encontrado");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      element.style.display = "block";
      await new Promise(resolve => setTimeout(resolve, 600));
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      element.style.display = "none";
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const nombreMes = meses[desprendibleMes];
      pdf.save(`Desprendible_Pago_Q${desprendibleQuincena}_${nombreMes}_${empleadoData?.nombre?.replace(/\s+/g, "_")}.pdf`);
      toast.success("¡Desprendible descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el desprendible");
    } finally {
      setGenerandoDesprendible(false);
    }
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
            {/* Estado actual y Horas trabajadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${estadoCfg.color}`}>
                <span className={`w-2 h-2 rounded-full ${estadoCfg.dot} animate-pulse`} />
                <EIcon className="h-4 w-4" />
                <span className="font-medium text-sm">{estadoCfg.label}</span>
              </div>

              {registroHoy?.horaEntrada && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-muted/30 text-foreground">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Tiempo laborado: <strong>{horasTrabajadas}</strong></span>
                </div>
              )}
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
                {registroHoy?.horaEntrada && <p>Entrada: <strong>{fmt(registroHoy.horaEntrada)}</strong></p>}
                {registroHoy?.horaSalida && <p>Salida: <strong>{fmt(registroHoy.horaSalida)}</strong></p>}
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
                  { label: "Horario Prog.", val: `${registroHoy.horaProgramadaEntrada || '—'} a ${registroHoy.horaProgramadaSalida || '—'}` },
                  {
                    label: "Entrada",
                    val: fmt(registroHoy.horaEntrada),
                    extra: registroHoy.entradaDiferenciaMinutos > 0
                      ? <span className="text-[10px] text-destructive font-bold">({fmtDiferencia(registroHoy.entradaDiferenciaMinutos)} tarde)</span>
                      : registroHoy.entradaDiferenciaMinutos < 0
                        ? <span className="text-[10px] text-success font-bold">({fmtDiferencia(registroHoy.entradaDiferenciaMinutos)} antes)</span>
                        : null
                  },
                  {
                    label: "Salida",
                    val: fmt(registroHoy.horaSalida),
                    extra: registroHoy.salidaDiferenciaMinutos < 0
                      ? <span className="text-[10px] text-destructive font-bold">({fmtDiferencia(registroHoy.salidaDiferenciaMinutos)} antes)</span>
                      : registroHoy.salidaDiferenciaMinutos > 0
                        ? <span className="text-[10px] text-success font-bold">({fmtDiferencia(registroHoy.salidaDiferenciaMinutos)} después)</span>
                        : null
                  },
                  { label: "Tiempo Laborado", val: horasTrabajadas },
                  { label: "IP Registro", val: registroHoy.ipPublica || "No reg." },
                  { label: "Red Inst.", val: registroHoy.redInstitucional ? "✅ Sí" : "❌ No" },
                ].map((item) => (
                  <div key={item.label} className="bg-muted/40 rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <div className="flex flex-col">
                      <p className="font-medium text-foreground truncate capitalize">{item.val}</p>
                      {item.extra}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botón Certificado Laboral */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Certificado Laboral</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Disponible después de 30 días laborando. Con o sin remuneración.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white"
                onClick={solicitarCertificado}
                disabled={generandoCert}
              >
                {generandoCert ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {empleadoData?.tipoVinculacion !== "Periodo de Prueba" && (
          <>
            {/* Botón Certificado Integral */}
            <Card className="border-primary/20 bg-primary/5 mt-4">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Certificado Afiliación Integral</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Muestra sus beneficios y afiliación a la fundación.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white"
                    onClick={generarAfiliacionIntegral}
                    disabled={generandoAfiliacion}
                  >
                    {generandoAfiliacion ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Botón Aval Educativo */}
            <Card className="border-primary/20 bg-primary/5 mt-4">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Aval Educativo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Disponible después de 30 días laborando.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white"
                    onClick={solicitarAvalEducativo}
                    disabled={generandoAval}
                  >
                    {generandoAval ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Botón Desprendible de Pago */}
            <Card className="border-primary/20 bg-primary/5 mt-4">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">Desprendibles de Pago</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Corte a 15 días (quincenal).
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white"
                    onClick={solicitarDesprendible}
                    disabled={generandoDesprendible}
                  >
                    {generandoDesprendible ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}


        <p className="text-center text-xs text-muted-foreground pb-4">
          Fundación Isla Cascajal · Sistema de Asistencia
        </p>
      </main>

      {/* DIALOG: ¿Con o sin remuneración? */}
      <Dialog open={showRemuneracionModal} onOpenChange={setShowRemuneracionModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Certificado Laboral
            </DialogTitle>
            <DialogDescription>
              ¿Desea que el certificado incluya su remuneración mensual?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <Button
              className="w-full"
              disabled={generandoCert}
              onClick={() => { setCertConRemuneracion(true); setShowRemuneracionModal(false); generarCertificadoLaboral(true); }}
            >
              {generandoCert ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Con Remuneración
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={generandoCert}
              onClick={() => { setCertConRemuneracion(false); setShowRemuneracionModal(false); generarCertificadoLaboral(false); }}
            >
              Sin Remuneración
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Desprendible de Pago */}
      <Dialog open={showDesprendibleModal} onOpenChange={setShowDesprendibleModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generar Desprendible
            </DialogTitle>
            <DialogDescription>
              Seleccione la quincena y el mes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Mes</label>
              <Select value={String(desprendibleMes)} onValueChange={(v) => setDesprendibleMes(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Mes..." /></SelectTrigger>
                <SelectContent>
                  {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Quincena</label>
              <Select value={desprendibleQuincena} onValueChange={setDesprendibleQuincena}>
                <SelectTrigger><SelectValue placeholder="Quincena..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ra Quincena (1 al 15)</SelectItem>
                  <SelectItem value="2">2da Quincena (16 al fin de mes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full mt-2"
              disabled={generandoDesprendible}
              onClick={generarDesprendiblePago}
            >
              {generandoDesprendible ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Descargar Desprendible
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TEMPLATE OCULTO: Certificado Laboral */}
      <div
        id="hidden-cert-empleado"
        style={{ display: "none", position: "fixed", left: "-9999px", top: 0, zIndex: -1,
          width: "800px", padding: "80px", background: "white",
          fontFamily: "Calibri, 'Times New Roman', serif", color: "#1a1a1a",
          lineHeight: "1.5", boxSizing: "border-box" }}
      >
        {/* Encabezado */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: "2px solid #05318a", paddingBottom: "15px" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "100px", height: "100px", borderRadius: "50%" }} />
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "900", margin: 0, color: "#05318a" }}>FUNDACIÓN ISLA CASCAJAL</h1>
            <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0, color: "#1a1a1a" }}>NIT: 900.248.351-0</p>
          </div>
        </div>

        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: "40px", marginTop: "30px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "900", margin: 0 }}>CERTIFICADO LABORAL</h2>
        </div>

        {/* Cuerpo */}
        <div style={{ fontSize: "14px", textAlign: "justify" }}>
          <p style={{ marginBottom: "15px" }}>
            El <strong>Área de Talento Humano</strong> de la <strong><em>FUNDACIÓN ISLA CASCAJAL “FICong”</em></strong>, identificada con NIT: 900.248.351-0, con domicilio principal en el Distrito de Santiago de Cali, certifica que:
          </p>
          <p style={{ fontSize: "20px", fontWeight: "900", textAlign: "center", margin: "25px 0", textTransform: "uppercase" }}>
            {empleadoData?.nombre}
          </p>
          <p style={{ marginBottom: "15px" }}>
            identificado(a) con cédula de ciudadanía Nº <strong>{empleadoData?.documento}</strong>, se encuentra vinculado(a) a nuestra institución bajo la modalidad de <strong>{empleadoData?.tipoContrato || empleadoData?.tipoVinculacion || "Contrato"}</strong>, desempeñándose en el cargo de <strong>{empleadoData?.cargo}</strong>, a partir del día <strong>{empleadoData?.fechaIngreso}</strong>, acumulando un tiempo activo de vinculación de <strong>{(() => {
              if (!empleadoData?.fechaIngreso) return "";
              let totalDays = 0;

              // Historial
              if (empleadoData.contratosAnteriores && Array.isArray(empleadoData.contratosAnteriores)) {
                empleadoData.contratosAnteriores.forEach(c => {
                  if (c.fechaIngreso && c.fechaTerminacion) {
                    const start = new Date(c.fechaIngreso);
                    start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
                    const end = new Date(c.fechaTerminacion);
                    end.setMinutes(end.getMinutes() + end.getTimezoneOffset());
                    const diffTime = Math.abs(end - start);
                    totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }
                });
              }

              // Contrato actual
              const inicio = new Date(empleadoData.fechaIngreso);
              inicio.setMinutes(inicio.getMinutes() + inicio.getTimezoneOffset());
              const fin = new Date();
              if (!isNaN(inicio)) {
                const diffTime = Math.abs(fin - inicio);
                totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              }

              if (totalDays === 0) return "0 días";

              let anios = Math.floor(totalDays / 365);
              let rem = totalDays % 365;
              let meses = Math.floor(rem / 30);
              let dias = rem % 30;

              let res = [];
              if (anios > 0) res.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
              if (meses > 0) res.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
              if (dias > 0) res.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
              if (res.length === 0) return "0 días";
              if (res.length > 1) { const ult = res.pop(); return res.join(", ") + " y " + ult; }
              return res[0];
            })()}</strong>.
          </p>
          {certConRemuneracion && (
            <p style={{ marginBottom: "15px", fontWeight: "bold" }}>
              REMUNERACIÓN MENSUAL: {empleadoData?.salario || "No especificado"}
            </p>
          )}
          <p style={{ marginBottom: "40px" }}>
            El presente certificado se expide a los {new Date().getDate().toString().padStart(2, '0')} días del mes de {new Date().toLocaleString('es-CO', { month: 'long' })} de {new Date().getFullYear()} en Santiago de Cali, a solicitud de la parte interesada.
          </p>
        </div>

        {/* Firma */}
        <div style={{ marginTop: "60px", textAlign: "center" }}>
          <img src="/firma.jpeg" alt="Firma" style={{ height: "60px", marginBottom: "5px" }} />
          <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px", fontStyle: "italic" }}>Dirección Administrativa</p>
          <p style={{ margin: 0, fontSize: "14px", fontStyle: "italic" }}>Fundación Isla Cascajal</p>
          <p style={{ margin: 0, fontSize: "10px", fontStyle: "italic", marginTop: "5px" }}>Documento electrónico verificable con el código QR.</p>
        </div>
      </div>

      {/* TEMPLATE OCULTO: Afiliación Integral */}
      <div
        id="hidden-cert-integral"
        style={{ display: "none", position: "fixed", left: "-9999px", top: 0, zIndex: -1,
          width: "800px", padding: "80px", background: "white",
          fontFamily: "'Times New Roman', serif", color: "#1a1a1a",
          lineHeight: "1.6", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: `2px solid #05318a`, paddingBottom: "15px" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "90px", height: "90px", borderRadius: "50%" }} />
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: "#05318a" }}>FUNDACIÓN ISLA CASCAJAL</h1>
            <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0, color: "#666", textTransform: "uppercase" }}>NIT: 900.248.351-0</p>
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", textDecoration: "underline", margin: 0 }}>CERTIFICADO DE AFILIACIÓN INTEGRAL</h2>
        </div>
        <div style={{ fontSize: "14px", textAlign: "justify" }}>
          <p>La presente organización de base denominada FUNDACIÓN ISLA CASCAJAL “FICong”, identificada con NIT: 900.248.351-0, con domicilio principal en el Distrito de Santiago de Cali, República de Colombia, se permite presentar a <strong>{empleadoData?.nombre}</strong> con NUIP. <strong>{empleadoData?.documento}</strong>, bajo el código institucional <strong>{empleadoData?.codigoInstitucional}</strong> y le permite acceder a los descuentos que otorgan nuestros convenios interinstitucionales.</p>
          <p>Esta membresía tiene validez y cobertura para los convenios Nacionales e Internacionales y le permite acceder a los programas, actividades y procesos establecidos por la Fundación Isla Cascajal, así pues; después de corroborar que se asumirán los compromisos sociales y morales por parte del titular de este documento, se procede a reconocer su AFILIACIÓN ACTIVA y se le solicita a la organización receptora de este documento, que, de acuerdo al convenio interinstitucional firmado por las partes, se avance en el otorgamiento de los correspondientes descuentos especiales tanto al titular de la membresía como a sus beneficiarios y mascotas hasta las 11:59 p.m. del día {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}.</p>
        </div>
        {empleadoData?.beneficiarios?.length > 0 && (
          <div style={{ marginTop: "15px", border: "1px solid #000", padding: "8px", paddingBottom: "10px" }}>
            <p style={{ color: "#0070C0", margin: 0, marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}>BENEFICIARIOS:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {empleadoData.beneficiarios.map((b, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", paddingRight: "20px" }}>
                  <span>{b.nombre}</span><span>NUIP: {b.nuip || "Sin registro"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {empleadoData?.mascotas?.length > 0 && (
          <div style={{ marginTop: "10px", border: "1px solid #000", padding: "8px", paddingBottom: "10px" }}>
            <p style={{ color: "#0070C0", margin: 0, marginBottom: "8px", fontSize: "12px", fontWeight: "bold" }}>MASCOTAS (PLAN INTEGRAL):</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {empleadoData.mascotas.map((m, i) => (
                <div key={i} style={{ fontSize: "11px" }}>{m.nombre} ({m.tipo}{m.raza ? ` - ${m.raza}` : ''})</div>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: "20px", paddingBottom: "10px" }}>
          <p style={{ margin: 0, fontSize: "12px", marginBottom: "20px" }}>El presente documento se expide a los {new Date().getDate().toString().padStart(2, '0')} días del mes de {new Date().toLocaleString('es-CO', { month: 'long' })} de {new Date().getFullYear()} en Santiago de Cali.</p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
            <img src="/firma.jpeg" alt="Firma" style={{ height: "60px", marginBottom: "5px" }} />
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Diana C. Rojas V.</p>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Directora Administrativa</p>
            <p style={{ margin: 0, fontSize: "12px", fontStyle: "italic" }}>Fundación Isla Cascajal</p>
            <p style={{ margin: 0, fontSize: "10px", fontStyle: "italic" }}>Documento electrónico verificable con el código QR.</p>
          </div>
        </div>
      </div>

      {/* TEMPLATE OCULTO: Aval Educativo */}
      <div
        id="hidden-cert-aval"
        style={{ display: "none", position: "fixed", left: "-9999px", top: 0, zIndex: -1,
          width: "800px", padding: "80px", background: "white",
          fontFamily: "'Times New Roman', serif", color: "#1a1a1a",
          lineHeight: "1.5", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: `2px solid #05318a`, paddingBottom: "15px" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "100px", height: "100px", borderRadius: "50%" }} />
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "900", margin: 0, color: "#05318a", letterSpacing: "1px" }}>FUNDACIÓN ISLA CASCAJAL</h1>
            <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0, color: "#1a1a1a" }}>NIT: 900.248.351-0</p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "40px", marginTop: "50px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "900", margin: 0 }}>CERTIFICADO DE AVAL EDUCATIVO</h2>
        </div>

        <div style={{ fontSize: "14px", textAlign: "justify" }}>
          <p style={{ marginBottom: "15px" }}>
            La presente organización de base denominada <strong><em>FUNDACIÓN ISLA CASCAJAL “FICong”</em></strong>, identificada con NIT: 900.248.351-0, con domicilio principal en el Distrito de Santiago de Cali, República de Colombia, se permite presentar a <strong>{empleadoData?.nombre?.toUpperCase()}</strong> con NUIP. <strong>{empleadoData?.documento}</strong>, quien cuenta con registro oficial en nuestra base de datos institucional y con membresía activa para acceder a nuestros convenios educativos.
          </p>
          <p style={{ marginBottom: "15px" }}>
            Esta membresía fue realizada el día <strong>{empleadoData?.fechaIngreso ? new Date(empleadoData.fechaIngreso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" }) : ""}</strong> a las <strong>{new Date().toLocaleTimeString("es-CO", { hour: '2-digit', minute: '2-digit' })}</strong>, bajo el código institucional <strong>{empleadoData?.codigoInstitucional}</strong> y tiene validez y cobertura para los convenios Nacionales e Internacionales y le permite acceder a los programas, actividades y procesos académicos establecidos y ofertados por los aliados estratégicos de la Fundación Isla Cascajal y por ella misma.
          </p>
          <p style={{ marginBottom: "15px" }}>
            Después de corroborar que se asumirán los compromisos académicos, sociales y morales por parte del titular de este documento, se procede a conceder <strong>AVAL</strong> y se le solicita a la institución educativa receptora de este documento, que, de acuerdo al convenio interinstitucional firmado por las partes, se avance en el otorgamiento de los correspondientes descuentos para programas académicos y demás servicios educativos.
          </p>
          <p style={{ marginBottom: "40px" }}>
            El presente documento se expide a los {new Date().getDate().toString().padStart(2, '0')} días del mes de {new Date().toLocaleString('es-CO', { month: 'long' })} de {new Date().getFullYear()} en Santiago de Cali por interés del solicitante.
          </p>
        </div>

        <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ textAlign: "center" }}>
            <img src="/firma.jpeg" alt="Firma" style={{ height: "60px", marginBottom: "5px" }} />
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px", fontStyle: "italic" }}>Dirección Administrativa</p>
            <p style={{ margin: 0, fontSize: "14px", fontStyle: "italic" }}>Fundación Isla Cascajal</p>
            <p style={{ margin: 0, fontSize: "10px", fontStyle: "italic", marginTop: "5px" }}>Documento electrónico verificable con el código QR.</p>
          </div>
        </div>
      </div>

      {/* TEMPLATE OCULTO: Desprendible de Pago */}
      <div
        id="hidden-cert-desprendible"
        style={{ display: "none", position: "fixed", left: "-9999px", top: 0, zIndex: -1,
          width: "800px", padding: "60px", background: "white",
          fontFamily: "Calibri, 'Times New Roman', serif", color: "#1a1a1a",
          lineHeight: "1.5", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #05318a", paddingBottom: "15px" }}>
          <img src="/logo.png" alt="Logo" style={{ width: "80px", height: "80px", borderRadius: "50%" }} />
          <div style={{ textAlign: "right" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: "#05318a" }}>FUNDACIÓN ISLA CASCAJAL</h1>
            <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0, color: "#1a1a1a" }}>NIT: 900.248.351-0</p>
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>DESPRENDIBLE DE PAGO DE NÓMINA</h2>
          <p style={{ fontSize: "14px", margin: "5px 0 0 0" }}>
            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][desprendibleMes]} de {new Date().getFullYear()} - Quincena {desprendibleQuincena}
          </p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><strong>Empleado:</strong> {empleadoData?.nombre}</div>
            <div><strong>Documento:</strong> {empleadoData?.documento}</div>
            <div><strong>Cargo:</strong> {empleadoData?.cargo}</div>
            <div><strong>Tipo de Contrato:</strong> {empleadoData?.tipoContrato || empleadoData?.tipoVinculacion}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: "30px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Concepto</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "10px" }}>Remuneración Mensual ({desprendibleQuincena === "1" ? "1-15" : "16-Fin"}) (50%)</td>
              <td style={{ padding: "10px", textAlign: "right" }}>
                {(() => {
                  const s = parseFloat((empleadoData?.salario || "").replace(/[^0-9]/g, "")) || 0;
                  return s > 0 ? "$ " + (s / 2).toLocaleString("es-CO") : "No especificado";
                })()}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th style={{ padding: "10px", textAlign: "left", fontSize: "16px" }}>NETO A PAGAR</th>
              <th style={{ padding: "10px", textAlign: "right", fontSize: "16px", color: "#05318a" }}>
                {(() => {
                  const s = parseFloat((empleadoData?.salario || "").replace(/[^0-9]/g, "")) || 0;
                  return s > 0 ? "$ " + (s / 2).toLocaleString("es-CO") : "No especificado";
                })()}
              </th>
            </tr>
          </tfoot>
        </table>
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <img src="/firma.jpeg" alt="Firma" style={{ height: "50px", marginBottom: "5px" }} />
          <div style={{ width: "200px", margin: "0 auto", borderTop: "1px solid #1a1a1a", paddingTop: "5px" }}>
            <p style={{ margin: 0, fontWeight: "bold", fontSize: "12px" }}>Diana C. Rojas V.</p>
            <p style={{ margin: 0, fontSize: "12px" }}>Directora Administrativa</p>
          </div>
        </div>
      </div>
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
