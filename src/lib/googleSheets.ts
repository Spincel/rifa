/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Raffle, TicketReservation } from '../types';
import { formatTicketNumber } from '../utils';

/**
 * Creates a brand new Google Sheet in the user's Google Drive.
 * Generates two tabs: "Configuración Rifa" and "Boletos y Participantes".
 */
export async function createRaffleSpreadsheet(
  accessToken: string,
  raffle: Raffle
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  
  const body = {
    properties: {
      title: `Rifa Digital - ${raffle.title}`,
    },
    sheets: [
      {
        properties: {
          title: 'Configuración Rifa',
          gridProperties: {
            columnCount: 3,
            rowCount: 15,
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'Boletos y Participantes',
          gridProperties: {
            columnCount: 7,
            rowCount: Math.min(1000, raffle.totalNumbers + 100),
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Error creating spreadsheet:', errText);
    throw new Error(`No se pudo crear la Google Sheet: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

/**
 * Syncs the active Raffle details and its ticket reservations to Google Sheets.
 * Clears old lines in the ticket tab to ensure zero residuals/stale data.
 */
export async function syncRaffleToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  raffle: Raffle
): Promise<boolean> {
  // 1. Prepare Config Sheet Values
  const configValues: (string | number)[][] = [
    ['Atributo', 'Valor', 'Descripción de Campo'],
    ['ID Rifa', raffle.id, 'Identificador único interno para la aplicación (No modificar)'],
    ['Título Sorteo', raffle.title, 'Nombre de la rifa activa'],
    ['Premio Principal', raffle.prize, 'Premio que se entregará al ganador de la tómbola'],
    ['Precio Boleto', raffle.ticketPrice, 'Costo por cada número'],
    ['Total de Boletos', raffle.totalNumbers, 'Cantidad máxima de números en juego'],
    ['Fecha Sorteo', raffle.drawDate === 'Por definir' ? 'Pendiente por confirmar' : raffle.drawDate, 'Fecha oficial del sorteo'],
    ['Hora Sorteo', raffle.drawTime === 'Por definir' ? 'Pendiente' : raffle.drawTime, 'Hora oficial del sorteo'],
    ['Moneda', raffle.currency, 'Moneda utilizada (ej: MXN, USD, COP)'],
    ['Descripción', raffle.description || 'Sin descripción', 'Detalles de la rifa o instrucciones'],
    ['Última Sincronización', new Date().toLocaleString('es-MX'), 'Registro temporal del último guardado automático'],
  ];

  // 2. Prepare Ticket Reservations Values
  // Read all reservations, sort them numerically
  const reservationsList = Object.values(raffle.reservations) as TicketReservation[];
  const sortedReservations = [...reservationsList].sort((a, b) => a.number - b.number);

  const ticketValues: (string | number)[][] = [
    [
      'Boleto #',
      'Participante (Comprador)',
      'Teléfono Contacto',
      'Suscripción / Estado',
      'Monto Abonado',
      'Notas / Comentario',
      'Fecha Apartado',
    ],
  ];

  sortedReservations.forEach((res) => {
    const formattedNum = formatTicketNumber(res.number, raffle.totalNumbers);
    ticketValues.push([
      formattedNum,
      res.buyerName,
      res.phone || '',
      res.status, // 'PAGADO', 'NO_PAGADO', 'ABONADO'
      res.amountPaid,
      res.notes || '',
      res.reservedAt ? new Date(res.reservedAt).toLocaleString('es-MX') : '',
    ]);
  });

  try {
    // 3. Clear previous values on "Boletos y Participantes" so no stale values remain at the bottom
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Boletos y Participantes!A1:G1500:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 4. Update Configuración Rifa values
    const configUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Configuración Rifa!A1:C12?valueInputOption=USER_ENTERED`;
    const configResp = await fetch(configUpdateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: configValues }),
    });

    if (!configResp.ok) {
      throw new Error(`Fallo actualizando Configuración: ${configResp.statusText}`);
    }

    // 5. Update Boletos y Participantes values
    const ticketUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Boletos y Participantes!A1:G${ticketValues.length}?valueInputOption=USER_ENTERED`;
    const ticketResp = await fetch(ticketUpdateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: ticketValues }),
    });

    if (!ticketResp.ok) {
      throw new Error(`Fallo actualizando Participantes: ${ticketResp.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error in syncRaffleToSpreadsheet:', error);
    return false;
  }
}
