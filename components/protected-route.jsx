"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";

/**
 * Componente Guardián de Rutas
 * 
 * @param {string[]} allowedRoles - Array de roles permitidos para esta ruta. Ej: ["superadmin", "recursos_humanos"]
 * @param {React.ReactNode} children - El contenido a renderizar si el usuario tiene permiso
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si aún está cargando la sesión, no hacer nada
    if (loading) return;

    // Si no hay usuario autenticado, mandar al login
    if (!user) {
      router.push("/login");
      return;
    }

    // Si el usuario existe pero no tiene los datos de rol cargados (podría ser un delay)
    // O si el usuario está inactivo
    if (!userData || userData.activo === false || userData.estado === "inactivo") {
      if (userData?.activo === false || userData?.estado === "inactivo") {
        // Podríamos redirigir a una página de cuenta desactivada
        router.push("/unauthorized?reason=inactive");
      }
      return;
    }

    // SuperAdmin siempre tiene acceso o si el rol está en allowedRoles
    const userRole = (userData.rol || "empleado").toLowerCase();
    const hasPermission = userRole === "superadmin" || allowedRoles.includes(userRole);

    if (!hasPermission) {
      // Si es un empleado o asesor comercial intentando entrar a otra cosa, forzar a /asistencia
      if ((userRole === "empleado" || userRole === "comercial") && !pathname.startsWith("/asistencia")) {
        router.push("/asistencia");
      } 
      // Si es un líder comercial intentando entrar a zona no permitida
      else if (userRole === "lider_comercial" && !pathname.includes("/dashboard/afiliados") && !pathname.startsWith("/asistencia") && !pathname.includes("/afiliar")) {
        router.push("/dashboard/afiliados");
      }
      // Si es un recursos_humanos o personal intentando entrar a zona superadmin o no permitida
      else if ((userRole === "recursos_humanos" || userRole === "personal") && !pathname.includes("/dashboard/personal") && !pathname.includes("/generar") && !pathname.startsWith("/asistencia")) {
        router.push("/dashboard/personal");
      }
      // Redirigir a unauthorized por defecto
      else {
        router.push("/unauthorized");
      }
    }
  }, [user, userData, loading, router, pathname, allowedRoles]);

  // Si está cargando o no hay usuario o no hay userData (y estamos esperando la redirección)
  if (loading || !user || !userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Image src="/logo.png" alt="Logo" width={64} height={64} className="mb-4 rounded-full opacity-50" />
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando acceso de seguridad...</p>
      </div>
    );
  }

  // Si tiene el rol activo y permitido (superadmin tiene pase total)
  const finalRole = (userData.rol || "empleado").toLowerCase();
  if (userData.activo !== false && userData.estado !== "inactivo" && (finalRole === "superadmin" || allowedRoles.includes(finalRole))) {
    return <>{children}</>;
  }

  // Fallback (mientras se ejecuta el redirect en el useEffect)
  return null;
}
