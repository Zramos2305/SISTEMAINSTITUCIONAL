"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/protected-route";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useEmpleados, DIAS_SEMANA, MODALIDADES, calcularResumenHorario, HORARIO_DEFAULT, HORARIO_DEFAULT_CONFIANZA, normalizarHorario } from "@/hooks/use-empleados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Users, UserPlus, RefreshCcw, LogOut, ArrowLeft, Mail, Lock, User, Briefcase, CalendarDays,
  Monitor, Home, CheckCircle2, Eye, EyeOff, Search, MapPin, Phone, Building, QrCode, FileText, Trash2, PowerOff, Power, PawPrint, Pencil, AlertCircle, HelpCircle, ShieldCheck,
  FileSpreadsheet, Download, GraduationCap, HeartPulse, ShieldAlert, HeartHandshake, Globe, Map, Droplets, Calendar, Plus, X, Heart, Award, Info
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { crearUsuarioInstitucional, reingresarUsuarioInstitucional, eliminarUsuarioInstitucional } from "@/app/actions/usuarios";
import { registrarAuditoria } from "@/lib/auditoria";
import { exportarAExcel } from "@/lib/export-excel";

import QRCode from "qrcode";

const COLORS = {
  azul: "#05318a",
  verde: "#0e6235",
  amarillo: "#f3de4d",
  rojo: "#ce181b"
};

const PAISES_PERSONAL = [
  "Colombia", "Venezuela", "Ecuador", "Perú", "Chile", "Argentina", "Brasil", "Panamá", "México", "Estados Unidos", "España", "Otro"
];

const DEPARTAMENTOS_COLOMBIA_PERSONAL = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"
];

const SEDES_INSTITUCIONALES = [
  "Sede Principal",
  "Subdirección Regional Pacífico Norte",
  "Subdirección Regional Pacífico Sur",
  "Subdirección Regional Eje Cafetero",
  "Subdirección Regional Sur Central",
  "Subdirección Regional Nor Caribe",
  "Subdirección Regional Sur Caribe",
  "Subdirección Regional Nor Oriente",
  "Subdirección Regional Sur Oriente"
];

const TIPOS_PERSONAL = [
  "Empleado", "Practicante", "Contratista", "Administrativo", "Coordinador", "Directivo", "Otro"
];

const ETNIAS = [
  "Afrodiaspórico (Negro)", "Afrodiaspórico (Afro)", "Afrodiaspórico (Palenquero)", "Afrodiaspórico (Raizal)",
  "Originario (Indígena)", "Mestizo", "ROM", "Caucásico (Blanco)"
];

const TIPOS_VICTIMA = [
  "Desplazamiento", "Homicidio", "Amenazas", "Desaparición forzosa", "Pérdida de bienes",
  "Atentados", "Secuestros", "Delitos contra la libertad sexual", "Daños por explosivos",
  "Abandono o expulsión de tierras", "Torturas", "Reclutamiento de NNA"
];

const TIPOS_DISCRIMINACION = [
  "Raza", "Por país de origen", "Por lugar de nacimiento", "Lugar de origen/procedencia/destino",
  "Por género", "Por religión", "Por discapacidad", "Por identidad cultural", "Por identidad ideológica",
  "Por situación socioeconómica", "Por nivel académico", "Por edad", "Por situación de salud",
  "Por condición familiar", "Por aspecto físico"
];

const NIVELES_EDUCATIVOS = [
  "Ninguno", "Primaria", "Bachiller", "Técnico", "Tecnólogo", "Pregrado (Universitario)",
  "Especialización o posgrado", "Maestría", "Doctorado", "Posdoctorado"
];

const TIPOS_DISCAPACIDAD = [
  "Múltiple", "Auditiva", "Visual", "Física", "Intelectual", "Psicosocial", "Del habla", "Otro"
];

const TIPOS_TRASTORNO = [
  "Dislexia", "Autismo", "De la percepción visual", "De la memoria", "Otro"
];

