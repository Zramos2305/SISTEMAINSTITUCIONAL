import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Registra una acción administrativa en la colección 'auditoria'.
 * @param {Object} params
 * @param {Object} params.user - Objeto de usuario (Auth)
 * @param {Object} params.userData - Datos adicionales del usuario (Perfil)
 * @param {string} params.accion - Descripción breve de la acción (ej: "Eliminar Documento")
 * @param {string} params.documentoId - ID del documento afectado
 * @param {string} params.detalles - Detalles adicionales del cambio
 */
export async function registrarAuditoria({ user, userData, accion, documentoId, detalles }) {
  try {
    await addDoc(collection(db, "auditoria"), {
      usuarioEmail: user?.email || "desconocido",
      usuarioNombre: userData?.nombre || user?.displayName || "Anónimo",
      usuarioRol: userData?.rol || "admin",
      accion,
      documentoId: documentoId || "n/a",
      detalles: detalles || "",
      fecha: serverTimestamp(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "servidor",
    });
  } catch (error) {
    console.error("Error al registrar auditoría:", error);
  }
}
