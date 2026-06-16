"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { collection, doc, setDoc, query, where, getDocs, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { registrarAuditoria } from "@/lib/auditoria";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProtectedRoute from "@/components/protected-route";
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
import { ArrowLeft, Eye, FileCheck, QrCode, Download, ExternalLink, User, IdCard, Calendar, Award, PenTool, Upload } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const getVerificacionBaseUrl = () => `${window.location.origin}/verificar?doc=`;

// Función auxiliar para generar un código alfanumérico aleatorio (ejemplo: FICONG-4F8A0X1P)
function generarCodigo() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "FICONG-";
  for (let i = 0; i < 8; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// Componente de Generar: Se encarga de la captura de datos y subida a Firebase
function GenerarContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    nombre: "",
    cedula: "",
    tipo: "",
    evento: "",
    descripcion: "",
    duracion: "",
    oficina: "",
    dependencia: "",
    fecha: (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    })(),
  });
  const [isCreating, setIsCreating] = useState(false);
  const [documentoCreado, setDocumentoCreado] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Estados del Módulo Redactar Oficial
  const [modalRedactarOpen, setModalRedactarOpen] = useState(false);
  const [contenidoRedactado, setContenidoRedactado] = useState("");
  const [firmaImagen, setFirmaImagen] = useState(null);
  const [isGenerandoOficial, setIsGenerandoOficial] = useState(false);

  const handleFirmaUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFirmaImagen(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cuando el usuario modifica un input en el formulario, actualizamos el respectivo estado
  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "oficina") {
        newData.dependencia = "";
      }
      return newData;
    });
    setDocumentoCreado(null);
    setMostrarPreview(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tipoUrl = params.get("tipo");
      if (tipoUrl && tipoUrl !== "afiliado") {
        setFormData(prev => ({ ...prev, tipo: tipoUrl }));
      }
    }
  }, []);

  const isFormValid = () => {
    if (!formData.nombre || !formData.cedula || !formData.tipo || !formData.fecha || !formData.oficina || !formData.dependencia) return false;
    if (formData.tipo === "certificado" && (!formData.evento || !formData.descripcion)) return false;
    if (formData.tipo === "documento" && !formData.descripcion) return false;
    return true;
  };

  const handlePreview = () => {
    if (!isFormValid()) {
      toast.error("Por favor, completa todos los campos requeridos");
      return;
    }
    setMostrarPreview(true);
  };

  // Ejecuta la creación del registro y lo guarda en la base de datos Firestore
  const handleCrear = async () => {
    if (!isFormValid()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsCreating(true);

    try {
      if (formData.tipo === "afiliado") {
        const q = query(
          collection(getFirestore(app), "documentos"),
          where("cedula", "==", formData.cedula),
          where("tipo", "==", "afiliado")
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          toast.error("Esta persona ya está afiliada");
          setIsCreating(false);
          return;
        }
      }

      const codigo = generarCodigo();
      const link = getVerificacionBaseUrl() + codigo;

      let fechaCreacion = new Date();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (formData.fecha && formData.fecha !== todayStr) {
        const [year, month, day] = formData.fecha.split('-');
        fechaCreacion = new Date(year, month - 1, day, 12, 0, 0);
      }

      let fechaExpiracion = null;

      if (formData.tipo === "afiliado" && formData.duracion) {
        fechaExpiracion = new Date(fechaCreacion);
        if (formData.duracion === "6_meses") {
          fechaExpiracion.setMonth(fechaExpiracion.getMonth() + 6);
        } else if (formData.duracion === "1_ano") {
          fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1);
        }
      }

      await setDoc(doc(getFirestore(app), "documentos", codigo), {
        nombre: formData.nombre.trim(),
        cedula: formData.cedula.trim(),
        tipo: formData.tipo,
        oficina: formData.oficina,
        dependencia: formData.dependencia,
        evento: formData.tipo === "certificado" ? formData.evento : null,
        descripcion: (formData.tipo === "certificado" || formData.tipo === "documento") ? formData.descripcion.trim() : null,
        estado: "activo",
        fecha: fechaCreacion.toISOString(),
      });

      await registrarAuditoria({
        user,
        userData,
        accion: "Generar Documento",
        documentoId: codigo,
        detalles: `Creación de ${formData.tipo} para ${formData.nombre} (${formData.cedula})`
      });

      // Crea en paralelo un código QR visual con la librería qrcode
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 200,
        margin: 2,
        color: {
          dark: "#1e3a5f",
          light: "#ffffff",
        },
      });

      setDocumentoCreado({ codigo, link, qrDataUrl });
      toast.success("Documento creado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Error al crear el documento");
    } finally {
      setIsCreating(false);
    }
  };

  // Automatiza la descarga del código QR una vez se generó el registro con éxito
  const handleDescargarQR = () => {
    if (!documentoCreado) return;
    const link = document.createElement("a");
    link.href = documentoCreado.qrDataUrl;
    link.download = `QR_${documentoCreado.codigo}.png`;
    link.click();
    toast.success("QR descargado");
  };

  // Motor Oficial: Crea el PDF, lo sube al Storage y lo archiva en BD
  const handleRedactarYGuardar = async () => {
    if (!isFormValid() || !contenidoRedactado) {
      toast.error("Debes completar el formulario y redactar el documento");
      return;
    }

    setIsGenerandoOficial(true);

    try {
      if (formData.tipo === "afiliado") {
        toast.error("Los afiliados no usan el redactor oficial");
        setIsGenerandoOficial(false);
        return;
      }

      const codigo = generarCodigo();
      const link = getVerificacionBaseUrl() + codigo;

      // 1. Generar QR Code
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 150, margin: 1, color: { dark: "#1e3a5f", light: "#ffffff" },
      });

      // 2. Dibujar el PDF Oficial (Sin compress:true para evitar corrupción de PNGs)
      const docPdf = new jsPDF({ format: 'letter', unit: 'mm' });
      const pageWidth = docPdf.internal.pageSize.getWidth();
      const pageHeight = docPdf.internal.pageSize.getHeight();
      
      // Cargar Membrete de fondo (Buscando versión JPG externa más ligera)
      let membreteBase64 = null;
      try {
        // Intentar primero con la versión JPG optimizada
        let response = await fetch('/membrete.jpg');
        
        // Fallback al PNG original si no encuentran el JPG
        if (!response.ok) {
          response = await fetch('/MEMBRETE.png');
        }

        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          membreteBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn("No se encontró membrete.jpg o MEMBRETE.png en public/", e);
      }

      // Dibujar fondo si existe (dejando que jsPDF detecte el formato automáticamente de la cadena base64)
      if (membreteBase64) {
        // Al quitar el "PNG" o "JPEG", jsPDF lo deduce del base64 (data:image/jpeg;base64,...)
        docPdf.addImage(membreteBase64, undefined, 0, 0, pageWidth, pageHeight);
      } else {
        docPdf.setFontSize(22);
        docPdf.setTextColor(30, 58, 95);
        docPdf.text("FUNDACIÓN ISLA CASCAJAL", pageWidth / 2, 30, { align: "center" });
      }

      // Dibujar QR en el cuadro superior derecho
      docPdf.addImage(qrDataUrl, "PNG", pageWidth - 52, 6, 24, 24);

      // Cuerpo Redactado Clásico (Texto Plano)
      docPdf.setFontSize(11);
      docPdf.setTextColor(30, 30, 30);
      const lineasTexto = docPdf.splitTextToSize(contenidoRedactado, pageWidth - 45); 
      docPdf.text(lineasTexto, 20, 70);

      // Pie: Firma y Dependencia
      if (firmaImagen) {
        // Movido a la derecha, arriba del pie de página
        const firmX = pageWidth - 65; 
        docPdf.addImage(firmaImagen, undefined, firmX - 22, pageHeight - 65, 44, 22, "firma", "FAST");
        
        docPdf.setDrawColor(100, 100, 100);
        docPdf.line(firmX - 25, pageHeight - 40, firmX + 25, pageHeight - 40);
        
        docPdf.setFontSize(9);
        docPdf.setFont("helvetica", "bold");
        docPdf.text("Firma Autorizada", firmX, pageHeight - 35, { align: "center" });
        
        docPdf.setFont("helvetica", "normal");
        docPdf.setFontSize(8);
        docPdf.setTextColor(80, 80, 80);
        if (formData.oficina) docPdf.text(formData.oficina, firmX, pageHeight - 31, { align: "center" });
        if (formData.dependencia) docPdf.text(formData.dependencia, firmX, pageHeight - 27, { align: "center" });
      }

      // 3. Subir el Archivo PDF al Storage
      const pdfBlob = docPdf.output('blob');
      const anioActual = new Date().getFullYear();
      let storageRef, pdfUrl;
      try {
        storageRef = ref(getStorage(app), `documentos_oficiales/${anioActual}/${codigo}.pdf`);
        await uploadBytes(storageRef, pdfBlob);
        pdfUrl = await getDownloadURL(storageRef);
      } catch (eStorage) {
        toast.error("Error Storage: " + eStorage.message);
        throw eStorage;
      }

      // 4. Registrar en Base de Datos
      let fechaCreacion = new Date();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (formData.fecha && formData.fecha !== todayStr) {
        const [year, month, day] = formData.fecha.split('-');
        fechaCreacion = new Date(year, month - 1, day, 12, 0, 0);
      }

      try {
        await setDoc(doc(getFirestore(app), "documentos", codigo), {
          nombre: formData.nombre?.trim() || "",
          cedula: formData.cedula?.trim() || "",
          tipo: formData.tipo,
          oficina: formData.oficina || "",
          dependencia: formData.dependencia || "",
          evento: formData.evento || "",
          descripcion: formData.descripcion?.trim() || "",
          estado: "activo",
          fecha: fechaCreacion.toISOString(),
          pdfUrl: pdfUrl
        });
      } catch (eDb) {
        toast.error("Error BD: " + eDb.message);
        throw eDb;
      }

      await registrarAuditoria({
        user, userData,
        accion: "Generar y Archivar Documento PDF",
        documentoId: codigo,
        detalles: `Redacción oficial archivada para ${formData.nombre} (${codigo})`
      });

      setDocumentoCreado({ codigo, link, qrDataUrl, pdfUrl });
      toast.success("Documento blindado, archivado en nube y generado con éxito");
      setModalRedactarOpen(false);

    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error guardando el archivo en la nube");
    } finally {
      setIsGenerandoOficial(false);
    }
  };

  const handleNuevoDocumento = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setFormData({ nombre: "", cedula: "", tipo: "", evento: "", descripcion: "", duracion: "", fecha: todayStr, oficina: "", dependencia: "" });
    setDocumentoCreado(null);
    setMostrarPreview(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-indigo-900">
                {formData.tipo === "certificado" ? "Generar Certificado" : "Generar Documento"}
              </h1>
              <p className="text-xs text-muted-foreground">Fundación Isla Cascajal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {documentoCreado ? (
          <Card className="text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <FileCheck className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-success">Documento Creado</CardTitle>
              <CardDescription>
                El documento ha sido registrado exitosamente en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="inline-block p-4 bg-muted rounded-xl">
                <Image
                  src={documentoCreado.qrDataUrl}
                  alt="Código QR"
                  width={200}
                  height={200}
                  className="mx-auto"
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Código del documento</p>
                <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
                  {documentoCreado.codigo}
                </Badge>
              </div>
              <div className="flex flex-col gap-3 justify-center max-w-sm mx-auto">
                {documentoCreado.pdfUrl && (
                  <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700 w-full shadow-lg" asChild>
                    <a href={documentoCreado.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar PDF Oficial
                    </a>
                  </Button>
                )}
                
                <div className="flex gap-2">
                  <Button onClick={handleDescargarQR} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    QR
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={`${documentoCreado.link}&source=generar`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Verificar
                    </a>
                  </Button>
                </div>
                
                <Button onClick={handleNuevoDocumento} variant="secondary" className="w-full">
                  <QrCode className="h-4 w-4 mr-2" />
                  Crear Otro
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Documento</CardTitle>
                <CardDescription>
                  Complete los datos para generar un nuevo documento verificable
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field>
                  <FieldLabel htmlFor="nombre">Nombre completo</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nombre"
                      placeholder="Ingrese el nombre completo"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange("nombre", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="cedula">NUIP</FieldLabel>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cedula"
                      placeholder="Número de identificación"
                      value={formData.cedula}
                      onChange={(e) => handleInputChange("cedula", e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="fecha">Fecha de emisión</FieldLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => handleInputChange("fecha", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        handleInputChange("fecha", todayStr);
                      }}
                    >
                      Hoy
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="oficina">Oficina que emite</FieldLabel>
                  <Select
                    value={formData.oficina}
                    onValueChange={(value) => handleInputChange("oficina", value)}
                  >
                    <SelectTrigger id="oficina">
                      <SelectValue placeholder="Seleccione la oficina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sede Principal">Sede Principal</SelectItem>
                      <SelectItem value="Subdirección Regional Pacífico Norte">Subdirección Regional Pacífico Norte</SelectItem>
                      <SelectItem value="Subdirección Regional Pacífico Sur">Subdirección Regional Pacífico Sur</SelectItem>
                      <SelectItem value="Subdirección Regional Eje Cafetero">Subdirección Regional Eje Cafetero</SelectItem>
                      <SelectItem value="Subdirección Regional Sur Central">Subdirección Regional Sur Central</SelectItem>
                      <SelectItem value="Subdirección Regional Nor Caribe">Subdirección Regional Nor Caribe</SelectItem>
                      <SelectItem value="Subdirección Regional Sur Caribe">Subdirección Regional Sur Caribe</SelectItem>
                      <SelectItem value="Subdirección Regional Nor Oriente">Subdirección Regional Nor Oriente</SelectItem>
                      <SelectItem value="Subdirección Regional Sur Oriente">Subdirección Regional Sur Oriente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="dependencia">Dependencia que emite</FieldLabel>
                  <Select
                    value={formData.dependencia}
                    onValueChange={(value) => handleInputChange("dependencia", value)}
                    disabled={!formData.oficina}
                  >
                    <SelectTrigger id="dependencia">
                      <SelectValue placeholder="Seleccione la dependencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.oficina === "Sede Principal" ? (
                        <>
                          <SelectItem value="Representante Legal">Representante Legal</SelectItem>
                          <SelectItem value="Dirección ejecutiva">Dirección Ejecutiva</SelectItem>
                          <SelectItem value="Dirección administrativa">Dirección Administrativa</SelectItem>
                          <SelectItem value="Revisaría fiscal">Revisaría Fiscal</SelectItem>
                          <SelectItem value="Secretaría general">Secretaría General</SelectItem>
                          <SelectItem value="Subdireccion de áreas">Subdireccion de Áreas</SelectItem>
                          <SelectItem value="Subdireccion de turismo, las artes,las culturas y los saberes">Subdireccion de Turismo, las Artes, las Culturas y los Saberes</SelectItem>
                          <SelectItem value="Subdireccion de extensión y cosmovision etnoeducativa">Subdireccion de Extensión y Cosmovision Etnoeducativa</SelectItem>
                          <SelectItem value="Subdireccion de recreación, deporte,salud y ambiente saludable">Subdireccion de Recreación, Deporte, Salud y Ambiente Saludable</SelectItem>
                          <SelectItem value="Subdireccion de bienestar social, inclusión y equidad">Subdireccion de Bienestar Social, Inclusión y Equidad</SelectItem>
                          <SelectItem value="Coordinación jurídica">Coordinación Jurídica</SelectItem>
                          <SelectItem value="Coordinación comercial">Coordinación Comercial</SelectItem>
                          <SelectItem value="Coordinación de plantación y calidad">Coordinación de Planeación y Calidad</SelectItem>
                          <SelectItem value="Coordinación de proyectos e internacionalización">Coordinación de Proyectos e Internacionalización</SelectItem>
                          <SelectItem value="Coordinación de operaciones financieras">Coordinación de Operaciones Financieras</SelectItem>
                          <SelectItem value="Coordinación del talento humano">Coordinación del Talento Humano</SelectItem>
                          <SelectItem value="Coordinación de comunicaciones y canales digitales">Coordinación de Comunicaciones y Canales Digitales</SelectItem>
                          <SelectItem value="Área de operaciones logísticas">Área de Operaciones Logísticas</SelectItem>
                          <SelectItem value="Área de tesorería">Área de Tesorería</SelectItem>
                          <SelectItem value="Área de contabilidad">Área de Contabilidad</SelectItem>
                          <SelectItem value="Área de práctica y pasantías">Área de Prácticas y Pasantías</SelectItem>
                        </>
                      ) : formData.oficina ? (
                        <>
                          <SelectItem value="Dirección Regional">Dirección Regional</SelectItem>
                          <SelectItem value="Coordinación Jurídica">Coordinación Jurídica</SelectItem>
                          <SelectItem value="Coordinación Comercial">Coordinación Comercial</SelectItem>
                          <SelectItem value="Coordinación de Planeación y Calidad">Coordinación de Planeación y Calidad</SelectItem>
                          <SelectItem value="Coordinación de Proyectos e Internacionalización">Coordinación de Proyectos e Internacionalización</SelectItem>
                          <SelectItem value="Coordinación de Operaciones Financieras">Coordinación de Operaciones Financieras</SelectItem>
                          <SelectItem value="Coordinación del Talento Humano">Coordinación del Talento Humano</SelectItem>
                          <SelectItem value="Coordinación de Comunicaciones y Canales Digitales">Coordinación de Comunicaciones y Canales Digitales</SelectItem>
                          <SelectItem value="Área de Operaciones Logísticas">Área de Operaciones Logísticas</SelectItem>
                          <SelectItem value="Área de Tesorería">Área de Tesorería</SelectItem>
                          <SelectItem value="Área de Contabilidad">Área de Contabilidad</SelectItem>
                          <SelectItem value="Área de Práctica y Pasantías">Área de Práctica y Pasantías</SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tipo">Tipo de documento</FieldLabel>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => handleInputChange("tipo", value)}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Seleccione el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certificado">Certificado</SelectItem>
                      <SelectItem value="documento">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>


                {formData.tipo === "certificado" && (
                  <Field>
                    <FieldLabel htmlFor="evento">Asunto</FieldLabel>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="evento"
                        placeholder="Ingrese el asunto del certificado"
                        value={formData.evento}
                        onChange={(e) => handleInputChange("evento", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                )}

                {(formData.tipo === "certificado" || formData.tipo === "documento") && (
                  <Field>
                    <FieldLabel htmlFor="descripcion">
                      {formData.tipo === "documento" ? "Descripción" : "Descripción del asunto"}
                    </FieldLabel>
                    <div className="relative">
                      <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="descripcion"
                        placeholder={formData.tipo === "certificado" ? "Detalle adicional del asunto" : "Breve descripción del documento"}
                        value={formData.descripcion}
                        onChange={(e) => handleInputChange("descripcion", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </Field>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={!isFormValid()}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Previsualizar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCrear}
                    disabled={!isFormValid() || isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Spinner className="mr-2" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        Generar Normal
                      </>
                    )}
                  </Button>

                  {/* NUEVO BOTON REDACTAR OFICIAL */}
                  {formData.tipo !== "afiliado" && (
                    <Dialog open={modalRedactarOpen} onOpenChange={setModalRedactarOpen}>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          disabled={!isFormValid() || isCreating}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all hover:scale-105"
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Redactar Oficial
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col bg-slate-50">
                        <DialogHeader>
                          <DialogTitle className="text-2xl text-indigo-900 flex items-center gap-2">
                            <PenTool className="h-5 w-5 text-indigo-600" />
                            Notaría Digital
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            Estudio de redacción para generar documentos oficiales blindados con QR y firma.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                          <p className="text-sm text-slate-500 bg-indigo-50 p-3 rounded border border-indigo-100">
                            <strong>Instrucciones:</strong> Redacta el contenido de la carta o certificado. El sistema creará un documento blindado, agregará el logo, NIT de la Fundación, tu firma al final y el Código QR de validación.
                          </p>
                          <Textarea 
                            className="min-h-[350px] text-base resize-none shadow-inner bg-white"
                            placeholder="Por medio de la presente certificamos que..."
                            value={contenidoRedactado}
                            onChange={(e) => setContenidoRedactado(e.target.value)}
                          />
                          <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 flex flex-col items-center justify-center bg-white relative transition-colors hover:bg-indigo-50/50">
                            <Upload className="h-8 w-8 text-indigo-300 mb-2" />
                            <span className="text-sm font-bold text-slate-700">Adjuntar Firma Digital</span>
                            <span className="text-xs text-slate-500 mt-1">Formato PNG o JPG. Aparecerá en la esquina inferior derecha.</span>
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleFirmaUpload}
                            />
                            {firmaImagen && (
                              <div className="mt-4 p-2 bg-white rounded shadow-sm border border-slate-200 relative z-10 pointer-events-none">
                                <img src={firmaImagen} alt="Firma" width="140" height="70" className="object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                        <DialogFooter className="bg-white p-4 border-t mt-auto -mx-6 -mb-6">
                          <Button variant="ghost" onClick={() => setModalRedactarOpen(false)}>Cancelar</Button>
                          <Button 
                            onClick={handleRedactarYGuardar} 
                            disabled={isGenerandoOficial || !contenidoRedactado}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                          >
                            {isGenerandoOficial ? <Spinner className="mr-2" /> : <FileCheck className="mr-2 h-5 w-5" />}
                            Sellar, Generar y Archivar PDF
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>

            {mostrarPreview && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Vista Previa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formData.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.cedula}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{(() => {
                        if (!formData.fecha) return "";
                        const [y, m, d] = formData.fecha.split("-");
                        return `${d}/${m}/${y}`;
                      })()}</span>
                    </div>
                    {formData.oficina && (
                      <div className="flex items-center gap-3">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Oficina: {formData.oficina}</span>
                      </div>
                    )}
                    {formData.dependencia && (
                      <div className="flex items-center gap-3">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Dependencia: {formData.dependencia}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <Badge
                        variant={formData.tipo === "certificado" ? "default" : formData.tipo === "documento" ? "outline" : "secondary"}
                        className={
                          formData.tipo === "certificado"
                            ? "bg-success/10 text-success border-success/20"
                            : formData.tipo === "documento"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-info/10 text-info border-info/20"
                        }
                      >
                        {formData.tipo === "certificado" ? "Certificado" : formData.tipo === "documento" ? "Documento" : "Afiliado"}
                      </Badge>
                    </div>
                    {formData.tipo === "certificado" && formData.evento && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formData.evento}</span>
                      </div>
                    )}
                    {formData.tipo === "afiliado" && formData.duracion && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Afiliación por {formData.duracion === "6_meses" ? "6 Meses" : "1 Año"}</span>
                      </div>
                    )}
                    {(formData.tipo === "certificado" || formData.tipo === "documento") && formData.descripcion && (
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{formData.descripcion}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function GenerarPage() {
  return (
    <ProtectedRoute allowedRoles={["superadmin", "recursos_humanos", "personal"]}>
      <GenerarContent />
    </ProtectedRoute>
  );
}
