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
      valorDiaTrabajo, horasSemanales, auxilioTransporte,
      // Horario y Modalidad
      horarioModalidad,
      // Afiliaciones / Seguridad Social
      eps, fondoPension, cesantias, cajaCompensacion, arl,
      // Campos Demográficos
      fechaNacimiento, paisNacimiento, otroPaisNacimiento, lugarNacimiento, edad,
      sexo, orientacionSexual, orientacionOtro, estrato, etnia,
      sisben, sisbenPuntaje, asesoriaSisben,
      victimaConflicto, victimaTipo, victimaInscrito,
      discriminacion, discriminacionTipo,
      educacionNivel, educacionEstudio, educacionSemestre, educacionPlantel,
      enfermedad, enfermedadCual, alergia, alergiaCual,
      discapacidad, discapacidadTipo, discapacidadOtro,
      trastorno, trastornoTipo, trastornoOtro,
      condicionEspecial, condicionEspecialCual,
      deseaSerVoluntario,
      emergenciaNombre, emergenciaNumero, emergenciaWhatsapp, emergenciaDireccion
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

    const horarioBaseEstandar = {
      lunes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      martes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      miercoles: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      jueves: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      viernes: { modalidad: "presencial", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      sabado: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      domingo: { modalidad: "libre", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    };

    const horarioConfianza = {
      lunes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      martes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      miercoles: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      jueves: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      viernes: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      sabado: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
      domingo: { modalidad: "confianza", entrada1: "08:00", salida1: "12:00", entrada2: "14:00", salida2: "18:00" },
    };

    const modalidadFinal = rol === "superadmin" ? "Empleado de Confianza" : (modalidadLaboral || "Presencial");

    const horarioFinal = horarioModalidad 
      ? horarioModalidad 
      : ((modalidadFinal === "Empleado de Confianza" || rol === "superadmin") ? horarioConfianza : horarioBaseEstandar);

    await empleadoRef.set({
      nombre: nombre || "",
      correo: correo || "",
      documento: documento || "",
      telefono: telefono || "",
      direccion: direccion || "",
      rh: rh || "",
      cargo: cargo || (rol === "superadmin" ? "Súper Administrador" : "General"),
      tipoPersonal: tipoPersonal || "Empleado",
      fechaIngreso: fechaIngreso || new Date().toISOString(),
      estado: estado || "activo",
      rolSistema: rol || "empleado",
      modalidadLaboral: modalidadFinal,
      diasTeletrabajo: diasTeletrabajo || "",
      codigoInstitucional: codigoInstitucional || "",
      foto: foto || null,
      uidAuth: userRecord.uid,
      fechaCreacion: FieldValue.serverTimestamp(),
      creadoPor: creadoPorUid,
      horarioModalidad: horarioFinal,
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
      auxilioTransporte: auxilioTransporte || "",
      // Seguridad social
      eps: eps || "",
      fondoPension: fondoPension || "",
      cesantias: cesantias || "",
      cajaCompensacion: cajaCompensacion || "",
      arl: arl || "POSITIVA ARL",
      // Afiliación y Demografía
      afiliarAutomaticamente: !!afiliarAutomaticamente,
      fechaNacimiento: fechaNacimiento || "",
      paisNacimiento: paisNacimiento || "Colombia",
      otroPaisNacimiento: otroPaisNacimiento || "",
      lugarNacimiento: lugarNacimiento || "",
      edad: edad || "",
      sexo: sexo || "",
      orientacionSexual: orientacionSexual || "",
      orientacionOtro: orientacionOtro || "",
      estrato: estrato || "",
      etnia: etnia || "",
      sisben: sisben || "",
      sisbenPuntaje: sisbenPuntaje || "",
      asesoriaSisben: asesoriaSisben || "",
      victimaConflicto: victimaConflicto || "",
      victimaTipo: victimaTipo || "",
      victimaInscrito: victimaInscrito || "",
      discriminacion: discriminacion || "",
      discriminacionTipo: discriminacionTipo || "",
      educacionNivel: educacionNivel || "",
      educacionEstudio: educacionEstudio || "",
      educacionSemestre: educacionSemestre || "",
      educacionPlantel: educacionPlantel || "",
      enfermedad: enfermedad || "",
      enfermedadCual: enfermedadCual || "",
      alergia: alergia || "",
      alergiaCual: alergiaCual || "",
      discapacidad: discapacidad || "",
      discapacidadTipo: discapacidadTipo || "",
      discapacidadOtro: discapacidadOtro || "",
      trastorno: trastorno || "",
      trastornoTipo: trastornoTipo || "",
      trastornoOtro: trastornoOtro || "",
      condicionEspecial: condicionEspecial || "",
      condicionEspecialCual: condicionEspecialCual || "",
      deseaSerVoluntario: deseaSerVoluntario || "",
      emergenciaNombre: emergenciaNombre || "",
      emergenciaNumero: emergenciaNumero || "",
      emergenciaWhatsapp: emergenciaWhatsapp || "",
      emergenciaDireccion: emergenciaDireccion || "",
      beneficiarios: beneficiarios || [],
      mascotas: mascotas || []
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
        // Campos Demográficos Completos
        fechaNacimiento: fechaNacimiento || "",
        paisNacimiento: paisNacimiento || "Colombia",
        otroPaisNacimiento: otroPaisNacimiento || "",
        lugarNacimiento: lugarNacimiento || "",
        edad: edad || "",
        sexo: sexo || "",
        orientacionSexual: orientacionSexual || "",
        orientacionOtro: orientacionOtro || "",
        estrato: estrato || "",
        etnia: etnia || "",
        sisben: sisben || "",
        sisbenPuntaje: sisbenPuntaje || "",
        asesoriaSisben: asesoriaSisben || "",
        victimaConflicto: victimaConflicto || "",
        victimaTipo: victimaTipo || "",
        victimaInscrito: victimaInscrito || "",
        discriminacion: discriminacion || "",
        discriminacionTipo: discriminacionTipo || "",
        educacionNivel: educacionNivel || "",
        educacionEstudio: educacionEstudio || "",
        educacionSemestre: educacionSemestre || "",
        educacionPlantel: educacionPlantel || "",
        eps: eps || "",
        arl: arl || "POSITIVA ARL",
        enfermedad: enfermedad || "",
        enfermedadCual: enfermedadCual || "",
        alergia: alergia || "",
        alergiaCual: alergiaCual || "",
        discapacidad: discapacidad || "",
        discapacidadTipo: discapacidadTipo || "",
        discapacidadOtro: discapacidadOtro || "",
        trastorno: trastorno || "",
        trastornoTipo: trastornoTipo || "",
        trastornoOtro: trastornoOtro || "",
        condicionEspecial: condicionEspecial || "",
        condicionEspecialCual: condicionEspecialCual || "",
        deseaSerVoluntario: deseaSerVoluntario || "",
        emergenciaNombre: emergenciaNombre || "",
        emergenciaNumero: emergenciaNumero || "",
        emergenciaWhatsapp: emergenciaWhatsapp || "",
        emergenciaDireccion: emergenciaDireccion || "",
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
      horarioModalidad,
      // Afiliaciones / Seguridad Social
      eps, fondoPension, cesantias, cajaCompensacion, arl,
      // Campos Demográficos
      fechaNacimiento, paisNacimiento, otroPaisNacimiento, lugarNacimiento, edad,
      sexo, orientacionSexual, orientacionOtro, estrato, etnia,
      sisben, sisbenPuntaje, asesoriaSisben,
      victimaConflicto, victimaTipo, victimaInscrito,
      discriminacion, discriminacionTipo,
      educacionNivel, educacionEstudio, educacionSemestre, educacionPlantel,
      enfermedad, enfermedadCual, alergia, alergiaCual,
      discapacidad, discapacidadTipo, discapacidadOtro,
      trastorno, trastornoTipo, trastornoOtro,
      condicionEspecial, condicionEspecialCual,
      deseaSerVoluntario,
      emergenciaNombre, emergenciaNumero, emergenciaWhatsapp, emergenciaDireccion,
      beneficiarios, mascotas, afiliarAutomaticamente
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
    
    const updatePayload = {
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
      horarioModalidad: horarioModalidad || empleadoExistente.horarioModalidad,
      // Seguridad social
      eps: eps || empleadoExistente.eps || "",
      fondoPension: fondoPension || empleadoExistente.fondoPension || "",
      cesantias: cesantias || empleadoExistente.cesantias || "",
      cajaCompensacion: cajaCompensacion || empleadoExistente.cajaCompensacion || "",
      arl: arl || empleadoExistente.arl || "POSITIVA ARL",
      // Demografía
      fechaNacimiento: fechaNacimiento || empleadoExistente.fechaNacimiento || "",
      paisNacimiento: paisNacimiento || empleadoExistente.paisNacimiento || "Colombia",
      otroPaisNacimiento: otroPaisNacimiento || empleadoExistente.otroPaisNacimiento || "",
      lugarNacimiento: lugarNacimiento || empleadoExistente.lugarNacimiento || "",
      edad: edad || empleadoExistente.edad || "",
      sexo: sexo || empleadoExistente.sexo || "",
      orientacionSexual: orientacionSexual || empleadoExistente.orientacionSexual || "",
      orientacionOtro: orientacionOtro || empleadoExistente.orientacionOtro || "",
      estrato: estrato || empleadoExistente.estrato || "",
      etnia: etnia || empleadoExistente.etnia || "",
      sisben: sisben || empleadoExistente.sisben || "",
      sisbenPuntaje: sisbenPuntaje || empleadoExistente.sisbenPuntaje || "",
      asesoriaSisben: asesoriaSisben || empleadoExistente.asesoriaSisben || "",
      victimaConflicto: victimaConflicto || empleadoExistente.victimaConflicto || "",
      victimaTipo: victimaTipo || empleadoExistente.victimaTipo || "",
      victimaInscrito: victimaInscrito || empleadoExistente.victimaInscrito || "",
      discriminacion: discriminacion || empleadoExistente.discriminacion || "",
      discriminacionTipo: discriminacionTipo || empleadoExistente.discriminacionTipo || "",
      educacionNivel: educacionNivel || empleadoExistente.educacionNivel || "",
      educacionEstudio: educacionEstudio || empleadoExistente.educacionEstudio || "",
      educacionSemestre: educacionSemestre || empleadoExistente.educacionSemestre || "",
      educacionPlantel: educacionPlantel || empleadoExistente.educacionPlantel || "",
      enfermedad: enfermedad || empleadoExistente.enfermedad || "",
      enfermedadCual: enfermedadCual || empleadoExistente.enfermedadCual || "",
      alergia: alergia || empleadoExistente.alergia || "",
      alergiaCual: alergiaCual || empleadoExistente.alergiaCual || "",
      discapacidad: discapacidad || empleadoExistente.discapacidad || "",
      discapacidadTipo: discapacidadTipo || empleadoExistente.discapacidadTipo || "",
      discapacidadOtro: discapacidadOtro || empleadoExistente.discapacidadOtro || "",
      trastorno: trastorno || empleadoExistente.trastorno || "",
      trastornoTipo: trastornoTipo || empleadoExistente.trastornoTipo || "",
      trastornoOtro: trastornoOtro || empleadoExistente.trastornoOtro || "",
      condicionEspecial: condicionEspecial || empleadoExistente.condicionEspecial || "",
      condicionEspecialCual: condicionEspecialCual || empleadoExistente.condicionEspecialCual || "",
      deseaSerVoluntario: deseaSerVoluntario || empleadoExistente.deseaSerVoluntario || "",
      emergenciaNombre: emergenciaNombre || empleadoExistente.emergenciaNombre || "",
      emergenciaNumero: emergenciaNumero || empleadoExistente.emergenciaNumero || "",
      emergenciaWhatsapp: emergenciaWhatsapp || empleadoExistente.emergenciaWhatsapp || "",
      emergenciaDireccion: emergenciaDireccion || empleadoExistente.emergenciaDireccion || "",
      beneficiarios: beneficiarios || empleadoExistente.beneficiarios || [],
      mascotas: mascotas || empleadoExistente.mascotas || []
    };

    if (afiliarAutomaticamente !== undefined) {
      updatePayload.afiliarAutomaticamente = !!afiliarAutomaticamente;
    }

    await empleadoRef.update(updatePayload);

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

