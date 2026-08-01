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
      tipoContrato, tiempoContrato, fechaTerminacion, motivoTerminacion, salario,
      // Nuevos campos institucionales
      oficinaContrata, dependenciaSolicita,
      paisAsignacion, departamentoAsignacion, ciudadAsignacion, correoPersonal,
      // Remuneración desglosada
      valorDiaTrabajo, horasSemanales, auxilioTransporte
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
      salario: salario || "",
      // Nuevos campos institucionales
      oficinaContrata: oficinaContrata || "",
      dependenciaSolicita: dependenciaSolicita || "",
      paisAsignacion: paisAsignacion || "Colombia",
      departamentoAsignacion: departamentoAsignacion || "",
      ciudadAsignacion: ciudadAsignacion || "",
      correoPersonal: correoPersonal || "",
      // Remuneración desglosada
      valorDiaTrabajo: valorDiaTrabajo || "",
      horasSemanales: horasSemanales || "",
      auxilioTransporte: auxilioTransporte || ""
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
    if (afiliarAutomaticamente && tipoVinculacion !== "Periodo de Prueba") {
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

export async function reingresarUsuarioInstitucional(empleadoExistente, data) {
  try {
    const { adminDb, adminAuth } = await import("@/lib/firebase-admin");
    const { FieldValue } = await import("firebase-admin/firestore");

    // 1. Validar que el empleado exista
    if (!empleadoExistente || !empleadoExistente.id) {
      throw new Error("Datos de empleado existente no válidos para reingreso.");
    }

    const {
      cargo, tipoPersonal, fechaIngreso, estado, modalidadLaboral, diasTeletrabajo,
      tipoVinculacion, tienePeriodoPrueba, tiempoPeriodoPrueba,
      tipoContrato, tiempoContrato, fechaTerminacion, motivoTerminacion, salario,
      oficinaContrata, dependenciaSolicita,
      paisAsignacion, departamentoAsignacion, ciudadAsignacion, correoPersonal,
      valorDiaTrabajo, horasSemanales, auxilioTransporte,
      horarioModalidad
    } = data;

    // 2. Extraer contrato anterior para guardarlo en el historial
    const contratoAnterior = {
      cargo: empleadoExistente.cargo || "",
      tipoVinculacion: empleadoExistente.tipoVinculacion || "",
      tipoContrato: empleadoExistente.tipoContrato || "",
      fechaIngreso: empleadoExistente.fechaIngreso || "",
      fechaTerminacion: empleadoExistente.fechaTerminacion || "",
      motivoTerminacion: empleadoExistente.motivoTerminacion || "",
      salario: empleadoExistente.salario || ""
    };

    const historialContratos = empleadoExistente.contratosAnteriores || [];
    historialContratos.push(contratoAnterior);

    // 3. Actualizar documento de empleado
    const empleadoRef = adminDb.collection("empleados").doc(empleadoExistente.id);
    
    await empleadoRef.update({
      estado: "activo",
      contratosAnteriores: historialContratos,
      
      // Nuevos datos del contrato actual
      cargo: cargo || "General",
      tipoPersonal: tipoPersonal || "Empleado",
      fechaIngreso: fechaIngreso || new Date().toISOString(),
      modalidadLaboral: modalidadLaboral || "Presencial",
      diasTeletrabajo: diasTeletrabajo || "",
      tipoVinculacion: tipoVinculacion || "",
      tienePeriodoPrueba: tienePeriodoPrueba || false,
      tiempoPeriodoPrueba: tiempoPeriodoPrueba || "",
      tipoContrato: tipoContrato || "",
      tiempoContrato: tiempoContrato || "",
      fechaTerminacion: fechaTerminacion || "",
      motivoTerminacion: motivoTerminacion || "",
      salario: salario || "",
      oficinaContrata: oficinaContrata || "",
      dependenciaSolicita: dependenciaSolicita || "",
      paisAsignacion: paisAsignacion || "Colombia",
      departamentoAsignacion: departamentoAsignacion || "",
      ciudadAsignacion: ciudadAsignacion || "",
      correoPersonal: correoPersonal || "",
      valorDiaTrabajo: valorDiaTrabajo || "",
      horasSemanales: horasSemanales || "",
      auxilioTransporte: auxilioTransporte || "",
      horarioModalidad: horarioModalidad || empleadoExistente.horarioModalidad
    });

    // 4. Actualizar estado en Auth / Documento de usuario (si existe)
    if (empleadoExistente.uidAuth) {
      try {
        await adminAuth.updateUser(empleadoExistente.uidAuth, { disabled: false });
        await adminDb.collection("usuarios").doc(empleadoExistente.uidAuth).update({
          activo: true
        });
      } catch (err) {
        console.warn("Error reactivando auth user (podría no existir)", err);
      }
    }

    return { success: true, personalId: empleadoExistente.id };
  } catch (error) {
    console.error("Error en reingresarUsuarioInstitucional:", error);
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

