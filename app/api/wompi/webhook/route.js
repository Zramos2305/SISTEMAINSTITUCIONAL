import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const event = body.event;
    
    // Solo nos interesa el evento de transacción actualizada
    if (event !== 'transaction.updated') {
      return NextResponse.json({ received: true });
    }

    const { transaction } = body.data;
    const { id, status, reference, amount_in_cents } = transaction;

    if (status === 'APPROVED') {
      console.log(`Pago Aprobado en Wompi! Referencia: ${reference}`);
      
      const parts = reference.split('_');
      const entityId = parts[0]; 
      const isRenewal = reference.includes('_RENOV_');

      // Buscar el documento del afiliado en Firestore
      // Primero intentamos por codigoInstitucional, luego por codigo
      let docSnap = null;
      const queryByInst = await adminDb.collection("afiliados").where("codigoInstitucional", "==", entityId).get();
      if (!queryByInst.empty) {
        docSnap = queryByInst.docs[0];
      } else {
        const queryByCodigo = await adminDb.collection("afiliados").where("codigo", "==", entityId).get();
        if (!queryByCodigo.empty) {
          docSnap = queryByCodigo.docs[0];
        }
      }

      if (docSnap) {
        const afiliadoData = docSnap.data();
        let membresiasActualizadas = [...(afiliadoData.membresias || [])];
        const hoy = new Date();

        if (isRenewal) {
          // RENOVACIÓN: Activar membresías y extender fechas de expiración
          membresiasActualizadas = membresiasActualizadas.map(m => {
            if (m.fechaExpiracion) {
              let expiracion = new Date(m.fechaExpiracion);
              let baseDate = (hoy > expiracion) ? hoy : expiracion;
              
              if (m.tipo === "educativa" || m.tipo === "educativa_internacional" || m.tipo === "casino") {
                let year = baseDate.getFullYear();
                let month = baseDate.getMonth();
                if (month <= 4) expiracion = new Date(year, 4, 30, 23, 59, 59);
                else if (month <= 10) expiracion = new Date(year, 10, 30, 23, 59, 59);
                else expiracion = new Date(year + 1, 4, 30, 23, 59, 59);
              } else if (m.tipo === "integral") {
                expiracion = new Date(baseDate);
                expiracion.setFullYear(expiracion.getFullYear() + 1);
              }
              return { ...m, estado: "activa", fechaExpiracion: expiracion.toISOString() };
            }
            return { ...m, estado: "activa" };
          });
        } else {
          // REGISTRO NUEVO: Las fechas ya se calcularon en el frontend, solo activamos
          membresiasActualizadas = membresiasActualizadas.map(m => ({ ...m, estado: "activa" }));
        }

        const { FieldValue } = await import('firebase-admin/firestore');
        
        await docSnap.ref.update({
          estadoAfiliacion: "activo",
          estadoPago: "Aprobado",
          fechaPago: hoy.toISOString(),
          transaccionId: id,
          membresias: membresiasActualizadas,
          historialPagos: FieldValue.arrayUnion({
            monto: amount_in_cents / 100,
            pasarela: "Wompi",
            fechaPago: hoy.toISOString(),
            transaccionId: id,
            tipo: isRenewal ? "Renovación" : "Registro Nuevo"
          })
        });

        // Enviar correos de bienvenida SOLO si es un registro nuevo
        if (!isRenewal && afiliadoData.correo) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "https://islacascajal.org";
              
            // 1. Correo al Usuario
            await fetch(`${baseUrl}/api/email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tipo: "activacion",
                formData: {
                  nombre: afiliadoData.nombre,
                  correo: afiliadoData.correo,
                  cedula: afiliadoData.cedula,
                  codigo: afiliadoData.codigo,
                  codigoInstitucional: afiliadoData.codigoInstitucional
                }
              })
            });
            
            // 2. Alerta Administrativa al equipo
            await fetch(`${baseUrl}/api/email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tipo: "alerta_admin_activacion",
                formData: {
                  nombre: afiliadoData.nombre,
                  cedula: afiliadoData.cedula,
                  codigo: afiliadoData.codigo,
                  codigoInstitucional: afiliadoData.codigoInstitucional,
                  montoPagado: amount_in_cents / 100
                }
              })
            });
            
            console.log(`Correos de activación enviados para: ${afiliadoData.correo}`);
          } catch (emailError) {
            console.error("Error enviando correos post-pago:", emailError);
          }
        }
        
      } else {
        console.log(`Afiliado no encontrado para la referencia: ${reference}`);
      }
    } else if (status === 'DECLINED' || status === 'ERROR') {
       console.log(`Pago fallido en Wompi. Referencia: ${reference}, Estado: ${status}`);
    }

    // Wompi exige 200 OK
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error procesando Webhook de Wompi:", error);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}
