"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── constantes ──────────────────────────────────────────────────────────────

export const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export const MODALIDADES = [
  "presencial",
  "teletrabajo",
  "libre",
  "presencial_sin_horario",
  "teletrabajo_sin_horario",
  "confianza"
];

export const HORARIO_DEFAULT = {
  lunes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  martes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  miercoles: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  jueves: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  viernes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  sabado: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  domingo: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
};

export const HORARIO_DEFAULT_CONFIANZA = {
  lunes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  martes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  miercoles: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  jueves: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  viernes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  sabado: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  domingo: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
};

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Devuelve el nombre del día actual en español, en minúsculas, sin tilde.
 */
export function getDiaActualES() {
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return dias[new Date().getDay()];
}

/**
 * Garantiza que un objeto horario tenga los 7 días con estructura completa y consistente.
 */
export function normalizarHorario(horario) {
  const base = {
    lunes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    martes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    miercoles: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    jueves: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    viernes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    sabado: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    domingo: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
  };

  if (horario && typeof horario === "object") {
    DIAS_SEMANA.forEach((dia) => {
      const data = horario[dia];
      if (typeof data === "string" && MODALIDADES.includes(data)) {
        base[dia] = { modalidad: data, entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" };
      } else if (data && typeof data === "object") {
        base[dia] = {
          modalidad: MODALIDADES.includes(data.modalidad) ? data.modalidad : "presencial",
          entrada1: data.entrada1 !== undefined ? data.entrada1 : (data.entrada || "08:00"),
          salida1: data.salida1 !== undefined ? data.salida1 : "12:00",
          entrada2: data.entrada2 !== undefined ? data.entrada2 : "14:00",
          salida2: data.salida2 !== undefined ? data.salida2 : (data.salida || "18:00"),
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
    presencial: DIAS_SEMANA.filter((d) => ["presencial", "presencial_sin_horario"].includes(h[d].modalidad)).length,
    teletrabajo: DIAS_SEMANA.filter((d) => ["teletrabajo", "teletrabajo_sin_horario"].includes(h[d].modalidad)).length,
    confianza: DIAS_SEMANA.filter((d) => h[d].modalidad === "confianza").length,
    libre: DIAS_SEMANA.filter((d) => h[d].modalidad === "libre").length,
  };
}

// ─── hook principal ───────────────────────────────────────────────────────────

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
   */
  const actualizarModalidad = async (empleadoId, nuevoHorario) => {
    const horarioNormalizado = normalizarHorario(nuevoHorario);
    await updateDoc(doc(db, "empleados", empleadoId), {
      horarioModalidad: horarioNormalizado,
    });
    setEmpleados((prev) =>
      prev.map((e) =>
        e.id === empleadoId
          ? { ...e, horarioModalidad: horarioNormalizado }
          : e
      )
    );
    return horarioNormalizado;
  };

  return { empleados, isLoading, error, recargar: cargar, actualizarModalidad };
}
