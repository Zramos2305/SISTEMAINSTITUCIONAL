"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── constantes ──────────────────────────────────────────────────────────────

export const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export const MODALIDADES = ["presencial", "teletrabajo", "libre", "presencial_sin_horario", "teletrabajo_sin_horario"];

export const HORARIO_DEFAULT = {
  lunes: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  martes: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  miercoles: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  jueves: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  viernes: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  sabado: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  domingo: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el nombre del día actual en español, en minúsculas, sin tilde.
 * Ejemplo: "lunes", "miercoles", "sabado"
 */
export function getDiaActualES() {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()];
}

/**
 * Garantiza que un objeto horario tenga los 7 días.
 * Si un día falta, lo inicializa en "libre".
 */
export function normalizarHorario(horario) {
  const base = { ...HORARIO_DEFAULT };
  if (horario && typeof horario === "object") {
    DIAS_SEMANA.forEach((dia) => {
      const data = horario[dia];
      if (typeof data === "string" && MODALIDADES.includes(data)) {
        // Compatibilidad con estructura anterior
        base[dia] = { modalidad: data, entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" };
      } else if (data && typeof data === "object") {
        // Nueva estructura
        base[dia] = {
          modalidad: MODALIDADES.includes(data.modalidad) ? data.modalidad : "libre",
          entrada1: data.entrada1 || data.entrada || "08:00",
          salida1: data.salida1 || "12:00",
          entrada2: data.entrada2 || "14:00",
          salida2: data.salida2 || data.salida || "18:00",
        };
      }
    });
  }
  return base;
}

/**
 * Calcula el resumen de modalidades de un horario normalizado.
 */
export function calcularResumenHorario(horario) {
  const h = normalizarHorario(horario);
  return {
    presencial: DIAS_SEMANA.filter((d) => h[d].modalidad === "presencial").length,
    teletrabajo: DIAS_SEMANA.filter((d) => h[d].modalidad === "teletrabajo").length,
    libre: DIAS_SEMANA.filter((d) => h[d].modalidad === "libre").length,
  };
}

// ─── hook principal ───────────────────────────────────────────────────────────

/**
 * Carga todos los documentos de la colección `empleados`.
 * Cada empleado incluye `horarioModalidad` normalizado.
 * Expone `actualizarModalidad(empleadoId, nuevoHorario)` para persistir cambios.
 */
export function useEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "empleados"));
      const lista = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        horarioModalidad: normalizarHorario(d.data().horarioModalidad),
      }));
      // Ordenar por nombre
      lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
      setEmpleados(lista);
    } catch (err) {
      console.error("useEmpleados error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * Persiste el horarioModalidad de un empleado en Firestore.
   * Solo actualiza el campo `horarioModalidad`, no toca nada más.
   */
  const actualizarModalidad = async (empleadoId, nuevoHorario) => {
    const horarioNormalizado = normalizarHorario(nuevoHorario);
    await updateDoc(doc(db, "empleados", empleadoId), {
      horarioModalidad: horarioNormalizado,
    });
    // Actualizar estado local para evitar re-fetch
    setEmpleados((prev) =>
      prev.map((e) =>
        e.id === empleadoId
          ? { ...e, horarioModalidad: horarioNormalizado }
          : e
      )
    );
  };

  return { empleados, isLoading, error, recargar: cargar, actualizarModalidad };
}
