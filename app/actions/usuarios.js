"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function crearUsuarioInstitucional(data) {
  try {
    const { correo, password, nombre, rol, cargo, creadoPorUid } = data;

    // 1. Crear usuario en Firebase Auth
    console.log("==> Creando usuario institucional:", correo, "Rol:", rol);
    const userRecord = await adminAuth.createUser({
      email: correo,
      password: password,
      displayName: nombre,
    });

    let nuevoEmpleadoId = null;

    // 2. Si es empleado, crear el documento en la colección 'empleados'
    if (rol === "empleado") {
      const empleadoRef = adminDb.collection("empleados").doc();
      nuevoEmpleadoId = empleadoRef.id;
      
      const horarioDefault = {
        lunes: "presencial",
        martes: "presencial",
        miercoles: "presencial",
        jueves: "presencial",
        viernes: "presencial",
        sabado: "libre",
        domingo: "libre"
      };

      await empleadoRef.set({
        nombre: nombre,
        cargo: cargo || "Empleado General",
        uidAuth: userRecord.uid,
        correoLogin: correo,
        rolSistema: rol,
        fechaCreacion: FieldValue.serverTimestamp(),
        horarioModalidad: horarioDefault
      });
    }

    // 3. Crear documento en colección 'usuarios'
    const usuarioRef = adminDb.collection("usuarios").doc(userRecord.uid);
    await usuarioRef.set({
      uid: userRecord.uid,
      correo: correo,
      nombre: nombre,
      rol: rol,
      activo: true,
      empleadoId: nuevoEmpleadoId, // Será null si es admin/superadmin
      creadoPor: creadoPorUid,
      fechaCreacion: FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error("Error en crearUsuarioInstitucional:", error);
    return { success: false, error: error.message };
  }
}

export async function eliminarUsuarioInstitucional(uid, empleadoId) {
  try {
    console.log("==> Eliminando usuario institucional:", uid);

    // 1. Eliminar de Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError) {
      console.warn("Aviso: No se pudo borrar de Auth (tal vez ya no existe):", authError.message);
    }

    // 2. Eliminar de la colección 'usuarios'
    await adminDb.collection("usuarios").doc(uid).delete();

    // 3. Eliminar de la colección 'empleados' si aplica
    if (empleadoId) {
      await adminDb.collection("empleados").doc(empleadoId).delete();
    }

    return { success: true };
  } catch (error) {
    console.error("Error en eliminarUsuarioInstitucional:", error);
    return { success: false, error: error.message };
  }
}

