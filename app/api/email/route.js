import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_para_build");
const CORREO_REMITENTE = "Fundación Isla Cascajal <info@islacascajal.org>";
const CORREOS_SISBEN = ["sisbencali@cali.gov.co", "sisben-coordinacionpuntos@admon.uniajc.edu.co"];
const CORREO_ADMIN = "afiliaciones@islacascajal.org";
const PORTAL_URL = "https://fundacion.islacascajal.org/afiliado";
const BANNER_URL = "https://fundacion.islacascajal.org/banner.png";
const LOGO_URL = "https://fundacion.islacascajal.org/logo.png";

// ─────────────────────────────────────────────────
// PLANTILLA BASE: Header + Banner reutilizable
// ─────────────────────────────────────────────────
const emailHeader = (badge, badgeColor = "#3f7384") => `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0; padding:0; background-color:#f0f4f8; font-family: 'Segoe UI', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8; padding: 30px 0;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10);">

          <!-- HEADER CON LOGO -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #3f7384 0%, #2c5364 100%); padding: 28px 20px 18px 20px;">
              <img src="${LOGO_URL}" alt="Logo Fundación Isla Cascajal"
                style="height: 70px; display:block; margin: 0 auto 10px auto;"
                onerror="this.style.display='none'"/>
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.5px;">Fundación Isla Cascajal</h1>
              <p style="margin:5px 0 0 0; color:#b2d8e3; font-size:12px; letter-spacing:1px; text-transform:uppercase;">Sistema Institucional de Afiliación</p>
            </td>
          </tr>

          <!-- BANNER -->
          <tr>
            <td style="padding:0; line-height:0;">
              <img src="${BANNER_URL}" alt="Fundación Isla Cascajal"
                width="600"
                style="width:100%; max-width:600px; display:block;"
                onerror="this.style.display='none'"/>
            </td>
          </tr>

          <!-- BADGE -->
          <tr>
            <td align="center" style="padding: 24px 40px 0 40px;">
              <div style="display:inline-block; background:${badgeColor}; color:#fff; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding:7px 22px; border-radius:30px;">
                ${badge}
              </div>
            </td>
          </tr>
`;

