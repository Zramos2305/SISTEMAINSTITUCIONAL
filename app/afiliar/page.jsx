"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, setDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { registrarAuditoria } from "@/lib/auditoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  IdCard,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplets,
  Camera,
  Download,
  CheckCircle2,
  QrCode
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import html2canvas from "html2canvas";

const VERIFICACION_BASE_URL = "https://sistema-verificacion.vercel.app/verificar?doc=";

// Colores Institucionales
const COLORS = {
  azul: "#05318a",
  verde: "#0e6235",
  amarillo: "#f3de4d",
  rojo: "#ce181b"
};

function generarCodigoAfiliado() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "FICONG-";
  for (let i = 0; i < 8; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

export default function AfiliarPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const carnetRef = useRef(null);

  const [formData, setFormData] = useState({
    codigo: generarCodigoAfiliado(),
    nombre: "",
    cedula: "",
    rh: "",
    fechaIngreso: new Date().toISOString().split("T")[0],
    telefono: "",
    correo: "",
    direccion: "",
    estado: "activo",
    cargo: "Afiliado",
    foto: null, // base64 o blob url
  });

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);

  // Generar QR en tiempo real cuando cambia el código
  useEffect(() => {
    const generateQR = async () => {
      try {
        const link = VERIFICACION_BASE_URL + formData.codigo;
        const url = await QRCode.toDataURL(link, {
          width: 150,
          margin: 1,
          color: {
            dark: COLORS.azul,
            light: "#ffffff",
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error("Error generating QR", err);
      }
    };
    generateQR();
  }, [formData.codigo]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("La foto es muy pesada (máx 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result);
        setFormData(prev => ({ ...prev, foto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.cedula || !formData.rh || !formData.telefono) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      // Verificar si ya existe el documento
      const q = query(collection(db, "afiliados"), where("cedula", "==", formData.cedula));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("Este número de documento ya está registrado como afiliado");
        setIsSaving(false);
        return;
      }

      await setDoc(doc(db, "afiliados", formData.codigo), {
        ...formData,
        creadoPor: user.uid,
        fechaCreacion: new Date().toISOString(),
      });

      await registrarAuditoria({
        user,
        userData,
        accion: "Nueva Afiliación",
        documentoId: formData.codigo,
        detalles: `Se afilió a ${formData.nombre} con el código ${formData.codigo}`
      });

      toast.success("Afiliación guardada correctamente");

      // Limpiar formulario o redirigir
      setFormData({
        codigo: generarCodigoAfiliado(),
        nombre: "",
        cedula: "",
        rh: "",
        fechaIngreso: new Date().toISOString().split("T")[0],
        telefono: "",
        correo: "",
        direccion: "",
        estado: "activo",
        cargo: "Afiliado",
        foto: null,
      });
      setFotoPreview(null);

    } catch (err) {
      console.error(err);
      toast.error("Error al guardar la afiliación");
    } finally {
      setIsSaving(false);
    }
  };

  const descargarCarnet = async () => {
    if (!carnetRef.current) return;
    try {
      const canvas = await html2canvas(carnetRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement("a");
      link.download = `Carnet_${formData.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Carnet descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar la imagen del carnet");
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30 pb-10">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="font-semibold text-foreground">Nueva Afiliación</h1>
              <p className="text-xs text-muted-foreground">Sistema Institucional de Afiliados</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Formulario */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Datos del Afiliado</CardTitle>
              <CardDescription>Complete la información para generar el carnet institucional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Código Institucional</FieldLabel>
                  <Input value={formData.codigo} readOnly className="bg-muted font-mono font-bold text-primary" />
                </Field>
                <Field>
                  <FieldLabel>Estado</FieldLabel>
                  <Select value={formData.estado} onValueChange={(v) => handleInputChange("estado", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Nombre Completo</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Escriba el nombre completo"
                    className="pl-10"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange("nombre", e.target.value)}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Cédula / Documento</FieldLabel>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Número de identidad"
                      className="pl-10"
                      value={formData.cedula}
                      onChange={(e) => handleInputChange("cedula", e.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Grupo Sanguíneo RH</FieldLabel>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                    <Input
                      placeholder="Ej: O+"
                      className="pl-10 uppercase"
                      value={formData.rh}
                      onChange={(e) => handleInputChange("rh", e.target.value.toUpperCase())}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Fecha de Afiliación</FieldLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      className="pl-10"
                      value={formData.fechaIngreso}
                      onChange={(e) => handleInputChange("fechaIngreso", e.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Teléfono</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Número de celular"
                      className="pl-10"
                      value={formData.telefono}
                      onChange={(e) => handleInputChange("telefono", e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Correo Electrónico</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="pl-10"
                      value={formData.correo}
                      onChange={(e) => handleInputChange("correo", e.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Dirección</FieldLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Dirección de residencia"
                      className="pl-10"
                      value={formData.direccion}
                      onChange={(e) => handleInputChange("direccion", e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <Field>
                <FieldLabel>Foto del Afiliado</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted border-2 border-dashed border-primary/20 flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-all">
                    {fotoPreview ? (
                      <Image src={fotoPreview} alt="Preview" fill className="object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFotoChange}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Click en el recuadro para subir foto.</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Preferiblemente fondo blanco y buena iluminación.</p>
                  </div>
                </div>
              </Field>

              <div className="pt-4 flex gap-3">
                <Button
                  className="flex-1 h-12 text-base font-bold shadow-md shadow-primary/20"
                  onClick={handleGuardar}
                  disabled={isSaving}
                >
                  {isSaving ? <Spinner className="mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  GUARDAR AFILIACIÓN
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-6 border-2"
                  onClick={descargarCarnet}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Carnet */}
          <div className="sticky top-24">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <QrCode className="h-4 w-4" /> Vista Previa del Carnet
            </h3>

            <div
              ref={carnetRef}
              className="relative w-[380px] h-[580px] bg-white rounded-[2rem] shadow-2xl overflow-hidden mx-auto border"
              style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
            >
              {/* Decoración Superior */}
              <div className="absolute top-0 left-0 w-full h-[180px] overflow-hidden">
                <div
                  className="absolute -top-10 -left-10 w-[120%] h-[120%] rotate-[15deg]"
                  style={{ background: `linear-gradient(135deg, ${COLORS.azul} 0%, ${COLORS.verde} 100%)` }}
                />
                <div
                  className="absolute top-0 right-0 w-1/3 h-full"
                  style={{ backgroundColor: COLORS.amarillo, opacity: 0.2, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}
                />
              </div>

              {/* Logo y Header */}
              <div className="relative z-10 pt-8 px-8 flex flex-col items-center">
                <div className="bg-white p-2 rounded-full shadow-lg mb-3">
                  <Image src="/logo.png" alt="Logo" width={60} height={60} className="rounded-full" />
                </div>
                <h2 className="text-white font-black text-2xl tracking-tighter leading-none">ISLA CASCAJAL</h2>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Fundación</p>
              </div>

              {/* Foto de Perfil */}
              <div className="relative z-10 flex flex-col items-center mt-6">
                <div
                  className="relative w-40 h-40 rounded-3xl border-[6px] border-white shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#f1f5f9" }}
                >
                  {fotoPreview ? (
                    <Image src={fotoPreview} alt="Foto" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: "#94a3b8" }}>
                      <User size={80} />
                    </div>
                  )}
                </div>

                {/* Badge AFILIADO */}
                <div
                  className="mt-[-20px] relative z-20 px-8 py-1.5 rounded-full shadow-lg border-2 border-white"
                  style={{ backgroundColor: COLORS.rojo }}
                >
                  <span className="text-white font-black text-sm tracking-widest uppercase italic">AFILIADO</span>
                </div>
              </div>

              {/* Información Personal */}
              <div className="mt-4 px-10 flex flex-col items-center text-center">
                <h3 className="text-xl font-black leading-tight uppercase line-clamp-2 w-full" style={{ color: "#1e293b" }}>
                  {formData.nombre || "NOMBRE COMPLETO"}
                </h3>
                <p className="font-bold text-xs mt-1" style={{ color: "#64748b" }}>
                  C.C. {formData.cedula || "XXXXXXXX"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 w-full">
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase" style={{ color: "#94a3b8" }}>Código</p>
                    <p className="text-sm font-black font-mono tracking-tighter truncate" style={{ color: "#334155" }}>{formData.codigo}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase" style={{ color: "#94a3b8" }}>RH</p>
                    <p className="text-sm font-black uppercase" style={{ color: "#334155" }}>{formData.rh || "—"}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase" style={{ color: "#94a3b8" }}>Fecha Ingreso</p>
                    <p className="text-sm font-black" style={{ color: "#334155" }}>{formData.fechaIngreso.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-black uppercase" style={{ color: "#94a3b8" }}>Cargo</p>
                    <p className="text-sm font-black uppercase line-clamp-1" style={{ color: "#334155" }}>{formData.cargo}</p>
                  </div>
                </div>
              </div>

              {/* QR y Footer */}
              <div className="absolute bottom-0 left-0 w-full pt-4 pb-6 pl-10 pr-6 flex items-end justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-black" style={{ color: COLORS.azul }}>@fundacionislacascajal</p>
                  <p className="text-[8px] font-bold" style={{ color: "#94a3b8" }}>www.fundacionislacascajal.org</p>
                </div>

                <div className="bg-white p-1 rounded-lg border-2" style={{ borderColor: COLORS.azul }}>
                  {qrDataUrl && (
                    <Image src={qrDataUrl} alt="QR" width={70} height={70} />
                  )}
                </div>
              </div>

              {/* Franjas de color decorativas en el fondo inferior */}
              <div className="absolute bottom-0 right-0 w-full h-1.5 flex">
                <div className="flex-1" style={{ backgroundColor: COLORS.azul }} />
                <div className="flex-1" style={{ backgroundColor: COLORS.verde }} />
                <div className="flex-1" style={{ backgroundColor: COLORS.amarillo }} />
                <div className="flex-1" style={{ backgroundColor: COLORS.rojo }} />
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4 italic">
              * El carnet se genera automáticamente mientras completas el formulario.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
