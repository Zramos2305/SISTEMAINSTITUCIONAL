import { NextResponse } from "next/server";
import { Resend } from "resend";

// Inicialización segura para que no falle el build de Vercel si la variable aún no está puesta
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_para_build");
const CORREO_REMITENTE = "Fundación Isla Cascajal <info@islacascajal.org>";
const CORREOS_SISBEN = ["sisbencali@cali.gov.co", "sisben-coordinacionpuntos@admon.uniajc.edu.co"];

export async function POST(req) {
  try {
    const { tipo, formData } = await req.json();

    if (!formData || !formData.nombre) {
      return NextResponse.json({ error: "Datos del formulario incompletos" }, { status: 400 });
    }

    // ==========================================
    // 1. CORREO DE BIENVENIDA AL AFILIADO
    // ==========================================
    if (tipo === "bienvenida") {
      if (!formData.correo) {
        return NextResponse.json({ error: "El afiliado no tiene correo" }, { status: 400 });
      }

      const htmlBienvenida = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="text-align: center; padding: 20px 0; background-color: #f8fafc; border-bottom: 4px solid #3f7384;">
            <img src="https://firebasestorage.googleapis.com/v0/b/fundacion-isla-cascajal-19ee7.appspot.com/o/soportes%2Flogo.png?alt=media" alt="Logo Isla Cascajal" style="height: 80px;" onerror="this.src='https://islacascajal.org/logo.png'"/>
          </div>
          <div style="padding: 30px 20px;">
            <h1 style="color: #3f7384; font-size: 24px;">¡Bienvenido/a a la Fundación Isla Cascajal!</h1>
            <p style="font-size: 16px; line-height: 1.5;">Hola <strong>${formData.nombre}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.5;">
              Nos emociona confirmar que tu solicitud de afiliación ha sido recibida exitosamente en nuestro sistema bajo el código <strong>${formData.codigoInstitucional || formData.codigo}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.5;">
              Tu solicitud se encuentra actualmente en estado <strong>Pendiente de verificación</strong>. Una vez confirmemos todos los detalles, tu afiliación quedará completamente activa.
            </p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; font-size: 15px; color: #166534;">
                Si has solicitado una membresía y realizado un pago, tu carnet digital estará disponible muy pronto.
              </p>
            </div>
            <p style="font-size: 16px; line-height: 1.5;">
              Gracias por unirte a nuestra comunidad. Juntos construiremos un mejor futuro.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; background-color: #f8fafc; font-size: 12px; color: #64748b;">
            <p>&copy; ${new Date().getFullYear()} Fundación Isla Cascajal. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no respondas a esta dirección.</p>
          </div>
        </div>
      `;

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: formData.correo,
        subject: "¡Bienvenido/a a la Fundación Isla Cascajal!",
        html: htmlBienvenida,
      });

      return NextResponse.json({ success: true, data });
    }

    // ==========================================
    // 2. CORREO DE ALERTA PARA EL SISBÉN
    // ==========================================
    if (tipo === "sisben") {
      const htmlSisben = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #cd7243; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px;">Nueva Solicitud de Asesoría Sisbén</h2>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Se ha detectado un nuevo afiliado en la Fundación Isla Cascajal que reside en Cali, <strong>no cuenta con Sisbén</strong> y ha solicitado expresamente recibir asesoría para su inscripción.</p>
            
            <h3 style="color: #3f7384; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Datos de Contacto del Ciudadano:</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">Nombre Completo:</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${formData.nombre}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Cédula (NUIP):</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${formData.cedula}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Teléfono / Celular:</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
                  <a href="tel:${formData.telefono}" style="color: #2563eb; text-decoration: none;">${formData.telefono}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Correo Electrónico:</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
                  <a href="mailto:${formData.correo}" style="color: #2563eb; text-decoration: none;">${formData.correo || "No proporcionado"}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Dirección de Residencia:</td>
                <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${formData.direccion}, ${formData.ciudad}</td>
              </tr>
            </table>
            
            <div style="margin-top: 30px; padding: 15px; background-color: #f8fafc; border-radius: 6px; font-size: 14px; color: #64748b;">
              <p style="margin: 0;">Esta alerta es generada automáticamente por el sistema de vinculación institucional de la Fundación Isla Cascajal.</p>
            </div>
          </div>
        </div>
      `;

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: CORREOS_SISBEN,
        subject: `Alerta Sisbén: ${formData.nombre} requiere asesoría (Cali)`,
        html: htmlSisben,
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Tipo de correo no válido" }, { status: 400 });

  } catch (error) {
    console.error("Error enviando correo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