const emailFooter = () => `
          <!-- FRASE FINAL -->
          <tr>
            <td align="center" style="padding: 20px 40px 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin:0; font-size:16px; font-weight:700; color:#3f7384; font-style:italic;">"Juntos seguiremos construyendo <span style="color:#cd7243;">UniverCiudad</span>"</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#2c5364,#3f7384); padding: 18px 30px;">
              <p style="margin:0 0 4px 0; color:#b2d8e3; font-size:12px;">&copy; ${new Date().getFullYear()} Fundación Isla Cascajal. Todos los derechos reservados.</p>
              <p style="margin:0; color:#7fb5c3; font-size:11px;">Este es un correo automático, por favor no responda a esta dirección.</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>
`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { tipo, formData } = body;

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

      const html = emailHeader("Solicitud Recibida", "#2c5364") + `

          <!-- SEPARADOR -->
          <tr><td style="height:8px; background:#f8fafc;"></td></tr>

          <!-- SALUDO -->
          <tr>
            <td style="padding: 36px 48px 0 48px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:600;">Estimado/a afiliado/a</p>
              <h2 style="margin:0 0 20px 0; color:#1e293b; font-size:28px; font-weight:300; line-height:1.3; letter-spacing:-0.5px;">${formData.nombre}</h2>
              <div style="width:40px; height:3px; background:#3f7384; margin-bottom:24px;"></div>
              <p style="margin:0; font-size:15px; color:#475569; line-height:1.8;">
                Su solicitud de afiliación ha sido <strong style="color:#1e293b; font-weight:600;">recibida con éxito</strong>.
                Si realizó el pago de su membresía, su afiliación ya se encuentra activa
                y pronto tendrá acceso a su carnet digital.
              </p>
            </td>
          </tr>

          <!-- CÓDIGO INSTITUCIONAL -->
          <tr>
            <td style="padding: 28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Código Institucional</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px; background:#ffffff;">
                    <p style="margin:0; font-size:22px; font-weight:700; color:#2c5364; letter-spacing:3px; font-family: 'Courier New', monospace;">${formData.codigoInstitucional}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0 0; font-size:12px; color:#94a3b8;">Conserve este código, lo necesitará para acceder a su portal de afiliado.</p>
            </td>
          </tr>

          <!-- PROCESO -->
          <tr>
            <td style="padding: 0 48px 36px 48px;">
              <p style="margin:0 0 20px 0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Proceso de activación</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 2px solid #e2e8f0;">
                <tr>
                  <td style="padding:0 0 20px 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Revisión de documentos</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Nuestro equipo verificará los soportes enviados.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 20px 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Acceso al portal</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Recibirá un correo con el enlace y sus credenciales de ingreso.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 0 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Descarga su carnet</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Acceda a su carnet digital y disfrute todos los beneficios institucionales.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

      ` + emailFooter();

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: formData.correo,
        subject: "Bienvenido/a a la Fundacion Isla Cascajal",
        html,
      });

      return NextResponse.json({ success: true, data });
    }

    // ==========================================
    // 2. CORREO DE ACTIVACIÓN (AFILIACIÓN ACTIVA)
    // ==========================================
    if (tipo === "activacion") {
      if (!formData.correo) {
        return NextResponse.json({ error: "El afiliado no tiene correo" }, { status: 400 });
      }

      const html = emailHeader("Afiliación Activa", "#16a34a") + `

          <!-- SEPARADOR -->
          <tr><td style="height:8px; background:#f8fafc;"></td></tr>

          <!-- SALUDO -->
          <tr>
            <td style="padding: 36px 48px 0 48px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:600;">Confirmación de Pago</p>
              <h2 style="margin:0 0 20px 0; color:#1e293b; font-size:28px; font-weight:300; line-height:1.3; letter-spacing:-0.5px;">Felicidades, ${formData.nombre}</h2>
              <div style="width:40px; height:3px; background:#16a34a; margin-bottom:24px;"></div>
              <p style="margin:0; font-size:15px; color:#475569; line-height:1.8;">
                Su pago ha sido confirmado con éxito. Su afiliación a la Fundación Isla Cascajal se encuentra
                <strong style="color:#16a34a; font-weight:600;">completamente activa</strong>.
                A partir de este momento tiene acceso total a su Portal Personal del Afiliado.
              </p>
            </td>
          </tr>

          <!-- CREDENCIALES DE ACCESO -->
          <tr>
            <td style="padding: 28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Datos de Acceso al Portal</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px; border-bottom:1px solid #f1f5f9; width:45%;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Número de Identificación</p>
                  </td>
                  <td style="padding:20px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:600;">${formData.cedula}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Código Institucional</p>
                  </td>
                  <td style="padding:20px 24px;">
                    <p style="margin:0; font-size:18px; color:#1e293b; font-weight:700; letter-spacing:2px; font-family: 'Courier New', monospace;">${formData.codigoInstitucional || formData.codigo}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BOTÓN PORTAL -->
          <tr>
            <td align="center" style="padding: 0 48px 20px 48px;">
              <a href="${PORTAL_URL}" target="_blank"
                style="display:inline-block; background:#1e293b; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:14px 36px; border-radius:6px; letter-spacing:0.5px;">
                Ingresar a Mi Portal
              </a>
            </td>
          </tr>

          <!-- QUÉ ENCONTRARÁS -->
          <tr>
            <td style="padding: 10px 48px 36px 48px;">
              <p style="margin:0 0 20px 0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Servicios Disponibles</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left: 2px solid #e2e8f0;">
                <tr>
                  <td style="padding:0 0 16px 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Carnet Digital</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Descargue e imprima su identificación oficial.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Comprobante de Pago</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Acceda al recibo formal de su afiliación.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Certificados</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Solicite certificaciones institucionales.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 0 20px;">
                    <p style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#1e293b;">Módulo de Referidos</p>
                    <p style="margin:0; font-size:13px; color:#64748b;">Consulte el estado de las personas que ha referido.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- NOTA ACCESO -->
          <tr>
            <td style="padding: 0 48px 36px 48px;">
              <div style="border-left: 2px solid #16a34a; padding-left: 16px;">
                <p style="margin:0; font-size:12px; color:#64748b; line-height:1.6;">
                  Para ingresar, visite <a href="${PORTAL_URL}" style="color:#2c5364; font-weight:600; text-decoration:none;">${PORTAL_URL}</a> 
                  y digite su número de identificación y código institucional.
                </p>
              </div>
            </td>
          </tr>

      ` + emailFooter();

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: formData.correo,
        subject: `Activación Exitosa - Acceso al Portal`,
        html,
      });

      return NextResponse.json({ success: true, data });
    }

    // ==========================================
    // 3. CORREO DE ALERTA PARA EL SISBÉN
    // ==========================================
    if (tipo === "sisben") {
      const html = emailHeader("Alerta Sisbén", "#cd7243") + `

          <!-- SEPARADOR -->
          <tr><td style="height:8px; background:#f8fafc;"></td></tr>

          <!-- SALUDO Y MENSAJE PRINCIPAL -->
          <tr>
            <td style="padding: 36px 48px 0 48px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:600;">Notificación del Sistema</p>
              <h2 style="margin:0 0 20px 0; color:#1e293b; font-size:26px; font-weight:300; line-height:1.3; letter-spacing:-0.5px;">Nueva Solicitud de Asesoría</h2>
              <div style="width:40px; height:3px; background:#cd7243; margin-bottom:24px;"></div>
              <p style="margin:0; font-size:15px; color:#475569; line-height:1.8;">
                Se ha registrado un nuevo afiliado en la Fundación Isla Cascajal que reside en Cali,
                <strong style="color:#1e293b; font-weight:600;">no cuenta con Sisbén</strong> y ha solicitado expresamente recibir asesoría para su inscripción.
              </p>
            </td>
          </tr>

          <!-- DATOS DEL CIUDADANO -->
          <tr>
            <td style="padding: 28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Datos de Contacto del Ciudadano</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9; width:40%;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Nombre Completo</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;">${formData.nombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Cédula (NUIP)</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;">${formData.cedula}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Teléfono</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;"><a href="tel:${formData.telefono}" style="color:#2563eb; text-decoration:none;">${formData.telefono}</a></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Correo</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;"><a href="mailto:${formData.correo}" style="color:#2563eb; text-decoration:none;">${formData.correo || "No proporcionado"}</a></p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Dirección</p>
                  </td>
                  <td style="padding:16px 24px;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;">${formData.direccion}, ${formData.ciudad}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- NOTA INSTITUCIONAL -->
          <tr>
            <td style="padding: 0 48px 36px 48px;">
              <div style="border-left: 2px solid #cd7243; padding-left: 16px;">
                <p style="margin:0; font-size:12px; color:#64748b; line-height:1.6;">
                  Esta alerta es generada automáticamente por el sistema de vinculación institucional de la Fundación Isla Cascajal.
                </p>
              </div>
            </td>
          </tr>

      ` + emailFooter();

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: CORREOS_SISBEN,
        subject: `Alerta Sisbén: ${formData.nombre} requiere asesoría (Cali)`,
        html,
      });

      return NextResponse.json({ success: true, data });
    }

    // ==========================================
    // 4. CORREO DE ALERTA ADMINISTRATIVA (NUEVA AFILIACIÓN)
    // ==========================================
    if (tipo === "alerta_admin_activacion") {
      const html = emailHeader("Notificación Administrativa", "#1e3a8a") + `

          <!-- SEPARADOR -->
          <tr><td style="height:8px; background:#f8fafc;"></td></tr>

          <!-- SALUDO Y MENSAJE PRINCIPAL -->
          <tr>
            <td style="padding: 36px 48px 0 48px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:600;">Reporte de Sistema</p>
              <h2 style="margin:0 0 20px 0; color:#1e293b; font-size:26px; font-weight:300; line-height:1.3; letter-spacing:-0.5px;">Nueva Afiliación Activa</h2>
              <div style="width:40px; height:3px; background:#1e3a8a; margin-bottom:24px;"></div>
              <p style="margin:0; font-size:15px; color:#475569; line-height:1.8;">
                El sistema de pagos ha confirmado una nueva transacción exitosa. 
                El siguiente usuario ahora se encuentra con estado <strong style="color:#16a34a; font-weight:600;">Activo</strong> en la plataforma.
              </p>
            </td>
          </tr>

          <!-- DATOS DEL PAGO Y USUARIO -->
          <tr>
            <td style="padding: 28px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <p style="margin:0; font-size:10px; color:#94a3b8; letter-spacing:2px; text-transform:uppercase; font-weight:700;">Detalles de la Afiliación</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9; width:45%;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Afiliado</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:600;">${formData.nombre}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Cédula</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;">${formData.cedula}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Código Institucional</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e3a8a; font-weight:700; font-family: 'Courier New', monospace;">${formData.codigoInstitucional || formData.codigo || "N/A"}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:12px; color:#64748b; font-weight:600;">Método de Pago</p>
                  </td>
                  <td style="padding:16px 24px; border-bottom:1px solid #f1f5f9;">
                    <p style="margin:0; font-size:14px; color:#1e293b; font-weight:500;">Wompi</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px; background:#f0fdf4;">
                    <p style="margin:0; font-size:12px; color:#166534; font-weight:600;">Monto Aprobado</p>
                  </td>
                  <td style="padding:16px 24px; background:#f0fdf4;">
                    <p style="margin:0; font-size:16px; color:#166534; font-weight:700;">$ ${formData.montoPagado || '---'} COP</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- NOTA INSTITUCIONAL -->
          <tr>
            <td style="padding: 0 48px 36px 48px;">
              <div style="border-left: 2px solid #1e3a8a; padding-left: 16px;">
                <p style="margin:0; font-size:12px; color:#64748b; line-height:1.6;">
                  Esta notificación es generada automáticamente por el módulo de pagos de la Fundación Isla Cascajal. No es necesario realizar ninguna acción manual para este usuario.
                </p>
              </div>
            </td>
          </tr>

      ` + emailFooter();

      const data = await resend.emails.send({
        from: CORREO_REMITENTE,
        to: CORREO_ADMIN,
        subject: `Alerta: Nueva Afiliación Activa - ${formData.nombre}`,
        html,
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Tipo de correo no válido" }, { status: 400 });

  } catch (error) {
    console.error("Error enviando correo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
