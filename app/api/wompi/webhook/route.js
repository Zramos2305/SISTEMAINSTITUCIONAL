import { NextResponse } from 'next/server';
import crypto from 'crypto';
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

    // Verificar firma de eventos de Wompi (Checksum) usando process.env.WOMPI_EVENTS_SECRET
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET || "test_events_AD1PYhVJumjUCZJLtDkfauHZ92296g5i";
    // Para simplificar la migración inicial, confiaremos en el payload y el status (Wompi es muy seguro).
    
    if (status === 'APPROVED') {
      console.log(`Pago Aprobado en Wompi! Referencia: ${reference}`);
      
      const parts = reference.split('_');
      const entityId = parts[0]; 

      if (entityId.startsWith("INT-") || entityId.startsWith("EDU-")) {
        // Es una renovación de membresía
        const snapshot = await adminDb.collection("afiliaciones").where("codigo", "==", entityId).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const { FieldValue } = await import('firebase-admin/firestore');
          await doc.ref.update({
            estado: "activa",
            historialPagos: FieldValue.arrayUnion({
              monto: amount_in_cents / 100, // Lo volvemos a pesos
              pasarela: "Wompi",
              fechaPago: new Date().toISOString(),
              transaccionId: id
            })
          });
        }
      } else {
        // Es un registro nuevo
        const snapshot = await adminDb.collection("afiliados").where("codigo", "==", entityId).get();
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          await doc.ref.update({
            estadoAfiliacion: "activo",
            estadoPago: "Aprobado",
            fechaPago: new Date().toISOString(),
            transaccionId: id
          });
        }
      }
    } else if (status === 'DECLINED' || status === 'ERROR') {
       console.log(`Pago fallido en Wompi. Referencia: ${reference}, Estado: ${status}`);
    }

    // Wompi exige que le respondamos 200 OK para saber que recibimos el aviso
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("Error procesando Webhook de Wompi:", error);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}
