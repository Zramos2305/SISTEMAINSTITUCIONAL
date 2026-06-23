import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const body = await request.json();
    const { reference, amountInCents, currency } = body;

    // Secreto de Integridad de Wompi (No confundir con el Secreto de Eventos)
    // El secreto de integridad empieza por test_integrity_... o prod_integrity_...
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || "test_integrity_HbfR3YrvmAAtHl15FEfj8Sw3QA16ANo5";

    // Fórmula Wompi: reference + amountInCents + currency + secret
    const concatString = `${reference}${amountInCents}${currency}${integritySecret}`;
    
    // Hash SHA-256
    const hash = crypto.createHash('sha256').update(concatString).digest('hex');

    return NextResponse.json({ signature: hash });
  } catch (error) {
    console.error("Error generando firma de Wompi:", error);
    return NextResponse.json({ error: "No se pudo generar la firma" }, { status: 500 });
  }
}
