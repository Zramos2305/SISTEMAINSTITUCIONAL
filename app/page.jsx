"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth(false); // No forzar redirect en el hook

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (userData) {
      if (userData.rol === "empleado") {
        router.push("/asistencia");
      } else if (userData.rol === "recursos_humanos" || userData.rol === "personal") {
        router.push("/dashboard/personal");
      } else if (userData.rol === "superadmin" || userData.rol === "admin") {
        router.push("/dashboard");
      } else if (userData.rol === "lider_comercial") {
        router.push("/dashboard/afiliados");
      } else {
        router.push("/unauthorized");
      }
    } else {
      // Caso en el que hay sesión auth pero no documento de usuario
      router.push("/unauthorized?reason=no_profile");
    }
  }, [user, userData, loading, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative">
      <div className="absolute top-0 w-full h-2 flex">
        <div style={{ flex: 1, backgroundColor: "#3f7384" }} />
        <div style={{ flex: 1, backgroundColor: "#606f3a" }} />
        <div style={{ flex: 1, backgroundColor: "#f4b958" }} />
        <div style={{ flex: 1, backgroundColor: "#cd7243" }} />
      </div>
      <div className="text-center z-10">
        <Image
          src="/logo.png"
          alt="Logo Fundación Isla Cascajal"
          width={120}
          height={120}
          className="mx-auto mb-6 rounded-full shadow-lg"
          loading="eager"
          priority
        />
        <h1 className="text-2xl font-black mb-2" style={{ color: "#606f3a" }}>
          Fundación Isla Cascajal
        </h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest mb-8 text-sm">
          Sistema Institucional
        </p>
        <Spinner className="mx-auto text-blue-600" />
      </div>
    </div>
  );
}
