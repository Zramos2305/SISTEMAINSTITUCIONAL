"use server";

export async function crearUsuarioInstitucional(data) {
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebase-admin");
    const { FieldValue } = await import("firebase-admin/firestore");
    const {
      correo, password, nombre, rol, cargo, creadoPorUid,
      foto, documento, telefono, direccion, rh, tipoPersonal,
      fechaIngreso, estado, modalidadLaboral, diasTeletrabajo,
      afiliarAutomaticamente, codigoInstitucional,
      beneficiarios, mascotas,
      tipoVinculacion, tienePeriodoPrueba, tiempoPeriodoPrueba,
      tipoContrato, tiempoContrato, fechaTerminacion, motivoTerminacion, salario
    } = data;

    // 1. Crear usuario en Firebase Auth
    console.log("==> Creando usuario institucional:", correo, "Rol:", rol);
    const userRecord = await adminAuth.createUser({
      email: correo,
      password: password,
      displayName: nombre,
    });

    let nuevoEmpleadoId = null;

    // 2. Crear el documento en la colección 'empleados' (siempre, para todo el personal)
    const empleadoRef = adminDb.collection("empleados").doc();
    nuevoEmpleadoId = empleadoRef.id;

    const horarioDefault = {
      lunes: "presencial", martes: "presencial", miercoles: "presencial",
      jueves: "presencial", viernes: "presencial", sabado: "libre", domingo: "libre"
    };

    await empleadoRef.set({
      nombre: nombre || "",
      correo: correo || "",
      documento: documento || "",
      telefono: telefono || "",
      direccion: direccion || "",
      rh: rh || "",
      cargo: cargo || "General",
      tipoPersonal: tipoPersonal || "Empleado",
      fechaIngreso: fechaIngreso || new Date().toISOString(),
      estado: estado || "activo",
      rolSistema: rol || "empleado",
      modalidadLaboral: modalidadLaboral || "Presencial",
      diasTeletrabajo: diasTeletrabajo || "",
      codigoInstitucional: codigoInstitucional || "",
      foto: foto || null,
      uidAuth: userRecord.uid,
      fechaCreacion: FieldValue.serverTimestamp(),
      creadoPor: creadoPorUid,
      horarioModalidad: horarioDefault,
      tipoVinculacion: tipoVinculacion || "",
      tienePeriodoPrueba: tienePeriodoPrueba || false,
      tiempoPeriodoPrueba: tiempoPeriodoPrueba || "",
      tipoContrato: tipoContrato || "",
      tiempoContrato: tiempoContrato || "",
      fechaTerminacion: fechaTerminacion || "",
      motivoTerminacion: motivoTerminacion || "",
      salario: salario || ""
    });

    // 3. Crear documento en colección 'usuarios' para el acceso al sistema
    const usuarioRef = adminDb.collection("usuarios").doc(userRecord.uid);
    await usuarioRef.set({
      uid: userRecord.uid,
      correo: correo,
      nombre: nombre,
      rol: rol,
      activo: estado === "activo",
      empleadoId: nuevoEmpleadoId,
      creadoPor: creadoPorUid,
      fechaCreacion: FieldValue.serverTimestamp(),
    });

    // 4. Afiliación Automática
    if (afiliarAutomaticamente) {
      const afiliadoRef = adminDb.collection("afiliados").doc();
      await afiliadoRef.set({
        afiliadoId: `FIC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        nombre: nombre,
        cedula: documento,
        telefono: telefono,
        correo: correo,
        direccion: direccion,
        rh: rh,
        estado: "activo",
        foto: foto || null,
        codigo: codigoInstitucional,
        fechaCreacion: FieldValue.serverTimestamp(),
        creadoPor: creadoPorUid,
        beneficiarios: beneficiarios || [],
        mascotas: mascotas || [],
        membresias: [
          {
            tipo: "institucional",
            codigo: codigoInstitucional,
            fechaInicio: new Date().toISOString(),
            fechaExpiracion: "indefinida",
            estado: "activo"
          }
        ],
        esPersonalInstitucional: true,
        personalId: nuevoEmpleadoId
      });
    }

    return { success: true, uid: userRecord.uid, personalId: nuevoEmpleadoId };
  } catch (error) {
    console.error("Error en crearUsuarioInstitucional:", error);
    return { success: false, error: error.message };
  }
}

export async function eliminarUsuarioInstitucional(uid, empleadoId) {
  try {
    console.log("==> Eliminando usuario institucional:", uid);
    const { adminAuth, adminDb } = await import("@/lib/firebase-admin");

    // 1. Eliminar de Firebase Auth
    try {
      await adminAuth.deleteUser(uid);
    } catch (authError) {
      console.warn("Aviso: No se pudo borrar de Auth:", authError.message);
    }

    // 2. Eliminar de 'usuarios'
    await adminDb.collection("usuarios").doc(uid).delete();

    // 3. Eliminar de 'empleados'
    if (empleadoId) {
      await adminDb.collection("empleados").doc(empleadoId).delete();

      // Eliminar afiliación institucional si existe
      const afiliadosRef = adminDb.collection("afiliados");
      const q = afiliadosRef.where("personalId", "==", empleadoId);
      const snapshot = await q.get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    return { success: true };
  } catch (error) {
    console.error("Error en eliminarUsuarioInstitucional:", error);
    return { success: false, error: error.message };
  }
}

