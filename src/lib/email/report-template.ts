interface ReportData {
  courseName: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  announcements: { title: string; content: string }[];
  publicUrl: string;
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function buildReportHTML(data: ReportData): string {
  const announcementsHTML = data.announcements
    .slice(0, 3)
    .map(
      (a) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #1e293b;">${a.title}</p>
          <p style="margin: 0; color: #64748b; font-size: 14px;">${a.content.substring(0, 150)}${a.content.length > 150 ? '...' : ''}</p>
        </td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte ${data.courseName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #312e81, #4338ca); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${data.courseName}</h1>
              <p style="margin: 8px 0 0; color: #c7d2fe; font-size: 14px;">Reporte Financiero ${data.year}</p>
            </td>
          </tr>

          <!-- Financial Summary -->
          <tr>
            <td style="padding: 24px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px;">Resumen Financiero</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f0fdf4; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Ingresos</p>
                    <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #16a34a;">${formatCLP(data.totalIncome)}</p>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 12px 16px; background-color: #fef2f2; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Egresos</p>
                    <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #dc2626;">${formatCLP(data.totalExpense)}</p>
                  </td>
                  <td style="width: 8px;"></td>
                  <td style="padding: 12px 16px; background-color: #eef2ff; border-radius: 8px; width: 33%;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Saldo</p>
                    <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: ${data.balance >= 0 ? '#16a34a' : '#dc2626'};">${formatCLP(data.balance)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            data.announcements.length > 0
              ? `
          <!-- Announcements -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 18px;">Anuncios Recientes</h2>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${announcementsHTML}
              </table>
            </td>
          </tr>`
              : ''
          }

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 32px; text-align: center;">
              <a href="${data.publicUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #312e81, #4338ca); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Ver detalle completo
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                ${data.courseName} · ${data.year}<br>
                Este correo fue enviado desde la plataforma de Tesorería.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
