import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { referenceCode, amount, currency } = body;

    // Utilizamos variables de entorno para máxima seguridad, 
    // pero dejamos tus llaves como respaldo por si pruebas localmente.
    const apiKey = process.env.PAYU_API_KEY || "Ek1UQtAs3b1WCm898tnFklp0n8";
    const merchantId = process.env.PAYU_MERCHANT_ID || "1017224";
    const accountId = process.env.PAYU_ACCOUNT_ID || "1026167";

    // La fórmula oficial de PayU Latam: apiKey~merchantId~referenceCode~amount~currency
    const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}`;
    
    // Generar la encriptación en MD5
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    return NextResponse.json({ 
      signature, 
      merchantId, 
      accountId 
    });
  } catch (error) {
    console.error("Error firmando la transacción:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