function PersonalContent() {
  const { user, userData, logout } = useAuth();
  const esSuperAdmin = userData?.rol === "superadmin";
  const esRRHH = userData?.rol === "recursos_humanos";

  const [usuarios, setUsuarios] = useState([]);
  const { empleados: personalList, isLoading: cargandoPersonal, recargar: recargarPersonal, actualizarModalidad } = useEmpleados();
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

  // Vistas: 'table', 'create', 'success'
  const [view, setView] = useState("table");

  // Estados para Creación y Edición
  const [formData, setFormData] = useState({
    nombres: "",
    primerApellido: "",
    segundoApellido: "",
    nombre: "",
    documento: "",
    correo: "",
    telefono: "",
    direccion: "",
    rh: "",
    cargo: "",
    tipoPersonal: "Empleado",
    fechaIngreso: new Date().toISOString().split("T")[0],
    estado: "activo",
    rol: "empleado",
    password: "",
    modalidadLaboral: "Presencial",
    diasTeletrabajo: "",
    afiliarAutomaticamente: false,
    beneficiarios: [],
    mascotas: [],
    foto: null,
    horarioModalidad: HORARIO_DEFAULT,
    memorandos: [],
    // Nuevos campos institucionales
    oficinaContrata: "",
    dependenciaSolicita: "",
    paisAsignacion: "Colombia",
    otroPaisAsignacion: "",
    departamentoAsignacion: "Valle del Cauca",
    ciudadAsignacion: "",
    correoPersonal: "",
    // Remuneración desglosada
    valorDiaTrabajo: "",
    horasSemanales: "",
    auxilioTransporte: "",
    salario: "",
    tipoVinculacion: "",
    tienePeriodoPrueba: false,
    tiempoPeriodoPrueba: "",
    tipoContrato: "",
    tiempoContrato: "",
    fechaTerminacion: "",
    motivoTerminacion: "",
    // Nuevos Afiliaciones / Seguridad Social
    eps: "",
    fondoPension: "",
    cesantias: "",
    cajaCompensacion: "",
    arl: "POSITIVA ARL",
    // Datos Demográficos de Afiliación
    fechaNacimiento: "",
    paisNacimiento: "Colombia",
    otroPaisNacimiento: "",
    lugarNacimiento: "",
    edad: "",
    sexo: "",
    orientacionSexual: "",
    orientacionOtro: "",
    estrato: "",
    etnia: "",
    sisben: "",
    sisbenPuntaje: "",
    asesoriaSisben: "",
    victimaConflicto: "",
    victimaTipo: "",
    victimaInscrito: "",
    discriminacion: "",
    discriminacionTipo: "",
    educacionNivel: "",
    educacionEstudio: "",
    educacionSemestre: "",
    educacionPlantel: "",
    enfermedad: "",
    enfermedadCual: "",
    alergia: "",
    alergiaCual: "",
    discapacidad: "",
    discapacidadTipo: "",
    discapacidadOtro: "",
    trastorno: "",
    trastornoTipo: "",
    trastornoOtro: "",
    condicionEspecial: "",
    condicionEspecialCual: "",
    deseaSerVoluntario: "",
    emergenciaNombre: "",
    emergenciaNumero: "",
    emergenciaWhatsapp: "",
    emergenciaDireccion: "",
  });
  const [fotoPreview, setFotoPreview] = useState(null);
  const [creando, setCreando] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [permitirModificarNiup, setPermitirModificarNiup] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [personalReciente, setPersonalReciente] = useState(null);
  const [qrPersonal, setQrPersonal] = useState(null);
  const [fechaCertificado, setFechaCertificado] = useState("");
  const [showRemuneracionModal, setShowRemuneracionModal] = useState(false);
  const [personaCertPendiente, setPersonaCertPendiente] = useState(null);
  const [empleadoExpediente, setEmpleadoExpediente] = useState(null);

  // Estados Table
  const [searchQuery, setSearchQuery] = useState("");
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [horarioEdit, setHorarioEdit] = useState({});
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [confirmDuplicado, setConfirmDuplicado] = useState(false);

  const handleBirthDateChange = (val) => {
    let calcAge = "";
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      calcAge = age >= 0 ? `${age} Años` : "";
    }
    setFormData((prev) => ({
      ...prev,
      fechaNacimiento: val,
      edad: calcAge,
    }));
  };

  const cargarDatos = async () => {
    setCargandoUsuarios(true);
    try {
      const usersSnap = await getDocs(collection(db, "usuarios"));
      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsuarios(usersList);
      await recargarPersonal();
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los datos");
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!formData.fechaIngreso || !formData.tipoVinculacion) return;
    
    if (formData.tipoContrato === "Contrato a Término Indefinido") {
      if (formData.fechaTerminacion !== "") {
        setFormData(prev => ({ ...prev, fechaTerminacion: "" }));
      }
      return;
    }

    const start = new Date(formData.fechaIngreso);
    // ensure the timezone isn't off by adding the timezone offset so it acts as local
    start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
    
    if (isNaN(start)) return;

    if (formData.tipoVinculacion === "Periodo de Prueba") {
      const days = parseInt(formData.tiempoPeriodoPrueba);
      if (!isNaN(days) && days > 0) {
        start.setDate(start.getDate() + days);
        const endStr = start.toISOString().split("T")[0];
        if (formData.fechaTerminacion !== endStr) {
          setFormData(prev => ({ ...prev, fechaTerminacion: endStr }));
        }
      }
    } else if (formData.tipoVinculacion === "Contrato" || formData.tipoVinculacion === "Nombramiento") {
      const months = parseInt(formData.tiempoContrato);
      if (!isNaN(months) && months > 0) {
        start.setMonth(start.getMonth() + months);
        const endStr = start.toISOString().split("T")[0];
        if (formData.fechaTerminacion !== endStr) {
          setFormData(prev => ({ ...prev, fechaTerminacion: endStr }));
        }
      }
    }
  }, [formData.fechaIngreso, formData.tiempoContrato, formData.tiempoPeriodoPrueba, formData.tipoVinculacion, formData.tipoContrato]);

  const removerTildes = (str) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  useEffect(() => {
    if (view === "create" && !isEditing && formData.nombres && formData.primerApellido) {
      const generarCorreoAsync = async () => {
        const primerNombre = removerTildes(formData.nombres.trim().split(" ")[0].toLowerCase());
        const primerApe = removerTildes(formData.primerApellido.trim().split(" ")[0].toLowerCase());

        if (!primerNombre || !primerApe) return;

        const baseCorreo = `${primerNombre}.${primerApe}`;
        let correoSugerido = `${baseCorreo}@islacascajal.org`;

        try {
          const qBase = query(collection(db, "usuarios"), where("correo", ">=", baseCorreo), where("correo", "<=", baseCorreo + "\uf8ff"));
          const snapshot = await getDocs(qBase);

          if (!snapshot.empty) {
            const correosExistentes = snapshot.docs.map(doc => doc.data().correo);
            if (correosExistentes.includes(correoSugerido)) {
              let contador = 0;
              while (correosExistentes.includes(`${baseCorreo}${contador.toString().padStart(2, '0')}@islacascajal.org`)) {
                contador++;
              }
              correoSugerido = `${baseCorreo}${contador.toString().padStart(2, '0')}@islacascajal.org`;
            }
          }

          setFormData(prev => ({ ...prev, correo: correoSugerido }));
        } catch (error) {
          console.error("Error al generar correo automático:", error);
        }
      };

      const timeoutId = setTimeout(() => {
        generarCorreoAsync();
      }, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.nombres, formData.primerApellido, view, isEditing]);

  const comprimirImagen = (base64Str, quality = 0.7, maxWidth = 500) => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
    });
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La foto es demasiado pesada (máx 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalBase64 = reader.result;
          const compressedBase64 = await comprimirImagen(originalBase64);
          setFotoPreview(compressedBase64);
          setFormData(prev => ({ ...prev, foto: compressedBase64 }));
        } catch (err) {
          console.error("Error al comprimir imagen:", err);
          toast.error("Error al procesar la imagen");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBeneficiarioChange = (index, field, value) => {
    const newBeneficiarios = [...(formData.beneficiarios || [])];
    if (field === "nuip") {
      const numbersOnly = value.replace(/\D/g, "");
      value = numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    newBeneficiarios[index][field] = value;
    setFormData(prev => ({ ...prev, beneficiarios: newBeneficiarios }));
  };

  const handleTimeChange = (dia, field, value) => {
    let updates = { [field]: value };
    if (field === 'entrada1' && value) {
      const [h, m] = value.split(':');
      let outH = (parseInt(h) + 4) % 24;
      updates['salida1'] = `${String(outH).padStart(2, '0')}:${m}`;
    }
    if (field === 'entrada2' && value) {
      const [h, m] = value.split(':');
      let outH = (parseInt(h) + 4) % 24;
      updates['salida2'] = `${String(outH).padStart(2, '0')}:${m}`;
    }
    setFormData({
      ...formData,
      horarioModalidad: {
        ...formData.horarioModalidad,
        [dia]: { ...formData.horarioModalidad[dia], ...updates }
      }
    });
  };

  const handleMascotaChange = (index, field, value) => {
    const newMascotas = [...(formData.mascotas || [])];
    newMascotas[index][field] = value;
    setFormData(prev => ({ ...prev, mascotas: newMascotas }));
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!formData.correo || !formData.password || !formData.nombre || !formData.rol || !formData.documento) {
      toast.error("Faltan campos obligatorios");
      return;
    }

    if (formData.password.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    // Verificar si ya existe un empleado con esa cédula
    let empleadoExistente = null;
    let esReingreso = false;

    if (!confirmDuplicado) {
      try {
        const docNumeroLimpio = formData.documento.replace(/\./g, "");
        const q = query(collection(db, "empleados"), where("documento", "in", [formData.documento, docNumeroLimpio]));
        const snap = await getDocs(q);
        if (!snap.empty) {
          empleadoExistente = { id: snap.docs[0].id, ...snap.docs[0].data() };
          
          if (empleadoExistente.estado === "inactivo" || empleadoExistente.estado === "Inactivo") {
            const confirmar = window.confirm(
              `⚠️ El usuario ${empleadoExistente.nombre} ya existe y está INACTIVO.\n\n¿Deseas RE-INGRESARLO? Esto guardará su contrato anterior en el historial y creará uno nuevo conservando su membresía y accesos.`
            );
            if (!confirmar) return;
            esReingreso = true;
          } else {
            const confirmar = window.confirm(
              `⚠️ Ya existe un empleado ACTIVO con este número de cédula:\n\n👤 ${empleadoExistente.nombre}\n📋 Documento: ${empleadoExistente.documento}\n\n¿Deseas continuar de todas formas con el registro creando un duplicado?`
            );
            if (!confirmar) return;
            setConfirmDuplicado(true);
          }
        }
      } catch (err) {
        console.warn("No se pudo verificar duplicado:", err);
      }
    }

    setCreando(true);
    try {
      const codigoG = esReingreso ? empleadoExistente.codigoInstitucional : ("FIC-" + Math.random().toString(36).substr(2, 6).toUpperCase());

      const beneficiariosValidos = formData.afiliarAutomaticamente ? (formData.beneficiarios || []).filter(b => b.nombre.trim() !== "") : [];
      const mascotasValidas = formData.afiliarAutomaticamente ? (formData.mascotas || []).filter(m => m.nombre.trim() !== "") : [];

      const payload = {
        ...formData,
        beneficiarios: beneficiariosValidos,
        mascotas: mascotasValidas,
        codigoInstitucional: codigoG,
        creadoPorUid: user.uid
      };

      let result;
      if (esReingreso) {
        result = await reingresarUsuarioInstitucional(empleadoExistente, payload);
      } else {
        result = await crearUsuarioInstitucional(payload);
      }

      if (result.success) {
        await registrarAuditoria({
          user,
          userData,
          accion: "Crear Personal",
          documentoId: result.personalId || formData.correo,
          detalles: `Se registró personal ${formData.nombre} (${formData.tipoPersonal}).`
        });

        setPersonalReciente({
          ...payload,
          id: result.personalId,
          uid: result.uid
        });

        toast.success("Personal registrado correctamente");
        setView("success");
        cargarDatos();
      } else {
        toast.error(result.error || "Error al crear el usuario");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error inesperado");
    } finally {
      setCreando(false);
      setConfirmDuplicado(false);
    }
  };

  const handleToggleEstado = async (empleadoId, uId, estadoActual) => {
    const nuevoEstado = estadoActual === "activo" ? "inactivo" : "activo";
    const accion = nuevoEstado === "activo" ? "habilitar" : "inhabilitar";
    const confirmar = window.confirm(
      `¿Deseas ${accion} a este empleado? ${nuevoEstado === "inactivo" ? "No podrá acceder al sistema." : "Podrá volver a acceder al sistema."}`
    );
    if (!confirmar) return;

    try {
      const nuevoActivo = nuevoEstado === "activo";
      if (uId) await updateDoc(doc(db, "usuarios", uId), { activo: nuevoActivo, estado: nuevoEstado });

      if (empleadoId) {
        await updateDoc(doc(db, "empleados", empleadoId), { estado: nuevoEstado });

        // Sincronizar estado con afiliación institucional
        const q = query(collection(db, "afiliados"), where("personalId", "==", empleadoId));
        const snap = await getDocs(q);
        const promesas = snap.docs.map(async (d) => {
          await updateDoc(doc(db, "afiliados", d.id), { estado: nuevoEstado });
        });
        await Promise.all(promesas);
      }

      toast.success(`Empleado ${nuevoEstado === "activo" ? "habilitado" : "inhabilitado"} correctamente`);
      cargarDatos();
    } catch (error) {
      console.error(error);
      toast.error("Error al cambiar el estado del empleado");
    }
  };

  const abrirEdicion = (usuarioObj, personalObj) => {
    const target = personalObj && !personalObj.isMock ? personalObj : usuarioObj;

    const parts = (target.nombre || "").trim().split(/\s+/);
    let n = "", p1 = "", p2 = "";
    if (parts.length >= 3) {
      p2 = parts.pop();
      p1 = parts.pop();
      n = parts.join(" ");
    } else if (parts.length === 2) {
      p1 = parts[1];
      n = parts[0];
    } else {
      n = parts[0] || "";
    }

    setFormData({
      nombres: n,
      primerApellido: p1,
      segundoApellido: p2,
      nombre: target.nombre || "",
      documento: target.documento || "",
      correo: target.correo || "",
      telefono: target.telefono || "",
      direccion: target.direccion || "",
      rh: target.rh || "",
      cargo: target.cargo || "",
      tipoPersonal: target.tipoPersonal || "Empleado",
      fechaIngreso: target.fechaIngreso || new Date().toISOString().split("T")[0],
      tipoVinculacion: target.tipoVinculacion || "",
      tienePeriodoPrueba: target.tienePeriodoPrueba || false,
      tiempoPeriodoPrueba: target.tiempoPeriodoPrueba || "",
      tipoContrato: target.tipoContrato || "",
      tiempoContrato: target.tiempoContrato || "",
      fechaTerminacion: target.fechaTerminacion || "",
      motivoTerminacion: target.motivoTerminacion || "",
      salario: target.salario || "",
      estado: target.estado || "activo",
      rol: usuarioObj.rol || "empleado",
      password: "",
      modalidadLaboral: target.modalidadLaboral || "Presencial",
      diasTeletrabajo: target.diasTeletrabajo || "",
      afiliarAutomaticamente: !!target.afiliarAutomaticamente,
      beneficiarios: Array.isArray(target.beneficiarios) && target.beneficiarios.length > 0 ? target.beneficiarios : Array.from({ length: 5 }, () => ({ nombre: "", nuip: "" })),
      mascotas: Array.isArray(target.mascotas) && target.mascotas.length > 0 ? target.mascotas : Array.from({ length: 2 }, () => ({ nombre: "", tipo: "", raza: "" })),
      foto: target.foto || null,
      horarioModalidad: normalizarHorario(target.horarioModalidad || HORARIO_DEFAULT),
      memorandos: Array.isArray(target.memorandos) ? target.memorandos : [],
      // Campos de asignación institucional
      oficinaContrata: target.oficinaContrata || "",
      dependenciaSolicita: target.dependenciaSolicita || "",
      paisAsignacion: target.paisAsignacion || "Colombia",
      otroPaisAsignacion: "",
      departamentoAsignacion: target.departamentoAsignacion || "Valle del Cauca",
      ciudadAsignacion: target.ciudadAsignacion || "",
      correoPersonal: target.correoPersonal || "",
      // Remuneración desglosada
      valorDiaTrabajo: target.valorDiaTrabajo || "",
      horasSemanales: target.horasSemanales || "",
      auxilioTransporte: target.auxilioTransporte || "",
      // Afiliaciones / Seguridad Social
      eps: target.eps || "",
      fondoPension: target.fondoPension || "",
      cesantias: target.cesantias || "",
      cajaCompensacion: target.cajaCompensacion || "",
      arl: target.arl || "POSITIVA ARL",
      // Datos Demográficos
      fechaNacimiento: target.fechaNacimiento || "",
      paisNacimiento: target.paisNacimiento || "Colombia",
      otroPaisNacimiento: target.otroPaisNacimiento || "",
      lugarNacimiento: target.lugarNacimiento || "",
      edad: target.edad || "",
      sexo: target.sexo || "",
      orientacionSexual: target.orientacionSexual || "",
      orientacionOtro: target.orientacionOtro || "",
      estrato: target.estrato || "",
      etnia: target.etnia || "",
      sisben: target.sisben || "",
      sisbenPuntaje: target.sisbenPuntaje || "",
      asesoriaSisben: target.asesoriaSisben || "",
      victimaConflicto: target.victimaConflicto || "",
      victimaTipo: target.victimaTipo || "",
      victimaInscrito: target.victimaInscrito || "",
      discriminacion: target.discriminacion || "",
      discriminacionTipo: target.discriminacionTipo || "",
      educacionNivel: target.educacionNivel || "",
      educacionEstudio: target.educacionEstudio || "",
      educacionSemestre: target.educacionSemestre || "",
      educacionPlantel: target.educacionPlantel || "",
      enfermedad: target.enfermedad || "",
      enfermedadCual: target.enfermedadCual || "",
      alergia: target.alergia || "",
      alergiaCual: target.alergiaCual || "",
      discapacidad: target.discapacidad || "",
      discapacidadTipo: target.discapacidadTipo || "",
      discapacidadOtro: target.discapacidadOtro || "",
      trastorno: target.trastorno || "",
      trastornoTipo: target.trastornoTipo || "",
      trastornoOtro: target.trastornoOtro || "",
      condicionEspecial: target.condicionEspecial || "",
      condicionEspecialCual: target.condicionEspecialCual || "",
      deseaSerVoluntario: target.deseaSerVoluntario || "",
      emergenciaNombre: target.emergenciaNombre || "",
      emergenciaNumero: target.emergenciaNumero || "",
      emergenciaWhatsapp: target.emergenciaWhatsapp || "",
      emergenciaDireccion: target.emergenciaDireccion || "",
    });
    setFotoPreview(target.foto || null);
    setIsEditing(true);
    setPermitirModificarNiup(false);
    setEditId({ uId: usuarioObj.id, empleadoId: target.id || null });
    setView("create");
  };

  const handleNameChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      next.nombre = `${next.nombres} ${next.primerApellido} ${next.segundoApellido || ''}`.trim().replace(/\s+/g, ' ');
      return next;
    });
  };

  useEffect(() => {
    if (isEditing) return;

    const generateEmail = async () => {
      const { nombres, primerApellido } = formData;
      if (nombres && primerApellido) {
        const primerNombre = nombres.trim().split(/\s+/)[0].toLowerCase();
        const apellido1 = primerApellido.trim().toLowerCase().replace(/\s+/g, '');

        // Limpiar acentos y caracteres especiales
        const cleanName = primerNombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
        const cleanLast = apellido1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

        if (!cleanName || !cleanLast) return;

        const baseEmail = `${cleanName}.${cleanLast}@islacascajal.org`;

        let finalEmail = baseEmail;
        let counter = 0;

        while (true) {
          const q = query(collection(db, "usuarios"), where("correo", "==", finalEmail));
          const snap = await getDocs(q);
          if (snap.empty) {
            break;
          }
          const counterStr = counter.toString().padStart(2, '0');
          finalEmail = `${cleanName}.${cleanLast}${counterStr}@islacascajal.org`;
          counter++;
        }

        setFormData(prev => {
          // Solo actualizamos si realmente cambió para evitar ciclos de renderizado
          if (prev.correo !== finalEmail) {
            return { ...prev, correo: finalEmail };
          }
          return prev;
        });
      }
    };

    const timeoutId = setTimeout(generateEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.nombres, formData.primerApellido, isEditing]);

  const handleDocumentChange = (e) => {
    const numbersOnly = e.target.value.replace(/\D/g, "");
    const finalValue = numbersOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setFormData(prev => ({
      ...prev,
      documento: finalValue,
      password: isEditing ? prev.password : numbersOnly
    }));
  };

  const handleEditarUsuario = async (e) => {
    e.preventDefault();
    setCreando(true);
    try {
      if (editId.uId) {
        await updateDoc(doc(db, "usuarios", editId.uId), {
          nombre: formData.nombre,
          correo: formData.correo,
          rol: formData.rol,
        });
      }
      if (editId.empleadoId) {
        const beneficiariosValidos = formData.afiliarAutomaticamente ? (formData.beneficiarios || []).filter(b => b.nombre.trim() !== "") : [];
        const mascotasValidas = formData.afiliarAutomaticamente ? (formData.mascotas || []).filter(m => m.nombre.trim() !== "") : [];

        const updateData = {
          nombre: formData.nombre,
          documento: formData.documento,
          correo: formData.correo,
          telefono: formData.telefono,
          direccion: formData.direccion,
          rh: formData.rh,
          cargo: formData.cargo,
          tipoPersonal: formData.tipoPersonal,
          fechaIngreso: formData.fechaIngreso,
          tipoVinculacion: formData.tipoVinculacion,
          tienePeriodoPrueba: formData.tienePeriodoPrueba,
          tiempoPeriodoPrueba: formData.tiempoPeriodoPrueba,
          tipoContrato: formData.tipoContrato,
          tiempoContrato: formData.tiempoContrato,
          fechaTerminacion: formData.fechaTerminacion,
          motivoTerminacion: formData.motivoTerminacion,
          salario: formData.salario,
          valorDiaTrabajo: formData.valorDiaTrabajo || "",
          horasSemanales: formData.horasSemanales || "",
          auxilioTransporte: formData.auxilioTransporte || "",
          modalidadLaboral: formData.modalidadLaboral,
          horarioModalidad: normalizarHorario(formData.horarioModalidad),
          foto: formData.foto,
          memorandos: formData.memorandos || [],
          // Campos de asignación institucional
          oficinaContrata: formData.oficinaContrata || "",
          dependenciaSolicita: formData.dependenciaSolicita || "",
          paisAsignacion: formData.paisAsignacion === "Otro" ? formData.otroPaisAsignacion : (formData.paisAsignacion || "Colombia"),
          departamentoAsignacion: formData.paisAsignacion === "Colombia" ? (formData.departamentoAsignacion || "") : "",
          ciudadAsignacion: formData.ciudadAsignacion || "",
          correoPersonal: formData.correoPersonal || "",
          // Seguridad social
          eps: formData.eps || "",
          fondoPension: formData.fondoPension || "",
          cesantias: formData.cesantias || "",
          cajaCompensacion: formData.cajaCompensacion || "",
          arl: formData.arl || "POSITIVA ARL",
          // Demografía y Afiliación
          afiliarAutomaticamente: !!formData.afiliarAutomaticamente,
          beneficiarios: beneficiariosValidos,
          mascotas: mascotasValidas,
          fechaNacimiento: formData.fechaNacimiento || "",
          paisNacimiento: formData.paisNacimiento || "Colombia",
          otroPaisNacimiento: formData.otroPaisNacimiento || "",
          lugarNacimiento: formData.lugarNacimiento || "",
          edad: formData.edad || "",
          sexo: formData.sexo || "",
          orientacionSexual: formData.orientacionSexual || "",
          orientacionOtro: formData.orientacionOtro || "",
          estrato: formData.estrato || "",
          etnia: formData.etnia || "",
          sisben: formData.sisben || "",
          sisbenPuntaje: formData.sisbenPuntaje || "",
          asesoriaSisben: formData.asesoriaSisben || "",
          victimaConflicto: formData.victimaConflicto || "",
          victimaTipo: formData.victimaTipo || "",
          victimaInscrito: formData.victimaInscrito || "",
          discriminacion: formData.discriminacion || "",
          discriminacionTipo: formData.discriminacionTipo || "",
          educacionNivel: formData.educacionNivel || "",
          educacionEstudio: formData.educacionEstudio || "",
          educacionSemestre: formData.educacionSemestre || "",
          educacionPlantel: formData.educacionPlantel || "",
          enfermedad: formData.enfermedad || "",
          enfermedadCual: formData.enfermedadCual || "",
          alergia: formData.alergia || "",
          alergiaCual: formData.alergiaCual || "",
          discapacidad: formData.discapacidad || "",
          discapacidadTipo: formData.discapacidadTipo || "",
          discapacidadOtro: formData.discapacidadOtro || "",
          trastorno: formData.trastorno || "",
          trastornoTipo: formData.trastornoTipo || "",
          trastornoOtro: formData.trastornoOtro || "",
          condicionEspecial: formData.condicionEspecial || "",
          condicionEspecialCual: formData.condicionEspecialCual || "",
          deseaSerVoluntario: formData.deseaSerVoluntario || "",
          emergenciaNombre: formData.emergenciaNombre || "",
          emergenciaNumero: formData.emergenciaNumero || "",
          emergenciaWhatsapp: formData.emergenciaWhatsapp || "",
          emergenciaDireccion: formData.emergenciaDireccion || "",
        };

        await updateDoc(doc(db, "empleados", editId.empleadoId), updateData);

        // Sincronizar con 'afiliados' si existe
        try {
          const qAf = query(collection(db, "afiliados"), where("personalId", "==", editId.empleadoId));
          const snapAf = await getDocs(qAf);
          if (!snapAf.empty) {
            const afDoc = snapAf.docs[0];
            await updateDoc(doc(db, "afiliados", afDoc.id), {
              nombre: formData.nombre,
              cedula: formData.documento,
              telefono: formData.telefono,
              correo: formData.correo,
              direccion: formData.direccion,
              rh: formData.rh,
              beneficiarios: beneficiariosValidos,
              mascotas: mascotasValidas,
              fechaNacimiento: formData.fechaNacimiento || "",
              paisNacimiento: formData.paisNacimiento || "Colombia",
              otroPaisNacimiento: formData.otroPaisNacimiento || "",
              lugarNacimiento: formData.lugarNacimiento || "",
              edad: formData.edad || "",
              sexo: formData.sexo || "",
              orientacionSexual: formData.orientacionSexual || "",
              orientacionOtro: formData.orientacionOtro || "",
              estrato: formData.estrato || "",
              etnia: formData.etnia || "",
              sisben: formData.sisben || "",
              sisbenPuntaje: formData.sisbenPuntaje || "",
              asesoriaSisben: formData.asesoriaSisben || "",
              victimaConflicto: formData.victimaConflicto || "",
              victimaTipo: formData.victimaTipo || "",
              victimaInscrito: formData.victimaInscrito || "",
              discriminacion: formData.discriminacion || "",
              discriminacionTipo: formData.discriminacionTipo || "",
              educacionNivel: formData.educacionNivel || "",
              educacionEstudio: formData.educacionEstudio || "",
              educacionSemestre: formData.educacionSemestre || "",
              educacionPlantel: formData.educacionPlantel || "",
              eps: formData.eps || "",
              arl: formData.arl || "POSITIVA ARL",
              enfermedad: formData.enfermedad || "",
              enfermedadCual: formData.enfermedadCual || "",
              alergia: formData.alergia || "",
              alergiaCual: formData.alergiaCual || "",
              discapacidad: formData.discapacidad || "",
              discapacidadTipo: formData.discapacidadTipo || "",
              discapacidadOtro: formData.discapacidadOtro || "",
              trastorno: formData.trastorno || "",
              trastornoTipo: formData.trastornoTipo || "",
              trastornoOtro: formData.trastornoOtro || "",
              condicionEspecial: formData.condicionEspecial || "",
              condicionEspecialCual: formData.condicionEspecialCual || "",
              deseaSerVoluntario: formData.deseaSerVoluntario || "",
              emergenciaNombre: formData.emergenciaNombre || "",
              emergenciaNumero: formData.emergenciaNumero || "",
              emergenciaWhatsapp: formData.emergenciaWhatsapp || "",
              emergenciaDireccion: formData.emergenciaDireccion || "",
            });
          }
        } catch (syncErr) {
          console.warn("No se pudo sincronizar con afiliados:", syncErr);
        }
      }
      toast.success("Personal actualizado correctamente");
      cargarDatos();
      setView("table");
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar personal");
    } finally {
      setCreando(false);
      setIsEditing(false);
      setPermitirModificarNiup(false);
      setEditId(null);
    }
  };

  const handleExportarExcelPersonal = () => {
    if (!usuariosFiltrados || usuariosFiltrados.length === 0) {
      toast.error("No hay registros para exportar");
      return;
    }

    const columnas = [
      { header: "Documento (NUIP)", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.documento || u.documento || "";
      }},
      { header: "Nombre Completo", transform: (u) => u.nombre || "" },
      { header: "Correo Institucional", transform: (u) => u.correo || "" },
      { header: "Correo Personal", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.correoPersonal || "";
      }},
      { header: "Teléfono", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.telefono || "";
      }},
      { header: "Dirección", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.direccion || "";
      }},
      { header: "RH", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.rh || "";
      }},
      { header: "Rol Sistema", transform: (u) => u.rol || "" },
      { header: "Cargo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.cargo || "";
      }},
      { header: "Tipo Personal", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.tipoPersonal || "";
      }},
      { header: "Estado", transform: (u) => u.activo === false ? "Inactivo / Bloqueado" : "Activo" },
      { header: "Modalidad Laboral", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.modalidadLaboral || "";
      }},
      { header: "Días Teletrabajo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.diasTeletrabajo || "";
      }},
      { header: "Oficina Emite / Asignación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.oficinaContrata || "";
      }},
      { header: "Dependencia Solicitante", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.dependenciaSolicita || "";
      }},
      { header: "País Asignación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.paisAsignacion || "";
      }},
      { header: "Departamento Asignación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.departamentoAsignacion || "";
      }},
      { header: "Ciudad Asignación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.ciudadAsignacion || "";
      }},
      { header: "Tipo Vinculación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.tipoVinculacion || "";
      }},
      { header: "Periodo de Prueba", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.tienePeriodoPrueba ? `Sí (${p?.tiempoPeriodoPrueba || ""})` : "No";
      }},
      { header: "Tipo de Contrato", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.tipoContrato || "";
      }},
      { header: "Tiempo Contrato", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.tiempoContrato || "";
      }},
      { header: "Fecha de Ingreso", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.fechaIngreso || "";
      }},
      { header: "Fecha Terminación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.fechaTerminacion || "";
      }},
      { header: "Salario Mensual", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.salario ? `$ ${p.salario}` : "";
      }},
      { header: "Valor Día", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.valorDiaTrabajo ? `$ ${p.valorDiaTrabajo}` : "";
      }},
      { header: "Horas Semanales", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.horasSemanales || "";
      }},
      { header: "Auxilio Transporte", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.auxilioTransporte ? `$ ${p.auxilioTransporte}` : "";
      }},
      { header: "EPS", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.eps || "";
      }},
      { header: "Fondo de Pensión", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.fondoPension || "";
      }},
      { header: "Cesantías", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.cesantias || "";
      }},
      { header: "Caja Compensación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.cajaCompensacion || "";
      }},
      { header: "ARL", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.arl || "";
      }},
      { header: "Código Institucional", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.codigoInstitucional || "";
      }},
      { header: "Afiliación Fundación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.afiliarAutomaticamente ? "Sí" : "No";
      }},
      { header: "Fecha Nacimiento", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.fechaNacimiento || "";
      }},
      { header: "Edad", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.edad || "";
      }},
      { header: "País Nacimiento", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.paisNacimiento || "";
      }},
      { header: "Lugar Nacimiento", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.lugarNacimiento || "";
      }},
      { header: "Sexo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.sexo || "";
      }},
      { header: "Orientación Sexual", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.orientacionSexual === "Otro" ? `Otro: ${p?.orientacionOtro || ""}` : (p?.orientacionSexual || "");
      }},
      { header: "Estrato", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.estrato || "";
      }},
      { header: "Grupo Étnico", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.etnia || "";
      }},
      { header: "Sisbén", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.sisben === "Sí" ? `Sí (Cat/Pje: ${p?.sisbenPuntaje || ""})` : (p?.sisben || "");
      }},
      { header: "Víctima Conflicto", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.victimaConflicto === "Sí" ? `Sí (${p?.victimaTipo || ""}) - RUV: ${p?.victimaInscrito || ""}` : (p?.victimaConflicto || "");
      }},
      { header: "Discriminación", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.discriminacion === "Sí" ? `Sí (${p?.discriminacionTipo || ""})` : (p?.discriminacion || "");
      }},
      { header: "Nivel Educativo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.educacionNivel || "";
      }},
      { header: "Estudio / Carrera", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.educacionEstudio || "";
      }},
      { header: "Plantel Educativo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.educacionPlantel || "";
      }},
      { header: "Enfermedades", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.enfermedad === "Sí" ? `Sí: ${p?.enfermedadCual || ""}` : "No";
      }},
      { header: "Alergias", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.alergia === "Sí" ? `Sí: ${p?.alergiaCual || ""}` : "No";
      }},
      { header: "Discapacidad", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.discapacidad === "Sí" ? `Sí: ${p?.discapacidadTipo || ""}` : "No";
      }},
      { header: "Trastorno Neurodesarrollo", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.trastorno === "Sí" ? `Sí: ${p?.trastornoTipo || ""}` : "No";
      }},
      { header: "Condición Especial", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.condicionEspecial === "Sí" ? `Sí: ${p?.condicionEspecialCual || ""}` : "No";
      }},
      { header: "Contacto Emergencia", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return p?.emergenciaNombre ? `${p.emergenciaNombre} (Tel: ${p.emergenciaNumero || ""} / Dir: ${p.emergenciaDireccion || ""})` : "";
      }},
      { header: "Beneficiarios", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return (p?.beneficiarios || []).filter(b => b.nombre).map(b => `${b.nombre} [NUIP: ${b.nuip || "N/A"}]`).join("; ");
      }},
      { header: "Mascotas", transform: (u) => {
        const p = u.empleadoId ? personalList.find(x => x.id === u.empleadoId) : null;
        return (p?.mascotas || []).filter(m => m.nombre).map(m => `${m.nombre} (${m.tipo}${m.raza ? ` - ${m.raza}` : ""})`).join("; ");
      }},
    ];

    try {
      exportarAExcel({
        nombreArchivo: "Personal_Institucional",
        titulo: "REPORTE INTEGRAL DE PERSONAL INSTITUCIONAL",
        columnas,
        datos: usuariosFiltrados,
      });
      toast.success("Archivo Excel descargado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al exportar a Excel");
    }
  };

  const handleEliminarPersonal = async (uId, empleadoId) => {
    if (!window.confirm("¿Estás seguro de que deseas ELIMINAR este personal permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      const result = await eliminarUsuarioInstitucional(uId, empleadoId);
      if (result.success) {
        toast.success("Personal eliminado correctamente");
        cargarDatos();
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar personal");
    }
  };

  // ==========================================
  // GENERACIÓN DE DOCUMENTOS (SILENCIOSA)
  // ==========================================

  const generarCarnetPersonal = async (persona) => {
    toast.info("Generando carnet...");
    try {
      const VERIFICACION_BASE_URL = `${window.location.origin}/verificar?doc=`;
      const qrUrl = await QRCode.toDataURL(`${VERIFICACION_BASE_URL}${persona.codigoInstitucional}`);
      setQrPersonal(qrUrl);
      setPersonalReciente(persona);

      await new Promise(resolve => setTimeout(resolve, 600));

      const element = document.getElementById("hidden-carnet-personal");
      if (!element) throw new Error("Template no encontrado");

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Carnet_${persona.tipoPersonal}_${persona.nombre.replace(/\s+/g, "_")}.png`;
      link.href = imgData;
      link.click();
      toast.success("Carnet descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar carnet");
    }
  };

  const solicitarCertificadoPersonal = (persona) => {
    // Verificar que hayan pasado al menos 30 días desde la fecha de ingreso
    const fechaIngreso = new Date(persona.fechaIngreso);
    const hoy = new Date();
    const diffDias = Math.floor((hoy - fechaIngreso) / (1000 * 60 * 60 * 24));

    if (diffDias < 30) {
      const diasRestantes = 30 - diffDias;
      toast.error(`El certificado laboral estará disponible en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}. Se requieren al menos 30 días laborando.`);
      return;
    }

    // Si ya tiene 30+ días, preguntar con o sin remuneración
    setPersonaCertPendiente(persona);
    setShowRemuneracionModal(true);
  };

  const generarCertificadoPersonal = async (persona, conRemuneracion) => {
    toast.info("Generando certificado...");
    try {
      setPersonalReciente({ ...persona, mostrarRemuneracion: conRemuneracion });
      await new Promise(resolve => setTimeout(resolve, 600));

      const element = document.getElementById("hidden-cert-personal");
      if (!element) throw new Error("Template no encontrado");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Generar QR
      const VERIFICACION_BASE_URL = `${window.location.origin}/verificar?doc=`;
      const qrDataUrl = await QRCode.toDataURL(`${VERIFICACION_BASE_URL}${persona.codigoInstitucional}`);
      const qrSize = 35;
      const marginX = pdfWidth - qrSize - 20;
      const marginY = pdf.internal.pageSize.getHeight() - qrSize - 30;

      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(marginX - 2, marginY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F');
      pdf.addImage(qrDataUrl, "PNG", marginX, marginY, qrSize, qrSize);

      pdf.save(`Certificado_Laboral_${persona.nombre.replace(/\s+/g, "_")}.pdf`);
      toast.success("Certificado laboral descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: "", documento: "", correo: "", telefono: "", direccion: "", rh: "", cargo: "",
      tipoPersonal: "Empleado", fechaIngreso: new Date().toISOString().split("T")[0],
      estado: "activo", rol: "empleado", password: "", modalidadLaboral: "Presencial",
      diasTeletrabajo: "", afiliarAutomaticamente: false, beneficiarios: [], mascotas: [], foto: null,
      horarioModalidad: HORARIO_DEFAULT,
      oficinaContrata: "", dependenciaSolicita: "", paisAsignacion: "Colombia", otroPaisAsignacion: "",
      departamentoAsignacion: "Valle del Cauca", ciudadAsignacion: "", correoPersonal: "",
      valorDiaTrabajo: "", horasSemanales: "", auxilioTransporte: "",
      eps: "", fondoPension: "", cesantias: "", cajaCompensacion: "", arl: "POSITIVA ARL"
    });
    setFotoPreview(null);
    setPersonalReciente(null);
    setView("create");
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(query) ||
      u.correo?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <NextImage src="/logo.png" alt="Logo" width={36} height={36} className="rounded-full" />
            <div>
              <h1 className="font-semibold text-foreground text-sm leading-tight">Módulo de Personal</h1>
              <p className="text-xs text-muted-foreground">Institucional</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">

        {/* ================================================== */}
        {/* VISTA: TABLA DASHBOARD PERSONAL */}
        {/* ================================================== */}
        {view === "table" && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="h-7 w-7 text-primary" />
                  Directorio de Personal
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Administra accesos, roles, cargos e información institucional de los colaboradores.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o correo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-card border-primary/20 focus-visible:ring-primary shadow-sm"
                  />
                </div>
                <Button onClick={handleExportarExcelPersonal} variant="outline" className="gap-2 shrink-0 h-10 w-full sm:w-auto shadow-sm text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Exportar a Excel
                </Button>
                <Button onClick={() => setView("create")} className="gap-2 shrink-0 h-10 w-full sm:w-auto shadow-sm">
                  <UserPlus className="h-4 w-4" /> Nuevo Personal
                </Button>
              </div>
            </div>

            {cargandoUsuarios || cargandoPersonal ? (
              <div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary" /></div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Rol / Cargo</TableHead>
                        <TableHead>Modalidad / Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosFiltrados.map((u) => {
                        const personal = u.empleadoId ? personalList.find(p => p.id === u.empleadoId) : {
                          id: u.uid || u.id,
                          nombre: u.nombre,
                          documento: "No Registrado",
                          cargo: u.rol === "superadmin" ? "Súper Administrador" : (u.rol === "lider_comercial" ? "Líder Comercial" : u.rol === "comercial" ? "Asesor Comercial" : "Administrador / RRHH"),
                          tipoPersonal: u.rol,
                          codigoInstitucional: u.uid?.substring(0, 8),
                          fechaIngreso: new Date().toISOString().split("T")[0],
                          modalidadLaboral: u.rol === "superadmin" ? "Empleado de Confianza" : "Presencial",
                          horarioModalidad: u.rol === "superadmin" ? HORARIO_DEFAULT_CONFIANZA : HORARIO_DEFAULT,
                          isMock: true
                        };

                        return (
                          <TableRow key={u.id} className={u.activo === false ? "opacity-60 bg-muted/20" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {personal?.foto ? (
                                  <img src={personal.foto} alt="" className="w-10 h-10 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm">{u.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{u.correo}</span>
                                  <span className="text-[10px] text-muted-foreground">ID: {personal?.documento || "—"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 items-start">
                                <Badge variant="outline" className={`uppercase text-[10px] tracking-wider ${
                                  u.rol === 'superadmin' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                    u.rol === 'recursos_humanos' ? 'bg-primary/10 text-primary border-primary/20' :
                                      u.rol === 'lider_comercial' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                        u.rol === 'comercial' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                          'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {u.rol === 'comercial' ? 'comercial' : u.rol}
                                </Badge>
                                {Array.isArray(personal?.memorandos) && personal.memorandos.filter(m => typeof m === 'string' && m.trim() !== "").length > 0 && (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] mt-1 flex gap-1 items-center w-fit">
                                    <AlertCircle className="w-3 h-3" />
                                    {personal.memorandos.filter(m => typeof m === 'string' && m.trim() !== "").length} Memorando(s)
                                  </Badge>
                                )}
                                {personal && (
                                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1" title={personal.cargo}>
                                    <Briefcase className="h-3 w-3" /> {personal.cargo} ({personal.tipoPersonal})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 items-start">
                                {u.activo !== false ? (
                                  <Badge className="bg-success text-white border-none text-[10px] uppercase">Activo</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px] uppercase">Bloqueado</Badge>
                                )}
                                {u.rol === "superadmin" ? (
                                  <span className="inline-flex items-center text-purple-700 font-semibold text-[11px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    <ShieldCheck className="w-3 h-3 mr-1" /> Sin Horario (Súper Admin)
                                  </span>
                                ) : (personal && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    {personal.modalidadLaboral === "Empleado de Confianza" ? (
                                      <span className="inline-flex items-center text-purple-700 font-semibold text-[11px] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                        <ShieldCheck className="w-3 h-3 mr-1" /> Confianza (Sin Horario)
                                      </span>
                                    ) : personal.modalidadLaboral === "Teletrabajo" ? (
                                      <span className="inline-flex items-center text-primary font-medium text-xs">
                                        <Monitor className="w-3 h-3 mr-1" /> Teletrabajo
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-muted-foreground font-medium text-xs">
                                        <Building className="w-3 h-3 mr-1" /> {personal.modalidadLaboral || "Presencial"}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {u.rol === "superadmin" ? (
                                  <>
                                    <Button variant="ghost" size="icon" onClick={() => setEmpleadoExpediente({ ...personal, usuarioData: u })} title="Ver Expediente Integral" className="text-indigo-600 hover:bg-indigo-50">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => abrirEdicion(u, personal)} title="Editar Información" className="text-warning hover:bg-warning/10">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => generarCarnetPersonal(personal)} title="Descargar Carnet Operativo">
                                      <QrCode className="h-4 w-4 text-info" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => solicitarCertificadoPersonal(personal)} title="Descargar Certificado Laboral">
                                      <FileText className="h-4 w-4 text-success" />
                                    </Button>
                                  </>
                                ) : (
                                  personal && (
                                    <>
                                      <Button variant="ghost" size="icon" onClick={() => setEmpleadoExpediente({ ...personal, usuarioData: u })} title="Ver Expediente Integral" className="text-indigo-600 hover:bg-indigo-50">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => abrirEdicion(u, personal)} title="Editar Personal" className="text-warning hover:bg-warning/10">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      {personal?.modalidadLaboral !== "Empleado de Confianza" && (
                                        <Button variant="ghost" size="icon" onClick={() => { 
                                          if (!personal.isMock) { 
                                            setEmpleadoSeleccionado(personal); 
                                            setHorarioEdit(normalizarHorario(personal.horarioModalidad)); 
                                          } else { 
                                            toast.info("Perfil administrativo sin gestión de horario asignado."); 
                                          } 
                                        }} title="Gestionar Horario">
                                          <CalendarDays className="h-4 w-4 text-primary" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" onClick={() => generarCarnetPersonal(personal)} title="Descargar Carnet">
                                        <QrCode className="h-4 w-4 text-info" />
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => solicitarCertificadoPersonal(personal)} title="Descargar Certificado Laboral">
                                        <FileText className="h-4 w-4 text-success" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleEstado(u.empleadoId, u.id, personal?.estado || "activo")}
                                        title={personal?.estado === "inactivo" ? "Habilitar Empleado" : "Inhabilitar Empleado"}
                                        className={personal?.estado === "inactivo" ? "text-success hover:bg-success/10" : "text-orange-500 hover:bg-orange-500/10"}
                                      >
                                        {personal?.estado === "inactivo" ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleEliminarPersonal(u.id, u.empleadoId)} title="Eliminar Personal" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {usuariosFiltrados.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            No se encontraron registros.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* VISTA: CREAR PERSONAL */}
        {/* ================================================== */}
        {view === "create" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-4">
              <Button variant="ghost" size="icon" onClick={() => setView("table")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {isEditing ? "Actualizar Información de Personal" : "Registrar Nuevo Personal"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isEditing ? "Edite los datos administrativos del trabajador." : "Llene los datos administrativos para habilitar un nuevo trabajador."}
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={isEditing ? handleEditarUsuario : handleCrearUsuario} className="space-y-8" autoComplete="off">
                  {/* FOTO Y DATOS BÁSICOS */}
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed bg-muted flex items-center justify-center group cursor-pointer hover:border-primary transition-colors">
                        {fotoPreview ? (
                          <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                          <UserPlus className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                        <input type="file" accept="image/*" required={!isEditing && !fotoPreview} onChange={handleFotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Foto oficial (requerida)*</p>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Nombres *</label>
                        <Input required value={formData.nombres} onChange={e => handleNameChange("nombres", e.target.value)} placeholder="Ej. Juan Carlos" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Primer Apellido *</label>
                        <Input required value={formData.primerApellido} onChange={e => handleNameChange("primerApellido", e.target.value)} placeholder="Ej. Pérez" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Segundo Apellido</label>
                        <Input value={formData.segundoApellido} onChange={e => handleNameChange("segundoApellido", e.target.value)} placeholder="Ej. Gómez (Opcional)" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                          <span>Documento (NIUP) *</span>
                          {isEditing && !permitirModificarNiup && (
                            <button
                              type="button"
                              onClick={() => {
                                const seguro = window.confirm("¿Está seguro de que desea modificar el NIUP? Esto cambiará el número de documento de este personal.");
                                if (seguro) {
                                  setPermitirModificarNiup(true);
                                }
                              }}
                              className="text-xs font-semibold text-amber-500 hover:text-amber-600 hover:underline cursor-pointer"
                            >
                              Modificar NIUP
                            </button>
                          )}
                        </label>
                        <Input
                          required
                          value={formData.documento}
                          onChange={handleDocumentChange}
                          placeholder="1.234.567.890"
                          disabled={isEditing && !permitirModificarNiup}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Teléfono</label>
                        <Input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="300 000 0000" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Dirección</label>
                        <Input value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} placeholder="Ej. Calle 1 # 2-3" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">RH</label>
                        <Select value={formData.rh} onValueChange={v => setFormData({ ...formData, rh: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                            <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* INFORMACIÓN INSTITUCIONAL */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary border-b pb-2 flex items-center gap-2"><Building className="w-4 h-4" /> Cargo y Funciones</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Personal *</label>
                          <Select value={formData.tipoPersonal} onValueChange={v => setFormData({ ...formData, tipoPersonal: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIPOS_PERSONAL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Cargo Oficial *</label>
                          <Input required value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} placeholder="Ej. Coordinador de Proyectos" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Modalidad Laboral</label>
                          <Select 
                            value={formData.modalidadLaboral} 
                            onValueChange={v => {
                              let updatedSchedule = { ...formData.horarioModalidad };
                              if (v === "Empleado de Confianza") {
                                DIAS_SEMANA.forEach(d => {
                                  if (updatedSchedule[d]?.modalidad !== "libre") {
                                    updatedSchedule[d] = { ...updatedSchedule[d], modalidad: "confianza" };
                                  }
                                });
                              }
                              setFormData({ ...formData, modalidadLaboral: v, horarioModalidad: updatedSchedule });
                            }}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Presencial">Presencial</SelectItem>
                              <SelectItem value="Teletrabajo">Teletrabajo</SelectItem>
                              <SelectItem value="Híbrido">Híbrido</SelectItem>
                              <SelectItem value="Empleado de Confianza">Empleado de Confianza (Sin Horario Fijo)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* ACCESOS AL SISTEMA */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-primary border-b pb-2 flex items-center gap-2"><Lock className="w-4 h-4" /> Acceso al Sistema</h3>
                      <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-dashed">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Correo de Ingreso *</label>
                          <Input required type="email" value={formData.correo} onChange={e => setFormData({ ...formData, correo: e.target.value })} placeholder="usuario@islacascajal.org" disabled={isEditing} />
                        </div>
                        {!isEditing && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Contraseña Inicial *</label>
                            <div className="relative">
                              <Input required type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Min. 4 caracteres" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Rol de Permisos *</label>
                          <Select value={formData.rol} onValueChange={v => setFormData({ ...formData, rol: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empleado">Empleado</SelectItem>
                              <SelectItem value="comercial">Asesor Comercial</SelectItem>
                              <SelectItem value="lider_comercial">Líder Comercial</SelectItem>
                              <SelectItem value="recursos_humanos">Recursos Humanos</SelectItem>
                              {esSuperAdmin && <SelectItem value="superadmin">Súper Administrador</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* INFORMACIÓN DE ASIGNACIÓN INSTITUCIONAL */}
                  <div className="pt-8 border-t">
                    <h3 className="text-sm font-bold text-primary border-b pb-2 flex items-center gap-2 mb-4"><Building className="w-4 h-4" /> Asignación Institucional</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border">

                      {/* Oficina que contrata */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Oficina que Contrata *</label>
                        <Select value={formData.oficinaContrata} onValueChange={v => setFormData({ ...formData, oficinaContrata: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione la sede..." /></SelectTrigger>
                          <SelectContent>
                            {SEDES_INSTITUCIONALES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dependencia que vincula (siempre fija) */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Dependencia que Vincula</label>
                        <Input value="Área de Talento Humano" disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
                      </div>

                      {/* Dependencia que solicita */}
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Dependencia que Solicita</label>
                        <Input
                          value={formData.dependenciaSolicita}
                          onChange={e => setFormData({ ...formData, dependenciaSolicita: e.target.value })}
                          placeholder="Ej. Área de Comunicaciones, Coordinación Jurídica..."
                        />
                      </div>

                      {/* País de Asignación */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">País de Asignación</label>
                        <Select value={formData.paisAsignacion} onValueChange={v => setFormData({ ...formData, paisAsignacion: v, otroPaisAsignacion: "" })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione país..." /></SelectTrigger>
                          <SelectContent>
                            {PAISES_PERSONAL.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {formData.paisAsignacion === "Otro" && (
                          <Input
                            className="mt-2"
                            placeholder="Escriba el nombre del país"
                            value={formData.otroPaisAsignacion}
                            onChange={e => setFormData({ ...formData, otroPaisAsignacion: e.target.value })}
                          />
                        )}
                      </div>

                      {/* Departamento de Asignación (solo si Colombia) */}
                      {formData.paisAsignacion === "Colombia" && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Departamento de Asignación</label>
                          <Select value={formData.departamentoAsignacion} onValueChange={v => setFormData({ ...formData, departamentoAsignacion: v })}>
                            <SelectTrigger><SelectValue placeholder="Seleccione departamento..." /></SelectTrigger>
                            <SelectContent>
                              {DEPARTAMENTOS_COLOMBIA_PERSONAL.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Ciudad de Asignación */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Ciudad de Asignación</label>
                        <Input
                          value={formData.ciudadAsignacion}
                          onChange={e => setFormData({ ...formData, ciudadAsignacion: e.target.value })}
                          placeholder="Ej. Cali, Buenaventura..."
                        />
                      </div>

                      {/* Correo Personal */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Correo Personal</label>
                        <Input
                          type="email"
                          value={formData.correoPersonal}
                          onChange={e => setFormData({ ...formData, correoPersonal: e.target.value })}
                          placeholder="correo@gmail.com"
                        />
                      </div>

                    </div>
                  </div>

                  {/* INFORMACION CONTRACTUAL */}
                  <div className="pt-8 border-t">
                    <h3 className="text-sm font-bold text-primary border-b pb-2 flex items-center gap-2 mb-4"><Briefcase className="w-4 h-4" /> Información Contractual</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 bg-muted/10 p-5 rounded-xl border">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Vinculación</label>
                        <Select value={formData.tipoVinculacion} onValueChange={v => setFormData({ ...formData, tipoVinculacion: v, tiempoContrato: "", tiempoPeriodoPrueba: "" })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Contrato">Contrato</SelectItem>
                            <SelectItem value="Nombramiento">Nombramiento</SelectItem>
                            <SelectItem value="Periodo de Prueba">Período de Prueba</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tipo de contrato: solo visible si es Contrato o Nombramiento */}
                      {(formData.tipoVinculacion === "Contrato" || formData.tipoVinculacion === "Nombramiento") && (
                        <div className="space-y-2 md:col-span-2 lg:col-span-2 animate-in fade-in zoom-in duration-200">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Contrato</label>
                          <Select value={formData.tipoContrato} onValueChange={v => setFormData({ ...formData, tipoContrato: v })}>
                            <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Contrato a Término Fijo">Contrato a Término Fijo</SelectItem>
                              <SelectItem value="Contrato a Término Indefinido">Contrato a Término Indefinido</SelectItem>
                              <SelectItem value="Contrato de Prestación de Servicios">Contrato de Prestación de Servicios</SelectItem>
                              <SelectItem value="Contrato de Obra o Labor">Contrato de Obra o Labor</SelectItem>
                              <SelectItem value="Contrato Ocasional, Accidental o Transitorio">Contrato Ocasional, Accidental o Transitorio</SelectItem>
                              <SelectItem value="Contrato de Aprendizaje">Contrato de Aprendizaje</SelectItem>
                              <SelectItem value="Convenio de Práctica, Pasantías o Vinculación Formativa">Convenio de Práctica, Pasantías o Vinculación Formativa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Tiempo del período de prueba: 1-20 días */}
                      {formData.tipoVinculacion === "Periodo de Prueba" && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Tiempo del Período de Prueba</label>
                          <Select value={formData.tiempoPeriodoPrueba} onValueChange={v => setFormData({ ...formData, tiempoPeriodoPrueba: v })}>
                            <SelectTrigger><SelectValue placeholder="Seleccione días..." /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 46 }, (_, i) => i + 15).map(d => (
                                <SelectItem key={d} value={String(d)}>{d} días</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Tiempo del contrato: 1-60 meses, solo para Contrato o Nombramiento */}
                      {(formData.tipoVinculacion === "Contrato" || formData.tipoVinculacion === "Nombramiento") && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Tiempo del Contrato</label>
                          <Select value={formData.tiempoContrato} onValueChange={v => setFormData({ ...formData, tiempoContrato: v })}>
                            <SelectTrigger><SelectValue placeholder="Seleccione meses..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Indefinido">Indefinido</SelectItem>
                              {Array.from({ length: 60 }, (_, i) => i + 1).map(m => (
                                <SelectItem key={m} value={String(m)}>{m} {m === 1 ? "mes" : "meses"}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* === TABLA DE CÁLCULO DE REMUNERACIÓN === */}
                      {[
                        "Contrato a Término Fijo",
                        "Contrato a Término Indefinido",
                        "Contrato de Aprendizaje",
                        "Contrato Ocasional, Accidental o Transitorio"
                      ].includes(formData.tipoContrato) && (() => {
                        const valorDia = parseFloat((formData.valorDiaTrabajo || "").replace(/[^0-9.]/g, "")) || 0;
                        const horasSem = parseFloat((formData.horasSemanales || "").replace(/[^0-9.]/g, "")) || 0;
                        const horasMes = horasSem * 4;
                        const valorMensual = valorDia * 30;
                        const auxTransporte = parseFloat((formData.auxilioTransporte || "").replace(/[^0-9.]/g, "")) || 0;
                        const valorTotal = valorMensual + auxTransporte;
                        const fmt = (n) => n > 0 ? "$ " + n.toLocaleString("es-CO") : "—";

                        const updateSalario = (diario, aux) => {
                          const vm = (parseFloat((diario || "").replace(/[^0-9.]/g, "")) || 0) * 30;
                          const at = parseFloat((aux || "").replace(/[^0-9.]/g, "")) || 0;
                          const total = vm + at;
                          return total > 0 ? "$ " + total.toLocaleString("es-CO") : "";
                        };

                        return (
                          <div className="col-span-full space-y-3 animate-in fade-in zoom-in duration-200">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Cálculo de Remuneración</label>
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-primary text-white">
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">VALOR DEL DÍA DE TRABAJO</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">HORAS SEMANALES A LABORAR</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">HORAS MENSUALES A LABORAR</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">VALOR DE LA REMUNERACIÓN MENSUAL</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">AUXILIO DE TRANSPORTE</th>
                                    <th className="px-3 py-2 text-center font-bold">VALOR REMUNERACIÓN</th>
                                  </tr>
                                 
                                </thead>
                                <tbody>
                                  <tr className="bg-card">
                                    {/* Valor día trabajo */}
                                    <td className="px-3 py-3 border-r">
                                      <input
                                        type="text"
                                        value={formData.valorDiaTrabajo}
                                        onChange={e => {
                                          let raw = e.target.value.replace(/[^0-9]/g, "");
                                          const formatted = raw ? "$ " + parseInt(raw).toLocaleString("es-CO") : "";
                                          setFormData(prev => ({ ...prev, valorDiaTrabajo: formatted, salario: updateSalario(formatted, prev.auxilioTransporte) }));
                                        }}
                                        placeholder="$ 58.364"
                                        className="w-full text-center border rounded px-2 py-1 text-sm bg-background"
                                      />
                                    </td>
                                    {/* Horas semanales */}
                                    <td className="px-3 py-3 border-r">
                                      <input
                                        type="text"
                                        value={formData.horasSemanales}
                                        onChange={e => {
                                          const val = e.target.value.replace(/[^0-9]/g, "");
                                          setFormData(prev => ({ ...prev, horasSemanales: val }));
                                        }}
                                        placeholder="42"
                                        className="w-full text-center border rounded px-2 py-1 text-sm bg-background"
                                      />
                                    </td>
                                    {/* Horas mensuales (auto) */}
                                    <td className="px-3 py-3 border-r">
                                      <div className="w-full text-center px-2 py-1 text-sm font-bold text-primary bg-primary/5 rounded">
                                        {horasMes > 0 ? horasMes : "—"}
                                      </div>
                                    </td>
                                    {/* Valor remuneración mensual (auto) */}
                                    <td className="px-3 py-3 border-r">
                                      <div className="w-full text-center px-2 py-1 text-sm font-bold text-primary bg-primary/5 rounded">
                                        {fmt(valorMensual)}
                                      </div>
                                    </td>
                                    {/* Auxilio transporte */}
                                    <td className="px-3 py-3 border-r">
                                      <input
                                        type="text"
                                        value={formData.auxilioTransporte}
                                        onChange={e => {
                                          let raw = e.target.value.replace(/[^0-9]/g, "");
                                          const formatted = raw ? "$ " + parseInt(raw).toLocaleString("es-CO") : "";
                                          setFormData(prev => ({ ...prev, auxilioTransporte: formatted, salario: updateSalario(prev.valorDiaTrabajo, formatted) }));
                                        }}
                                        placeholder="$ 249.095"
                                        className="w-full text-center border rounded px-2 py-1 text-sm bg-background"
                                      />
                                    </td>
                                    {/* Valor total remuneración (auto) */}
                                    <td className="px-3 py-3">
                                      <div className="w-full text-center px-2 py-1 text-sm font-bold text-success bg-success/10 rounded">
                                        {fmt(valorTotal)}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[10px] text-muted-foreground">El <strong>Valor Remuneración</strong> se calcula automáticamente y se guardará como la remuneración total del trabajador.</p>
                          </div>
                        );
                      })()}

                      {/* === TABLA DE CÁLCULO DE REMUNERACIÓN PARA OTROS CONTRATOS === */}
                      {![
                        "Contrato a Término Fijo",
                        "Contrato a Término Indefinido",
                        "Contrato de Aprendizaje",
                        "Contrato Ocasional, Accidental o Transitorio"
                      ].includes(formData.tipoContrato) && (() => {
                        const valorDia = parseFloat((formData.valorDiaTrabajo || "").replace(/[^0-9.]/g, "")) || 0;
                        const horasSem = parseFloat((formData.horasSemanales || "").replace(/[^0-9.]/g, "")) || 0;
                        const horasMes = horasSem * 4;
                        const valorTotal = valorDia * horasMes;
                        const fmt = (n) => n > 0 ? "$ " + n.toLocaleString("es-CO") : "—";

                        const updateSalario = (diario, horasS) => {
                          const vd = parseFloat((diario || "").replace(/[^0-9.]/g, "")) || 0;
                          const hs = parseFloat((horasS || "").replace(/[^0-9.]/g, "")) || 0;
                          const total = vd * (hs * 4);
                          return total > 0 ? "$ " + total.toLocaleString("es-CO") : "";
                        };

                        return (
                          <div className="col-span-full space-y-3 animate-in fade-in zoom-in duration-200">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Cálculo de Remuneración</label>
                            <div className="overflow-x-auto rounded-lg border">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-primary text-white">
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">VALOR DEL DÍA DE TRABAJO</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">HORAS SEMANALES A LABORAR</th>
                                    <th className="px-3 py-2 text-center font-bold border-r border-primary/40">HORAS MENSUALES A LABORAR</th>
                                    <th className="px-3 py-2 text-center font-bold">VALOR REMUNERACIÓN</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="bg-card">
                                    {/* Valor día trabajo */}
                                    <td className="px-3 py-3 border-r">
                                      <input
                                        type="text"
                                        value={formData.valorDiaTrabajo}
                                        onChange={e => {
                                          let raw = e.target.value.replace(/[^0-9]/g, "");
                                          const formatted = raw ? "$ " + parseInt(raw).toLocaleString("es-CO") : "";
                                          setFormData(prev => ({ ...prev, valorDiaTrabajo: formatted, salario: updateSalario(formatted, prev.horasSemanales) }));
                                        }}
                                        placeholder="$ 50.000"
                                        className="w-full text-center border rounded px-2 py-1 text-sm bg-background"
                                      />
                                    </td>
                                    {/* Horas semanales */}
                                    <td className="px-3 py-3 border-r">
                                      <input
                                        type="text"
                                        value={formData.horasSemanales}
                                        onChange={e => {
                                          const val = e.target.value.replace(/[^0-9]/g, "");
                                          setFormData(prev => ({ ...prev, horasSemanales: val, salario: updateSalario(prev.valorDiaTrabajo, val) }));
                                        }}
                                        placeholder="10"
                                        className="w-full text-center border rounded px-2 py-1 text-sm bg-background"
                                      />
                                    </td>
                                    {/* Horas mensuales (auto) */}
                                    <td className="px-3 py-3 border-r">
                                      <div className="w-full text-center px-2 py-1 text-sm font-bold text-primary bg-primary/5 rounded">
                                        {horasMes > 0 ? horasMes : "—"}
                                      </div>
                                    </td>
                                    {/* Valor total remuneración (auto) */}
                                    <td className="px-3 py-3">
                                      <div className="w-full text-center px-2 py-1 text-sm font-bold text-success bg-success/10 rounded">
                                        {fmt(valorTotal)}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[10px] text-muted-foreground">El <strong>Valor Remuneración</strong> se calcula automáticamente y se guardará como la remuneración total del trabajador.</p>
                          </div>
                        );
                      })()}

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha de Ingreso *</label>
                        <Input required type="date" value={formData.fechaIngreso} onChange={e => setFormData({ ...formData, fechaIngreso: e.target.value })} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha de Terminación</label>
                        <Input type="date" value={formData.fechaTerminacion} onChange={e => setFormData({ ...formData, fechaTerminacion: e.target.value })} />
                      </div>

                      {formData.fechaTerminacion && (
                        <div className="space-y-2 md:col-span-2 lg:col-span-3 animate-in fade-in zoom-in duration-200">
                          <label className="text-xs font-semibold uppercase text-muted-foreground">Motivo de Terminación</label>
                          <Input value={formData.motivoTerminacion} onChange={e => setFormData({ ...formData, motivoTerminacion: e.target.value })} placeholder="Razón o motivo de la terminación..." />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AFILIACIONES */}
                  <div className="pt-8 border-t">
                    <h3 className="text-sm font-bold text-primary border-b pb-2 flex items-center gap-2 mb-4"><ShieldCheck className="w-4 h-4" /> Afiliaciones al Sistema de Seguridad Social</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 bg-muted/10 p-5 rounded-xl border">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">EPS</label>
                        <Select value={formData.eps} onValueChange={v => setFormData({ ...formData, eps: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione EPS..." /></SelectTrigger>
                          <SelectContent>
                            {["Sura EPS", "Sanitas EPS", "Salud Total", "Nueva EPS", "Compensar EPS", "Famisanar", "Coosalud", "Asmet Salud", "Emssanar", "Mutual Ser", "Savia Salud", "Cajacopi", "Capresoca", "Capital Salud", "Otra"].map(eps => (
                              <SelectItem key={eps} value={eps}>{eps}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Fondo de Pensión</label>
                        <Select value={formData.fondoPension} onValueChange={v => setFormData({ ...formData, fondoPension: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione Pensión..." /></SelectTrigger>
                          <SelectContent>
                            {["Protección", "Porvenir", "Colfondos", "Skandia", "Colpensiones"].map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Cesantías</label>
                        <Select value={formData.cesantias} onValueChange={v => setFormData({ ...formData, cesantias: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione Cesantías..." /></SelectTrigger>
                          <SelectContent>
                            {["Protección", "Porvenir", "Colfondos", "Fondo Nacional del Ahorro"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Caja de Compensación</label>
                        <Select value={formData.cajaCompensacion} onValueChange={v => setFormData({ ...formData, cajaCompensacion: v })}>
                          <SelectTrigger><SelectValue placeholder="Seleccione Caja..." /></SelectTrigger>
                          <SelectContent>
                            {["Comfandi", "Comfenalco Valle", "Compensar", "Cafam", "Colsubsidio", "Comfama", "Comfenalco Antioquia", "Otra"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">ARL</label>
                        <Input value={formData.arl} readOnly className="bg-muted cursor-not-allowed text-muted-foreground font-semibold" />
                      </div>
                    </div>
                  </div>

                  {/* HORARIO SEMANAL */}
                  <div className="pt-8 border-t">
                    <div className="space-y-4 bg-muted/10 p-5 rounded-xl border border-dashed">
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Horario Laboral o de Actividades y Modalidad
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-4">Configure la jornada y modalidad por cada día</p>

                      <div className="flex flex-col space-y-3">
                        {DIAS_SEMANA.map((dia) => (
                          <div key={dia} className="flex flex-col md:flex-row md:items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4 transition-colors hover:bg-muted/30">
                            <div className="w-full md:w-32 font-black uppercase text-primary text-sm border-b md:border-b-0 pb-1 md:pb-0">
                              {dia}
                            </div>

                            <div className="w-full md:w-56 shrink-0">
                              <Select
                                value={formData.horarioModalidad[dia]?.modalidad || "presencial"}
                                onValueChange={(v) => setFormData({
                                  ...formData,
                                  horarioModalidad: {
                                    ...formData.horarioModalidad,
                                    [dia]: { ...formData.horarioModalidad[dia], modalidad: v }
                                  }
                                })}
                              >
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="presencial">Presencial</SelectItem>
                                  <SelectItem value="teletrabajo">Teletrabajo</SelectItem>
                                  <SelectItem value="confianza">Empleado de Confianza</SelectItem>
                                  <SelectItem value="presencial_sin_horario">Presencial sin Horario</SelectItem>
                                  <SelectItem value="teletrabajo_sin_horario">Teletrabajo sin Horario</SelectItem>
                                  <SelectItem value="libre">No Laboral (Libre)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex-1 flex justify-end w-full">
                              {!["libre", "confianza", "presencial_sin_horario", "teletrabajo_sin_horario"].includes(formData.horarioModalidad[dia]?.modalidad) ? (
                                <div className="flex flex-col lg:flex-row gap-2 lg:gap-4 items-center w-full bg-muted/20 lg:bg-transparent p-2 lg:p-0 rounded-md">
                                  {/* Jornada 1 */}
                                  <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10">Ent 1</label>
                                    <Input
                                      type="time"
                                      className="w-[90px] h-8 text-xs px-2"
                                      value={formData.horarioModalidad[dia]?.entrada1 || "08:00"}
                                      onChange={(e) => handleTimeChange(dia, 'entrada1', e.target.value)}
                                    />
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10 text-right lg:pl-2 border-l border-muted-foreground/20">Sal 1</label>
                                    <Input
                                      type="time"
                                      className="w-[90px] h-8 text-xs px-2"
                                      value={formData.horarioModalidad[dia]?.salida1 || "12:00"}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        horarioModalidad: {
                                          ...formData.horarioModalidad,
                                          [dia]: { ...formData.horarioModalidad[dia], salida1: e.target.value }
                                        }
                                      })}
                                    />
                                  </div>
                                  {/* Jornada 2 */}
                                  <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-start lg:pl-4 lg:border-l border-muted-foreground/20">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10">Ent 2</label>
                                    <Input
                                      type="time"
                                      className="w-[90px] h-8 text-xs px-2"
                                      value={formData.horarioModalidad[dia]?.entrada2 || "14:00"}
                                      onChange={(e) => handleTimeChange(dia, 'entrada2', e.target.value)}
                                    />
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10 text-right lg:pl-2 border-l border-muted-foreground/20">Sal 2</label>
                                    <Input
                                      type="time"
                                      className="w-[90px] h-8 text-xs px-2"
                                      value={formData.horarioModalidad[dia]?.salida2 || "18:00"}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        horarioModalidad: {
                                          ...formData.horarioModalidad,
                                          [dia]: { ...formData.horarioModalidad[dia], salida2: e.target.value }
                                        }
                                      })}
                                    />
                                  </div>
                                </div>
                              ) : formData.horarioModalidad[dia]?.modalidad === "confianza" ? (
                                <div className="w-full lg:w-auto text-center lg:text-right text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-md border border-purple-200 flex items-center justify-end gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Manejo y Confianza (Sin horario fijo)
                                </div>
                              ) : formData.horarioModalidad[dia]?.modalidad === "libre" ? (
                                <div className="w-full lg:w-auto text-center lg:text-right text-sm text-muted-foreground italic py-2 lg:py-0">
                                  Día no laboral (Libre)
                                </div>
                              ) : (
                                <div className="w-full lg:w-auto text-center lg:text-right text-sm text-muted-foreground italic py-2 lg:py-0">
                                  Sin horario fijo asignado
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {formData.tipoVinculacion !== "Periodo de Prueba" && (
                  <div className="border-t pt-6">
                    <div className="flex items-start space-x-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                      <Checkbox
                        id="afiliarAuto"
                        checked={formData.afiliarAutomaticamente}
                        onCheckedChange={(c) => {
                          const isAuto = !!c;
                          setFormData(prev => ({
                            ...prev,
                            afiliarAutomaticamente: isAuto,
                            beneficiarios: isAuto && prev.beneficiarios.length === 0 ? Array.from({ length: 5 }, () => ({ nombre: "", nuip: "" })) : prev.beneficiarios,
                            mascotas: isAuto && prev.mascotas.length === 0 ? Array.from({ length: 2 }, () => ({ nombre: "", tipo: "", raza: "" })) : prev.mascotas
                          }));
                        }}
                      />
                      <div className="space-y-1 leading-none w-full">
                        <label htmlFor="afiliarAuto" className="text-sm font-bold text-primary cursor-pointer">
                          Afiliar automáticamente a la fundación
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Si activas esto, el trabajador también obtendrá beneficios institucionales. La afiliación se marcará como indefinida mientras el empleado siga activo en la institución.
                        </p>

                        {formData.afiliarAutomaticamente && (
                          <div className="mt-6 space-y-8 bg-background/80 p-6 rounded-xl border border-primary/20 shadow-inner animate-in fade-in zoom-in duration-300">
                            
                            {/* 1. INFORMACIÓN DE NACIMIENTO Y EDAD */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <Calendar className="h-4 w-4" />
                                1. Información de Nacimiento
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Fecha de Nacimiento *</label>
                                  <Input
                                    type="date"
                                    value={formData.fechaNacimiento}
                                    onChange={(e) => handleBirthDateChange(e.target.value)}
                                    className="h-9 text-xs"
                                    disabled={creando}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Edad Calculada</label>
                                  <Input
                                    value={formData.edad || "—"}
                                    readOnly
                                    className="h-9 text-xs bg-muted font-bold text-primary cursor-not-allowed"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">País de Nacimiento *</label>
                                  <Select
                                    value={formData.paisNacimiento}
                                    onValueChange={(v) => setFormData({ ...formData, paisNacimiento: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione País" /></SelectTrigger>
                                    <SelectContent>
                                      {PAISES_PERSONAL.map((p) => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {formData.paisNacimiento === "Otro" ? (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase text-muted-foreground">¿Cuál País?</label>
                                    <Input
                                      value={formData.otroPaisNacimiento}
                                      onChange={(e) => setFormData({ ...formData, otroPaisNacimiento: e.target.value })}
                                      className="h-9 text-xs"
                                      placeholder="Escriba el país"
                                      disabled={creando}
                                    />
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase text-muted-foreground">Lugar / Ciudad de Nacimiento</label>
                                    <Input
                                      value={formData.lugarNacimiento}
                                      onChange={(e) => setFormData({ ...formData, lugarNacimiento: e.target.value })}
                                      className="h-9 text-xs"
                                      placeholder="Ej: Buenaventura, Cali"
                                      disabled={creando}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 2. IDENTIDAD Y PERFIL DEMOGRÁFICO */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <Users className="h-4 w-4" />
                                2. Perfil Demográfico e Identidad
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Sexo Asignado *</label>
                                  <Select
                                    value={formData.sexo}
                                    onValueChange={(v) => setFormData({ ...formData, sexo: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione Sexo" /></SelectTrigger>
                                    <SelectContent>
                                      {["Masculino", "Femenino", "Intersexual", "No binario", "Prefiero no decir"].map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Orientación Sexual</label>
                                  <Select
                                    value={formData.orientacionSexual}
                                    onValueChange={(v) => setFormData({ ...formData, orientacionSexual: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      {["Heterosexual", "Homosexual / Gay / Lesbiana", "Bisexual", "Pansexual", "Asexual", "Otro"].map((o) => (
                                        <SelectItem key={o} value={o}>{o}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {formData.orientacionSexual === "Otro" && (
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-bold uppercase text-muted-foreground">¿Cuál Orientación?</label>
                                    <Input
                                      value={formData.orientacionOtro}
                                      onChange={(e) => setFormData({ ...formData, orientacionOtro: e.target.value })}
                                      className="h-9 text-xs"
                                      placeholder="Especificar"
                                      disabled={creando}
                                    />
                                  </div>
                                )}
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Estrato Socioeconómico</label>
                                  <Select
                                    value={formData.estrato}
                                    onValueChange={(v) => setFormData({ ...formData, estrato: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione Estrato" /></SelectTrigger>
                                    <SelectContent>
                                      {["Estrato 1", "Estrato 2", "Estrato 3", "Estrato 4", "Estrato 5", "Estrato 6", "No aplica / Rural"].map((est) => (
                                        <SelectItem key={est} value={est}>{est}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Grupo Étnico</label>
                                  <Select
                                    value={formData.etnia}
                                    onValueChange={(v) => setFormData({ ...formData, etnia: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione Etnia" /></SelectTrigger>
                                    <SelectContent>
                                      {ETNIAS.map((et) => (
                                        <SelectItem key={et} value={et}>{et}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* 3. CONTEXTO SOCIAL Y VULNERABILIDAD */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <ShieldAlert className="h-4 w-4" />
                                3. Contexto Social y Vulnerabilidad
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Cuenta con Sisbén?</label>
                                  <Select
                                    value={formData.sisben}
                                    onValueChange={(v) => setFormData({ ...formData, sisben: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.sisben === "Sí" && (
                                    <Input
                                      value={formData.sisbenPuntaje}
                                      onChange={(e) => setFormData({ ...formData, sisbenPuntaje: e.target.value })}
                                      className="h-8 text-xs mt-2"
                                      placeholder="Categoría / Grupo (Ej: A1, B2)"
                                      disabled={creando}
                                    />
                                  )}
                                  {formData.sisben === "No" && (
                                    <div className="pt-2">
                                      <label className="text-[10px] text-muted-foreground block">¿Desea asesoría de Sisbén?</label>
                                      <Select
                                        value={formData.asesoriaSisben}
                                        onValueChange={(v) => setFormData({ ...formData, asesoriaSisben: v })}
                                        disabled={creando}
                                      >
                                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="¿Desea Asesoría?" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Sí">Sí</SelectItem>
                                          <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Víctima del Conflicto Armado?</label>
                                  <Select
                                    value={formData.victimaConflicto}
                                    onValueChange={(v) => setFormData({ ...formData, victimaConflicto: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.victimaConflicto === "Sí" && (
                                    <div className="space-y-2 pt-2">
                                      <Select
                                        value={formData.victimaTipo}
                                        onValueChange={(v) => setFormData({ ...formData, victimaTipo: v })}
                                        disabled={creando}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Hecho Victimizante" /></SelectTrigger>
                                        <SelectContent>
                                          {TIPOS_VICTIMA.map((tv) => (
                                            <SelectItem key={tv} value={tv}>{tv}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Select
                                        value={formData.victimaInscrito}
                                        onValueChange={(v) => setFormData({ ...formData, victimaInscrito: v })}
                                        disabled={creando}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="¿Inscrito en RUV?" /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Sí">Inscrito en RUV: Sí</SelectItem>
                                          <SelectItem value="No">Inscrito en RUV: No</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Ha sufrido Discriminación?</label>
                                  <Select
                                    value={formData.discriminacion}
                                    onValueChange={(v) => setFormData({ ...formData, discriminacion: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.discriminacion === "Sí" && (
                                    <Select
                                      value={formData.discriminacionTipo}
                                      onValueChange={(v) => setFormData({ ...formData, discriminacionTipo: v })}
                                      disabled={creando}
                                    >
                                      <SelectTrigger className="h-8 text-xs mt-2"><SelectValue placeholder="Tipo de discriminación" /></SelectTrigger>
                                      <SelectContent>
                                        {TIPOS_DISCRIMINACION.map((td) => (
                                          <SelectItem key={td} value={td}>{td}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 4. FORMACIÓN ACADÉMICA */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <GraduationCap className="h-4 w-4" />
                                4. Formación Académica
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Nivel Educativo Alcanzado *</label>
                                  <Select
                                    value={formData.educacionNivel}
                                    onValueChange={(v) => setFormData({ ...formData, educacionNivel: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione Nivel" /></SelectTrigger>
                                    <SelectContent>
                                      {NIVELES_EDUCATIVOS.map((ne) => (
                                        <SelectItem key={ne} value={ne}>{ne}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {formData.educacionNivel && formData.educacionNivel !== "Ninguno" && (
                                  <>
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Carrera o Estudio</label>
                                      <Input
                                        value={formData.educacionEstudio}
                                        onChange={(e) => setFormData({ ...formData, educacionEstudio: e.target.value })}
                                        className="h-9 text-xs"
                                        placeholder="Ej: Contaduría, Psicología, Bachiller"
                                        disabled={creando}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Semestre / Grado</label>
                                      <Input
                                        value={formData.educacionSemestre}
                                        onChange={(e) => setFormData({ ...formData, educacionSemestre: e.target.value })}
                                        className="h-9 text-xs"
                                        placeholder="Ej: 8vo Semestre / Graduado"
                                        disabled={creando}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Plantel o Institución</label>
                                      <Input
                                        value={formData.educacionPlantel}
                                        onChange={(e) => setFormData({ ...formData, educacionPlantel: e.target.value })}
                                        className="h-9 text-xs"
                                        placeholder="Ej: Universidad del Valle, SENA"
                                        disabled={creando}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 5. PERFIL DE SALUD Y CONDICIONES ESPECIALES */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <HeartPulse className="h-4 w-4" />
                                5. Perfil de Salud y Condiciones Especiales
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Enfermedad Diagnosticada?</label>
                                  <Select
                                    value={formData.enfermedad}
                                    onValueChange={(v) => setFormData({ ...formData, enfermedad: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.enfermedad === "Sí" && (
                                    <Input
                                      value={formData.enfermedadCual}
                                      onChange={(e) => setFormData({ ...formData, enfermedadCual: e.target.value })}
                                      className="h-8 text-xs mt-2"
                                      placeholder="¿Cuál enfermedad?"
                                      disabled={creando}
                                    />
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Tiene Alergias?</label>
                                  <Select
                                    value={formData.alergia}
                                    onValueChange={(v) => setFormData({ ...formData, alergia: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.alergia === "Sí" && (
                                    <Input
                                      value={formData.alergiaCual}
                                      onChange={(e) => setFormData({ ...formData, alergiaCual: e.target.value })}
                                      className="h-8 text-xs mt-2"
                                      placeholder="¿Alergias a qué?"
                                      disabled={creando}
                                    />
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Presenta alguna Discapacidad?</label>
                                  <Select
                                    value={formData.discapacidad}
                                    onValueChange={(v) => setFormData({ ...formData, discapacidad: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.discapacidad === "Sí" && (
                                    <div className="space-y-2 pt-2">
                                      <Select
                                        value={formData.discapacidadTipo}
                                        onValueChange={(v) => setFormData({ ...formData, discapacidadTipo: v })}
                                        disabled={creando}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo Discapacidad" /></SelectTrigger>
                                        <SelectContent>
                                          {TIPOS_DISCAPACIDAD.map((td) => (
                                            <SelectItem key={td} value={td}>{td}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {formData.discapacidadTipo === "Otro" && (
                                        <Input
                                          value={formData.discapacidadOtro}
                                          onChange={(e) => setFormData({ ...formData, discapacidadOtro: e.target.value })}
                                          className="h-8 text-xs"
                                          placeholder="Especificar"
                                          disabled={creando}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Trastorno Neurodesarrollo?</label>
                                  <Select
                                    value={formData.trastorno}
                                    onValueChange={(v) => setFormData({ ...formData, trastorno: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.trastorno === "Sí" && (
                                    <div className="space-y-2 pt-2">
                                      <Select
                                        value={formData.trastornoTipo}
                                        onValueChange={(v) => setFormData({ ...formData, trastornoTipo: v })}
                                        disabled={creando}
                                      >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo Trastorno" /></SelectTrigger>
                                        <SelectContent>
                                          {TIPOS_TRASTORNO.map((tt) => (
                                            <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {formData.trastornoTipo === "Otro" && (
                                        <Input
                                          value={formData.trastornoOtro}
                                          onChange={(e) => setFormData({ ...formData, trastornoOtro: e.target.value })}
                                          className="h-8 text-xs"
                                          placeholder="Especificar"
                                          disabled={creando}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2 bg-card p-3 rounded-lg border">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground block">¿Otra Condición Especial?</label>
                                  <Select
                                    value={formData.condicionEspecial}
                                    onValueChange={(v) => setFormData({ ...formData, condicionEspecial: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí</SelectItem>
                                      <SelectItem value="No">No</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {formData.condicionEspecial === "Sí" && (
                                    <Input
                                      value={formData.condicionEspecialCual}
                                      onChange={(e) => setFormData({ ...formData, condicionEspecialCual: e.target.value })}
                                      className="h-8 text-xs mt-2"
                                      placeholder="¿Cuál condición?"
                                      disabled={creando}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 6. COMPROMISO Y CONTACTO DE EMERGENCIA */}
                            <div className="space-y-4">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <HeartHandshake className="h-4 w-4" />
                                6. Compromiso Institucional y Contacto de Emergencia
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">¿Desea ser Voluntario?</label>
                                  <Select
                                    value={formData.deseaSerVoluntario}
                                    onValueChange={(v) => setFormData({ ...formData, deseaSerVoluntario: v })}
                                    disabled={creando}
                                  >
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Sí">Sí, deseo ser voluntario</SelectItem>
                                      <SelectItem value="No">No por el momento</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Nombre Contacto Emergencia</label>
                                  <Input
                                    value={formData.emergenciaNombre}
                                    onChange={(e) => setFormData({ ...formData, emergenciaNombre: e.target.value })}
                                    className="h-9 text-xs"
                                    placeholder="Nombre completo"
                                    disabled={creando}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Teléfono / Celular Emergencia</label>
                                  <Input
                                    value={formData.emergenciaNumero}
                                    onChange={(e) => setFormData({ ...formData, emergenciaNumero: e.target.value })}
                                    className="h-9 text-xs"
                                    placeholder="Número de contacto"
                                    disabled={creando}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold uppercase text-muted-foreground">Dirección de Emergencia</label>
                                  <Input
                                    value={formData.emergenciaDireccion}
                                    onChange={(e) => setFormData({ ...formData, emergenciaDireccion: e.target.value })}
                                    className="h-9 text-xs"
                                    placeholder="Dirección de residencia o contacto"
                                    disabled={creando}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 7. BENEFICIARIOS */}
                            <div className="space-y-3 pt-2">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <Users className="h-4 w-4" />
                                7. Beneficiarios (Hasta 5)
                              </p>
                              <div className="space-y-2">
                                {formData.beneficiarios?.map((ben, idx) => (
                                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-card p-3 rounded-lg border shadow-sm">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Beneficiario {idx + 1}: Nombre Completo</label>
                                      <Input
                                        value={ben.nombre}
                                        onChange={(e) => handleBeneficiarioChange(idx, "nombre", e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder={`Nombre Beneficiario ${idx + 1}`}
                                        disabled={creando}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Documento (NUIP / Cédula / TI)</label>
                                      <Input
                                        value={ben.nuip}
                                        onChange={(e) => handleBeneficiarioChange(idx, "nuip", e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Opcional"
                                        disabled={creando}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 8. MASCOTAS */}
                            <div className="space-y-3 pt-2">
                              <p className="text-xs font-black uppercase text-primary flex items-center gap-2 border-b border-primary/20 pb-2">
                                <PawPrint className="h-4 w-4" />
                                8. Mascotas (Plan Integra - Hasta 2)
                              </p>
                              <div className="space-y-2">
                                {formData.mascotas?.map((mascota, idx) => (
                                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-card p-3 rounded-lg border shadow-sm">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Nombre Mascota {idx + 1}</label>
                                      <Input
                                        value={mascota.nombre}
                                        onChange={(e) => handleMascotaChange(idx, "nombre", e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder={`Mascota ${idx + 1}`}
                                        disabled={creando}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Animal</label>
                                      <Input
                                        value={mascota.tipo}
                                        onChange={(e) => handleMascotaChange(idx, "tipo", e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Ej: Perro, Gato"
                                        disabled={creando}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground">Raza (Opcional)</label>
                                      <Input
                                        value={mascota.raza}
                                        onChange={(e) => handleMascotaChange(idx, "raza", e.target.value)}
                                        className="h-8 text-xs"
                                        placeholder="Raza"
                                        disabled={creando}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* ANOTACIONES DE MEMORANDO */}
                  <div className="pt-8 border-t">
                    <h3 className="text-sm font-bold text-destructive border-b pb-2 flex items-center gap-2 mb-4">
                      <AlertCircle className="w-4 h-4" /> Anotaciones de Memorando
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-4">Máximo tres anotaciones formales. Se visualizarán en el expediente.</p>

                    <div className="space-y-3">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Memorando {idx + 1}</label>
                          <Input
                            value={formData.memorandos?.[idx] || ""}
                            onChange={(e) => {
                              const newMemorandos = [...(formData.memorandos || [])];
                              newMemorandos[idx] = e.target.value;
                              setFormData({ ...formData, memorandos: newMemorandos });
                            }}
                            placeholder={idx === 0 ? "Ej. Llamado de atención por llegadas tarde..." : "Opcional"}
                            disabled={creando}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button type="button" variant="outline" onClick={() => { setView("table"); setIsEditing(false); setPermitirModificarNiup(false); setEditId(null); }} disabled={creando}>Cancelar</Button>
                    <Button type="submit" className="min-w-[150px]" disabled={creando}>
                      {creando ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {isEditing ? "Actualizar Personal" : "Crear Personal"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================================================== */}
        {/* VISTA: CONFIRMACIÓN (SUCCESS) */}
        {/* ================================================== */}
        {view === "success" && personalReciente && (
          <div className="max-w-2xl mx-auto py-12">
            <Card className="text-center border-success/20 shadow-lg shadow-success/5 overflow-hidden">
              <div className="bg-success/10 py-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-black text-success uppercase">Personal Registrado Exitosamente</h2>
                <p className="text-muted-foreground">Se han generado los accesos y credenciales.</p>
              </div>

              <CardContent className="p-8">
                <div className="bg-muted/30 border rounded-xl p-6 text-left grid grid-cols-2 gap-y-4 gap-x-8 mb-8">
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">Nombre</p><p className="font-medium text-sm">{personalReciente.nombre}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">NIUP</p><p className="font-medium text-sm">{personalReciente.documento}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">Cargo</p><p className="font-medium text-sm text-primary">{personalReciente.cargo} ({personalReciente.tipoPersonal})</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">Código Institucional</p><p className="font-medium text-sm">{personalReciente.codigoInstitucional}</p></div>
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">Estado</p><Badge className="bg-success text-white">ACTIVO</Badge></div>
                  <div><p className="text-xs text-muted-foreground uppercase font-bold">Afiliación</p><p className="font-medium text-sm">{personalReciente.afiliarAutomaticamente ? "✅ Activa (Indefinida)" : "❌ No requerida"}</p></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={() => generarCarnetPersonal(personalReciente)} className="h-12 w-full gap-2 text-base font-semibold shadow-md border border-black" style={{ backgroundColor: COLORS.azul }}>
                    <QrCode className="h-5 w-5" /> Descargar Carnet
                  </Button>
                  <Button onClick={() => generarCertificadoPersonal(personalReciente)} variant="outline" className="h-12 w-full gap-2 text-base font-semibold shadow-sm border-2" style={{ borderColor: COLORS.verde, color: COLORS.verde }}>
                    <FileText className="h-5 w-5" /> Descargar Certificado
                  </Button>
                  <Button onClick={() => setView("table")} variant="ghost" className="h-12 w-full gap-2 col-span-1 sm:col-span-2 mt-4 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" /> Volver al Directorio
                  </Button>
                  <Button onClick={resetForm} variant="ghost" className="h-12 w-full gap-2 col-span-1 sm:col-span-2 text-muted-foreground">
                    <UserPlus className="h-4 w-4" /> Ingresar Otro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* DIALOGO: EDITAR HORARIO */}
        <Dialog open={!!empleadoSeleccionado} onOpenChange={(open) => !open && setEmpleadoSeleccionado(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-primary">
                <CalendarDays className="h-6 w-6 text-primary" />
                Gestionar Horario Institucional
              </DialogTitle>
              <DialogDescription>
                Configure la jornada semanal, turnos y modalidad para <strong>{empleadoSeleccionado?.nombre}</strong> ({empleadoSeleccionado?.cargo || "Personal"}).
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col space-y-3 max-h-[60vh] overflow-y-auto pr-2 mt-2">
              {DIAS_SEMANA.map((dia) => {
                const diaInfo = horarioEdit[dia] || { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" };
                const mod = diaInfo.modalidad || "presencial";
                const isConHorario = !["libre", "confianza", "presencial_sin_horario", "teletrabajo_sin_horario"].includes(mod);

                return (
                  <div key={dia} className="flex flex-col xl:flex-row xl:items-center justify-between bg-card p-4 rounded-xl border shadow-sm gap-3 transition-colors hover:bg-muted/30">
                    <div className="w-full xl:w-28 font-black uppercase text-primary text-sm border-b xl:border-b-0 pb-1 xl:pb-0">
                      {dia}
                    </div>

                    <div className="w-full xl:w-56 shrink-0">
                      <Select
                        value={mod}
                        onValueChange={(v) => setHorarioEdit({
                          ...horarioEdit,
                          [dia]: { ...diaInfo, modalidad: v }
                        })}
                      >
                        <SelectTrigger className="bg-background h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="teletrabajo">Teletrabajo</SelectItem>
                          <SelectItem value="confianza">Empleado de Confianza</SelectItem>
                          <SelectItem value="presencial_sin_horario">Presencial sin Horario</SelectItem>
                          <SelectItem value="teletrabajo_sin_horario">Teletrabajo sin Horario</SelectItem>
                          <SelectItem value="libre">No Laboral (Libre)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 flex justify-end w-full">
                      {isConHorario ? (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-center w-full bg-muted/20 sm:bg-transparent p-2 sm:p-0 rounded-lg">
                          {/* Jornada 1 */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10">Ent 1</label>
                            <Input
                              type="time"
                              className="w-[95px] h-8 text-xs px-2 bg-background"
                              value={diaInfo.entrada1 || "08:00"}
                              onChange={(e) => setHorarioEdit({
                                ...horarioEdit,
                                [dia]: { ...diaInfo, entrada1: e.target.value }
                              })}
                            />
                            <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10 text-right sm:pl-2 border-l border-muted-foreground/20">Sal 1</label>
                            <Input
                              type="time"
                              className="w-[95px] h-8 text-xs px-2 bg-background"
                              value={diaInfo.salida1 || "12:00"}
                              onChange={(e) => setHorarioEdit({
                                ...horarioEdit,
                                [dia]: { ...diaInfo, salida1: e.target.value }
                              })}
                            />
                          </div>

                          {/* Jornada 2 */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start sm:pl-4 sm:border-l border-muted-foreground/20">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10">Ent 2</label>
                            <Input
                              type="time"
                              className="w-[95px] h-8 text-xs px-2 bg-background"
                              value={diaInfo.entrada2 || "14:00"}
                              onChange={(e) => setHorarioEdit({
                                ...horarioEdit,
                                [dia]: { ...diaInfo, entrada2: e.target.value }
                              })}
                            />
                            <label className="text-[10px] font-bold text-muted-foreground uppercase leading-none w-10 text-right sm:pl-2 border-l border-muted-foreground/20">Sal 2</label>
                            <Input
                              type="time"
                              className="w-[95px] h-8 text-xs px-2 bg-background"
                              value={diaInfo.salida2 || "18:00"}
                              onChange={(e) => setHorarioEdit({
                                ...horarioEdit,
                                [dia]: { ...diaInfo, salida2: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                      ) : mod === "confianza" ? (
                        <div className="w-full sm:w-auto text-center sm:text-right text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-md border border-purple-200 flex items-center justify-end gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-purple-600" /> Manejo y Confianza (Sin horario rígido)
                        </div>
                      ) : mod === "libre" ? (
                        <div className="w-full sm:w-auto text-center sm:text-right text-xs font-medium text-muted-foreground italic py-1.5">
                          Día no laboral (Libre)
                        </div>
                      ) : (
                        <div className="w-full sm:w-auto text-center sm:text-right text-xs font-medium text-muted-foreground italic py-1.5">
                          Sin horario fijo asignado
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setEmpleadoSeleccionado(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  setGuardandoHorario(true);
                  try {
                    const nuevoHorario = await actualizarModalidad(empleadoSeleccionado.id, horarioEdit);
                    setPersonalList((prev) =>
                      prev.map((p) =>
                        p.id === empleadoSeleccionado.id ? { ...p, horarioModalidad: nuevoHorario } : p
                      )
                    );
                    await registrarAuditoria({
                      user, userData,
                      accion: "Actualizar Horario",
                      documentoId: empleadoSeleccionado.id,
                      detalles: `Se actualizó horario semanal de ${empleadoSeleccionado.nombre}`
                    });
                    toast.success("Horario institucional actualizado y guardado correctamente");
                    setEmpleadoSeleccionado(null);
                    cargarDatos();
                  } catch (e) {
                    console.error("Error al guardar horario:", e);
                    toast.error("Error al guardar el horario");
                  } finally {
                    setGuardandoHorario(false);
                  }
                }}
                disabled={guardandoHorario}
              >
                {guardandoHorario ? <Spinner className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Guardar Horario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* ================================================== */}
      {/* MODAL: ¿Con o sin remuneración? */}
      <Dialog open={showRemuneracionModal} onOpenChange={setShowRemuneracionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Certificado Laboral
            </DialogTitle>
            <DialogDescription>
              ¿Desea incluir la remuneración en el certificado?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              Seleccione si el certificado debe indicar la remuneración mensual del trabajador o expedirse sin esa información.
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  setShowRemuneracionModal(false);
                  generarCertificadoPersonal(personaCertPendiente, true);
                }}
              >
                Con Remuneración
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowRemuneracionModal(false);
                  generarCertificadoPersonal(personaCertPendiente, false);
                }}
              >
                Sin Remuneración
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================================================== */}
      {/* MODAL: EXPEDIENTE INTEGRAL DEL COLABORADOR */}
      {/* ================================================== */}
      <Dialog open={!!empleadoExpediente} onOpenChange={(open) => { if (!open) setEmpleadoExpediente(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          {empleadoExpediente && (
            <div className="space-y-6">
              {/* Header con Info Principal */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
                {empleadoExpediente.foto ? (
                  <img src={empleadoExpediente.foto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-black text-foreground">{empleadoExpediente.nombre}</h3>
                    <Badge className={empleadoExpediente.usuarioData?.activo === false ? "bg-destructive text-white" : "bg-success text-white"}>
                      {empleadoExpediente.usuarioData?.activo === false ? "Inactivo / Bloqueado" : "Activo"}
                    </Badge>
                    <Badge variant="outline" className="uppercase text-xs font-bold text-primary border-primary/30">
                      {empleadoExpediente.usuarioData?.rol || empleadoExpediente.tipoPersonal}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-primary mt-0.5">{empleadoExpediente.cargo || "Sin cargo registrado"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                    <span><strong>Doc / NUIP:</strong> {empleadoExpediente.documento || "—"}</span>
                    <span><strong>RH:</strong> {empleadoExpediente.rh || "—"}</span>
                    <span><strong>Código:</strong> {empleadoExpediente.codigoInstitucional || "—"}</span>
                    <span><strong>Correo Inst:</strong> {empleadoExpediente.usuarioData?.correo || "—"}</span>
                    <span><strong>Teléfono:</strong> {empleadoExpediente.telefono || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Grid de Secciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* 1. Información Contractual y Laboral */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <Briefcase className="w-4 h-4" /> 1. Información Contractual
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground block">Modalidad:</span> <strong className="text-foreground">{empleadoExpediente.modalidadLaboral || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Días Teletrabajo:</span> <strong className="text-foreground">{empleadoExpediente.diasTeletrabajo || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Tipo Vinculación:</span> <strong className="text-foreground">{empleadoExpediente.tipoVinculacion || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Tipo Contrato:</span> <strong className="text-foreground">{empleadoExpediente.tipoContrato || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Fecha Ingreso:</span> <strong className="text-foreground">{empleadoExpediente.fechaIngreso || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Fecha Terminación:</span> <strong className="text-foreground">{empleadoExpediente.fechaTerminacion || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Salario / Remuneración:</span> <strong className="text-success font-bold">{empleadoExpediente.salario ? `$ ${empleadoExpediente.salario}` : "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Horas Semanales:</span> <strong className="text-foreground">{empleadoExpediente.horasSemanales || "—"}</strong></div>
                    <div className="col-span-2"><span className="text-muted-foreground block">Oficina / Asignación:</span> <strong className="text-foreground">{empleadoExpediente.oficinaContrata || "—"} ({empleadoExpediente.ciudadAsignacion || ""} - {empleadoExpediente.paisAsignacion || ""})</strong></div>
                    <div className="col-span-2"><span className="text-muted-foreground block">Dependencia Solicitante:</span> <strong className="text-foreground">{empleadoExpediente.dependenciaSolicita || "—"}</strong></div>
                  </div>
                </Card>

                {/* 2. Seguridad Social */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <ShieldCheck className="w-4 h-4" /> 2. Seguridad Social
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground block">EPS:</span> <strong className="text-foreground">{empleadoExpediente.eps || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Fondo Pensión:</span> <strong className="text-foreground">{empleadoExpediente.fondoPension || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Cesantías:</span> <strong className="text-foreground">{empleadoExpediente.cesantias || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Caja Compensación:</span> <strong className="text-foreground">{empleadoExpediente.cajaCompensacion || "—"}</strong></div>
                    <div className="col-span-2"><span className="text-muted-foreground block">ARL:</span> <strong className="text-foreground">{empleadoExpediente.arl || "POSITIVA ARL"}</strong></div>
                  </div>
                </Card>

                {/* 3. Perfil Demográfico y Nacimiento */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <Users className="w-4 h-4" /> 3. Perfil Demográfico
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground block">Fecha Nacimiento:</span> <strong className="text-foreground">{empleadoExpediente.fechaNacimiento || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Edad:</span> <strong className="text-foreground">{empleadoExpediente.edad ? `${empleadoExpediente.edad} años` : "—"}</strong></div>
                    <div><span className="text-muted-foreground block">País Nacimiento:</span> <strong className="text-foreground">{empleadoExpediente.paisNacimiento || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Lugar / Ciudad:</span> <strong className="text-foreground">{empleadoExpediente.lugarNacimiento || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Sexo:</span> <strong className="text-foreground">{empleadoExpediente.sexo || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Orientación Sexual:</span> <strong className="text-foreground">{empleadoExpediente.orientacionSexual === "Otro" ? empleadoExpediente.orientacionOtro : (empleadoExpediente.orientacionSexual || "—")}</strong></div>
                    <div><span className="text-muted-foreground block">Estrato:</span> <strong className="text-foreground">{empleadoExpediente.estrato || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Grupo Étnico:</span> <strong className="text-foreground">{empleadoExpediente.etnia || "—"}</strong></div>
                  </div>
                </Card>

                {/* 4. Contexto Social y Vulnerabilidad */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <ShieldAlert className="w-4 h-4" /> 4. Contexto Social
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground block">Sisbén:</span>
                      <strong className="text-foreground">
                        {empleadoExpediente.sisben === "Sí" ? `Sí (${empleadoExpediente.sisbenPuntaje || "Sin puntaje"})` : (empleadoExpediente.sisben || "No")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Víctima Conflicto:</span>
                      <strong className="text-foreground">
                        {empleadoExpediente.victimaConflicto === "Sí" ? `Sí - ${empleadoExpediente.victimaTipo || ""} (RUV: ${empleadoExpediente.victimaInscrito || "No"})` : (empleadoExpediente.victimaConflicto || "No")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Discriminación:</span>
                      <strong className="text-foreground">
                        {empleadoExpediente.discriminacion === "Sí" ? `Sí (${empleadoExpediente.discriminacionTipo || ""})` : (empleadoExpediente.discriminacion || "No")}
                      </strong>
                    </div>
                  </div>
                </Card>

                {/* 5. Formación Académica */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <GraduationCap className="w-4 h-4" /> 5. Formación Académica
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground block">Nivel:</span> <strong className="text-foreground">{empleadoExpediente.educacionNivel || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Semestre / Grado:</span> <strong className="text-foreground">{empleadoExpediente.educacionSemestre || "—"}</strong></div>
                    <div className="col-span-2"><span className="text-muted-foreground block">Carrera / Estudio:</span> <strong className="text-foreground">{empleadoExpediente.educacionEstudio || "—"}</strong></div>
                    <div className="col-span-2"><span className="text-muted-foreground block">Plantel:</span> <strong className="text-foreground">{empleadoExpediente.educacionPlantel || "—"}</strong></div>
                  </div>
                </Card>

                {/* 6. Perfil de Salud */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <HeartPulse className="w-4 h-4" /> 6. Perfil de Salud
                  </h4>
                  <div className="space-y-1.5">
                    <div><span className="text-muted-foreground block">Enfermedades:</span> <strong className="text-foreground">{empleadoExpediente.enfermedad === "Sí" ? `Sí: ${empleadoExpediente.enfermedadCual}` : "Ninguna"}</strong></div>
                    <div><span className="text-muted-foreground block">Alergias:</span> <strong className="text-foreground">{empleadoExpediente.alergia === "Sí" ? `Sí: ${empleadoExpediente.alergiaCual}` : "Ninguna"}</strong></div>
                    <div><span className="text-muted-foreground block">Discapacidad:</span> <strong className="text-foreground">{empleadoExpediente.discapacidad === "Sí" ? `Sí (${empleadoExpediente.discapacidadTipo || ""})` : "No"}</strong></div>
                    <div><span className="text-muted-foreground block">Trastorno Neurodesarrollo:</span> <strong className="text-foreground">{empleadoExpediente.trastorno === "Sí" ? `Sí (${empleadoExpediente.trastornoTipo || ""})` : "No"}</strong></div>
                    <div><span className="text-muted-foreground block">Condición Especial:</span> <strong className="text-foreground">{empleadoExpediente.condicionEspecial === "Sí" ? `Sí: ${empleadoExpediente.condicionEspecialCual}` : "No"}</strong></div>
                  </div>
                </Card>

                {/* 7. Contacto de Emergencia */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <HeartHandshake className="w-4 h-4" /> 7. Contacto de Emergencia
                  </h4>
                  <div className="space-y-2">
                    <div><span className="text-muted-foreground block">Nombre:</span> <strong className="text-foreground">{empleadoExpediente.emergenciaNombre || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Teléfono / Celular:</span> <strong className="text-foreground">{empleadoExpediente.emergenciaNumero || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">Dirección:</span> <strong className="text-foreground">{empleadoExpediente.emergenciaDireccion || "—"}</strong></div>
                    <div><span className="text-muted-foreground block">¿Desea ser Voluntario?:</span> <strong className="text-foreground">{empleadoExpediente.deseaSerVoluntario || "No"}</strong></div>
                  </div>
                </Card>

                {/* 8. Beneficiarios y Mascotas */}
                <Card className="p-4 space-y-3">
                  <h4 className="font-black uppercase text-primary flex items-center gap-2 border-b pb-2">
                    <PawPrint className="w-4 h-4" /> 8. Beneficiarios y Mascotas
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-muted-foreground font-bold block mb-1">Beneficiarios:</span>
                      {Array.isArray(empleadoExpediente.beneficiarios) && empleadoExpediente.beneficiarios.filter(b => b.nombre).length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-foreground">
                          {empleadoExpediente.beneficiarios.filter(b => b.nombre).map((b, idx) => (
                            <li key={idx}><strong>{b.nombre}</strong> {b.nuip ? `(NUIP: ${b.nuip})` : ""}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic">Sin beneficiarios registrados</span>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground font-bold block mb-1">Mascotas:</span>
                      {Array.isArray(empleadoExpediente.mascotas) && empleadoExpediente.mascotas.filter(m => m.nombre).length > 0 ? (
                        <ul className="list-disc list-inside space-y-0.5 text-foreground">
                          {empleadoExpediente.mascotas.filter(m => m.nombre).map((m, idx) => (
                            <li key={idx}><strong>{m.nombre}</strong> ({m.tipo}{m.raza ? ` - ${m.raza}` : ""})</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic">Sin mascotas registradas</span>
                      )}
                    </div>
                  </div>
                </Card>

              </div>

              {/* Botones de acción al pie del modal */}
              <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEmpleadoExpediente(null)}>
                  Cerrar Expediente
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const u = empleadoExpediente.usuarioData || { id: empleadoExpediente.id, nombre: empleadoExpediente.nombre, correo: empleadoExpediente.correo, rol: empleadoExpediente.tipoPersonal };
                      const exp = empleadoExpediente;
                      setEmpleadoExpediente(null);
                      abrirEdicion(u, exp);
                    }}
                    className="gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
                  >
                    <Pencil className="h-4 w-4" /> Editar Datos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generarCarnetPersonal(empleadoExpediente)}
                    className="gap-1.5 text-info border-info/30 hover:bg-info/10"
                  >
                    <QrCode className="h-4 w-4" /> Descargar Carnet
                  </Button>
                  <Button
                    onClick={() => solicitarCertificadoPersonal(empleadoExpediente)}
                    className="gap-1.5 bg-success hover:bg-success/90 text-white"
                  >
                    <FileText className="h-4 w-4" /> Certificado Laboral
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* TEMPLATES OCULTOS PARA GENERACIÓN SILENCIOSA */}
      {/* ================================================== */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}>
        {personalReciente && (
          <>
            {/* Template de Carnet de Personal */}
            <div
              id="hidden-carnet-personal"
              style={{ width: '380px', height: '620px', background: '#ffffff', position: 'relative', overflow: 'hidden', borderRadius: '0px', fontFamily: 'sans-serif', border: '1px solid #000000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}
            >
              {/* Top border segments */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '16px', display: 'flex' }}>
                <div style={{ flex: 1, backgroundColor: '#e5b77e' }} />
                <div style={{ flex: 1, backgroundColor: '#8d5d2d' }} />
                <div style={{ flex: 1, backgroundColor: '#f39c11' }} />
                <div style={{ flex: 1, backgroundColor: '#f8d49a' }} />
              </div>

              {/* Logo y Encabezado */}
              <div style={{ position: 'relative', zIndex: 10, paddingTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ padding: '0px', borderRadius: '9999px', marginBottom: '8px' }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '120px', height: '120px', borderRadius: '9999px', border: '1px solid #777' }} />
                </div>
                <h2 style={{ color: '#006cb5', fontWeight: 900, fontSize: '30px', margin: 0, letterSpacing: '-0.02em' }}>ISLA CASCAJAL</h2>
                <p style={{ color: '#f36f21', fontSize: '13px', fontWeight: 'bold', margin: '2px 0 0 0' }}>FUNDACIÓN</p>
              </div>

              {/* Foto de Perfil y Badge LÍDER */}
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ position: 'relative', width: '190px', height: '130px', overflow: 'hidden' }}>
                  {personalReciente.foto ? (
                    <div style={{ width: '100%', height: '100%', backgroundImage: `url(${personalReciente.foto})`, backgroundSize: 'cover', backgroundPosition: 'center 15%' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User style={{ width: '60px', height: '60px', color: '#94a3b8' }} />
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '-14px', position: 'relative', zIndex: 20, padding: '4px 32px', borderRadius: '6px', backgroundColor: '#006cb5' }}>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '16px', textTransform: 'uppercase' }}>LÍDER</span>
                </div>
              </div>

              {/* Información Personal */}
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
                <h3 style={{ fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: '#006cb5', margin: 0, lineHeight: 1.1, padding: '0 10px' }}>
                  {personalReciente.nombre}
                </h3>
                <p style={{ fontWeight: '900', fontSize: '14px', color: '#f36f21', marginTop: '4px', textTransform: 'uppercase', margin: '4px 0 0 0' }}>
                  {personalReciente.cargo}
                </p>

                <div style={{ marginTop: 'auto', marginBottom: '24px', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 24px', boxSizing: 'border-box' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '15px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#006cb5', margin: 0, textTransform: 'uppercase' }}>NUIP</p>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#f36f21', margin: 0 }}>{personalReciente.documento}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#006cb5', margin: 0, textTransform: 'uppercase' }}>RH</p>
                        <p style={{ fontSize: '14px', fontWeight: 900, color: '#f36f21', margin: 0, textTransform: 'uppercase' }}>{personalReciente.rh || "—"}</p>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 900, color: '#006cb5', margin: 0, textTransform: 'uppercase' }}>CÓDIGO INSTITUCIONAL</p>
                      <p style={{ fontSize: '14px', fontWeight: 900, color: '#f36f21', margin: 0 }}>{personalReciente.codigoInstitucional}</p>
                    </div>
                  </div>
                  
                  {/* Right Column (QR) */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: '8px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '4px', borderRadius: '8px', border: '2px solid #8d5d2d', flexShrink: 0, minWidth: '90px', minHeight: '90px' }}>
                      {qrPersonal ? (
                        <img src={qrPersonal} alt="QR" style={{ width: '82px', height: '82px', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ width: '82px', height: '82px' }} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Franjas de color inferiores */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '16px', display: 'flex' }}>
                <div style={{ flex: 1, backgroundColor: '#e5b77e' }} />
                <div style={{ flex: 1, backgroundColor: '#f39c11' }} />
                <div style={{ flex: 1, backgroundColor: '#8d5d2d' }} />
                <div style={{ flex: 1, backgroundColor: '#cc8332' }} />
              </div>
            </div>

            {/* Template de Certificado Laboral / Personal */}
            <div
              id="hidden-cert-personal"
              style={{ width: "800px", padding: "80px", background: "white", fontFamily: "'Times New Roman', serif", color: "#1a1a1a", lineHeight: "1.6", boxSizing: "border-box" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px", borderBottom: `2px solid ${COLORS.azul}`, paddingBottom: "15px" }}>
                <img src="/logo.png" alt="Logo" style={{ width: "90px", height: "90px", borderRadius: "50%" }} />
                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: "900", margin: 0, color: COLORS.azul }}>FUNDACIÓN ISLA CASCAJAL</h1>
                  <p style={{ fontSize: "10px", fontWeight: "bold", margin: 0, color: "#666", textTransform: "uppercase" }}>NIT: 900.248.351-0</p>
                </div>
              </div>

              <div style={{ fontSize: "16px", textAlign: "justify" }}>
                <p>La Fundación Isla Cascajal certifica que reconoce a:</p>

                <p style={{ fontSize: "20px", fontWeight: "900", textAlign: "center", margin: "25px 0", textTransform: "uppercase" }}>
                  {personalReciente.nombre}
                </p>

                <p>
                  con identificación número <strong>{personalReciente.documento}</strong>, y vinculación a nuestra institución bajo la modalidad de <strong>{personalReciente.tipoContrato || personalReciente.tipoVinculacion || "Contrato"}</strong> y con el código <strong>{personalReciente.codigoInstitucional}</strong>.
                </p>

                <p>
                  La orientación de sus funciones institucionales se asocian propiamente a las que corresponden al cargo de <strong>{personalReciente.cargo}</strong>.
                </p>

                <div style={{ marginTop: "30px", marginBottom: "30px", fontWeight: "bold" }}>
                  <p>FECHA DE INGRESO: {personalReciente.fechaIngreso}</p>
                  <p>TERMINACIÓN DEL CONTRATO: {personalReciente.fechaTerminacion || "No aplica"}</p>
                  <p>MOTIVO DE TERMINACIÓN: {personalReciente.motivoTerminacion || "No aplica"}</p>
                  {personalReciente.mostrarRemuneracion && (
                    <p>REMUNERACIÓN MENSUAL: {personalReciente.salario || "No especificado"}</p>
                  )}
                </div>

                <p style={{ marginTop: "30px" }}>
                  El presente documento se expide a solicitud de la parte interesada el día {fechaCertificado || new Date().toLocaleDateString("es-CO")}.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "80px" }}>
                <div>
                  <div style={{ width: "200px", borderBottom: "1px solid #000", marginBottom: "10px" }}></div>
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Área de Talento Humano</p>
                  <p style={{ margin: 0, fontSize: "12px" }}>Fundación Isla Cascajal</p>
                </div>
              </div>

              <div style={{ marginTop: "50px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                Documento electrónico Verificable con el código QR
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PersonalPage() {
  return (
    <ProtectedRoute allowedRoles={["superadmin", "recursos_humanos", "personal"]}>
      <TooltipProvider>
        <PersonalContent />
      </TooltipProvider>
    </ProtectedRoute>
  );
}
