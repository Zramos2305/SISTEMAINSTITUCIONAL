import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { referenceCode, amount, currency } = body;

    // Usamos las llaves OFICIALES de prueba (Sandbox) de PayU para que no nos rechace.
    // Cuando pasemos a producción (plata real), las cambiaremos por las tuyas en Vercel.
    const apiKey = process.env.PAYU_API_KEY || "4Vj8eK4rloUd272L48hsrarnUA";
    const merchantId = process.env.PAYU_MERCHANT_ID || "508029";
    const accountId = process.env.PAYU_ACCOUNT_ID || "512321";

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
