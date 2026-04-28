"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function crearUsuarioInstitucional(data) {
  try {
    const { correo, password, nombre, rol, cargo, creadoPorUid } = data;

    // 1. Crear usuario en Firebase Auth
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

