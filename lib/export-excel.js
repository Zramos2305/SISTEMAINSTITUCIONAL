/**
 * Utilidad para exportar datos a Excel (.xls / .csv) de forma 100% compatible con Microsoft Excel en español.
 * Soporta tildes, caracteres especiales, formato de tablas y encabezados estilizados.
 */

export function exportarAExcel({ nombreArchivo, titulo, columnas, datos }) {
  if (!datos || datos.length === 0) {
    throw new Error("No hay datos para exportar");
  }

  // Construir filas de la tabla HTML compatible con Excel
  const encabezadosHtml = columnas
    .map(
      (col) =>
        `<th style="background-color: #2D3748; color: #FFFFFF; font-weight: bold; border: 1px solid #CBD5E0; padding: 8px 12px; text-align: left;">${col.header}</th>`
    )
    .join("");

  const filasHtml = datos
    .map((fila, index) => {
      const bgColor = index % 2 === 0 ? "#FFFFFF" : "#F7FAFC";
      const celdas = columnas
        .map((col) => {
          let valor = "";
          if (typeof col.transform === "function") {
            valor = col.transform(fila);
          } else if (col.key && fila[col.key] !== undefined && fila[col.key] !== null) {
            valor = fila[col.key];
          }

          // Formatear arreglos u objetos si los hay
          if (Array.isArray(valor)) {
            valor = valor.map(v => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
          } else if (typeof valor === "object" && valor !== null) {
            valor = JSON.stringify(valor);
          }

          // Escapar HTML básico
          const valorStr = String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          return `<td style="border: 1px solid #CBD5E0; padding: 6px 10px; background-color: ${bgColor}; font-family: Calibri, Arial, sans-serif; font-size: 11pt;">${valorStr}</td>`;
        })
        .join("");

      return `<tr>${celdas}</tr>`;
    })
    .join("");

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${titulo || "Datos"}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; }
          th { text-align: left; font-size: 11pt; }
          td { font-size: 10pt; }
        </style>
      </head>
      <body>
        ${titulo ? `<h2 style="font-family: Calibri, Arial; color: #1A365D; margin-bottom: 8px;">${titulo}</h2>` : ""}
        <p style="font-family: Calibri, Arial; font-size: 9pt; color: #718096; margin-bottom: 12px;">Generado el: ${new Date().toLocaleString("es-CO")}</p>
        <table>
          <thead>
            <tr>${encabezadosHtml}</tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + template], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fechaStr = new Date().toISOString().split("T")[0];
  a.download = `${nombreArchivo || "Exportacion"}_${fechaStr}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
