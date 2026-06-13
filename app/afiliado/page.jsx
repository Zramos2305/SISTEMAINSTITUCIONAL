"use client";

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Lock, UserCircle2, ArrowRight, ShieldCheck } from "lucide-react";

const COLORS = {
  azul: "#3f7384",
  verde: "#606f3a",
  amarillo: "#f4b958",
  rojo: "#cd7243"
};

export default function AfiliadoLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ cedula: "", codigo: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.cedula || !formData.codigo) {
      return toast.error("Por favor completa ambos campos para ingresar.");
    }

    setIsLoading(true);
    try {
      // Limpiar formato de cedula por si ponen puntos
      const cedulaLimpia = formData.cedula.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const codigoLimpio = formData.codigo.trim().toUpperCase();

      const q = query(
        collection(db, "afiliados"),
        where("cedula", "==", cedulaLimpia),
        where("codigoInstitucional", "==", codigoLimpio)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("Credenciales incorrectas. Verifica tu número de cédula y código institucional.");
        setIsLoading(false);
        return;
      }

      // Existe el afiliado
      const afiliadoDoc = snap.docs[0];
      const afiliadoData = afiliadoDoc.data();

      // Guardar sesión segura temporal
      sessionStorage.setItem("afiliado_sesion", afiliadoDoc.id);
      
      toast.success(`¡Bienvenido/a, ${afiliadoData.nombre.split(' ')[0]}!`);
      router.push("/afiliado/dashboard");

    } catch (error) {
      console.error("Error en login:", error);
      toast.error("Ocurrió un error al intentar conectarse. Inténtalo más tarde.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto bg-white p-2 rounded-full shadow-md w-28 h-28 mb-6 border-4 border-white" style={{ borderColor: COLORS.azul }}>
            <img src="/logo.png" alt="Logo Isla Cascajal" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: COLORS.azul }}>
            Portal del Afiliado
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Ingresa para descargar tus certificados, carnet digital y gestionar tu membresía.
          </p>
        </div>

        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="h-2 w-full flex">
            <div style={{ flex: 1, backgroundColor: COLORS.azul }} />
            <div style={{ flex: 1, backgroundColor: COLORS.verde }} />
            <div style={{ flex: 1, backgroundColor: COLORS.amarillo }} />
            <div style={{ flex: 1, backgroundColor: COLORS.rojo }} />
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4" style={{ color: COLORS.verde }} />
                  Número de Identificación (NUIP)
                </label>
                <Input 
                  placeholder="Ej. 1023456789" 
                  value={formData.cedula}
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                  className="h-12 text-lg border-slate-300 focus-visible:ring-blue-500"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" style={{ color: COLORS.rojo }} />
                  Código Institucional
                </label>
                <Input 
                  placeholder="Ej. FICONG-XXXX" 
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  className="h-12 text-lg uppercase border-slate-300 focus-visible:ring-blue-500"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3" />
                  Lo encuentras en tu tarjeta de afiliación.
                </p>
              </div>

              <Button 
                type="submit"
                className="w-full h-14 text-lg font-bold shadow-lg mt-4 group" 
                style={{ backgroundColor: COLORS.azul }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Spinner className="mr-3 h-5 w-5" /> Validando...</>
                ) : (
                  <>Acceder a mi portal <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
