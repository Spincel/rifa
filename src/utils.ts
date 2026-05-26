/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Raffle, TicketReservation } from './types';

/**
 * Pads a number with leading zeros depending on the total numbers in the raffle.
 */
export function formatTicketNumber(num: number, totalNumbers: number): string {
  const digits = Math.max(2, Math.ceil(Math.log10(totalNumbers || 100)));
  return String(num).padStart(digits, '0');
}

/**
 * Formats value as currency
 */
export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generates a WhatsApp share URL with pre-filled message text.
 */
export function getWhatsAppShareUrl(phone: string, text: string): string {
  // Clear any non-numeric symbols from phone
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  // If phone doesn't have country code and we want to allow standard dial
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Formats a long beautiful WhatsApp text message for the buyer
 */
export function generateWhatsAppMessage(raffle: Raffle, reservation: TicketReservation): string {
  const formattedNum = formatTicketNumber(reservation.number, raffle.totalNumbers);
  const ticketCost = formatCurrency(raffle.ticketPrice, raffle.currency);
  const amountPaidFormatted = formatCurrency(reservation.amountPaid, raffle.currency);
  const pendingAmount = raffle.ticketPrice - reservation.amountPaid;
  const pendingFormatted = formatCurrency(pendingAmount, raffle.currency);

  let paymentStatusEmoji = '❓';
  let paymentText = '';

  if (reservation.status === 'PAGADO') {
    paymentStatusEmoji = '✅ *PAGADO*';
    paymentText = `¡Muchas gracias por tu apoyo! Tu boleto está totalmente validado para el sorteo.`;
  } else if (reservation.status === 'ABONADO') {
    paymentStatusEmoji = '🟡 *ABONADO*';
    paymentText = `Has abonado: ${amountPaidFormatted}.\n⏳ Pendiente por liquidar: *${pendingFormatted}*.`;
  } else {
    paymentStatusEmoji = '❌ *APARTADO (PENDIENTE DE PAGO)*';
    paymentText = `Por favor, realiza el pago de *${ticketCost}* para confirmar tu boleto.`;
  }

  // Format draw date
  const isTbd = !raffle.drawDate || raffle.drawDate === 'Por definir' || raffle.drawDate === 'PENDIENTE';
  const drawTimeText = isTbd || !raffle.drawTime || raffle.drawTime === 'Por definir' ? '' : ` a las ${raffle.drawTime} hrs`;
  const [year, month, day] = raffle.drawDate ? raffle.drawDate.split('-') : ['', '', ''];
  const formattedDate = isTbd ? 'Por definir' : (day && month && year ? `${day}/${month}/${year}` : raffle.drawDate);

  return `🎟️ *BOLETO DIGITAL - ${raffle.title.toUpperCase()}* 🎟️

Hola *${reservation.buyerName}*, aquí tienes los detalles de tu boleto:

━━━━━━━━━━━━━━━━━━━━━
🔢 *NÚMERO:* ¡ *${formattedNum}* !
🎁 *PREMIO:* ${raffle.prize}
💰 *COSTO:* ${ticketCost}
📅 *FECHA SORTEO:* ${formattedDate}${drawTimeText}
💳 *ESTADO:* ${paymentStatusEmoji}
━━━━━━━━━━━━━━━━━━━━━

${paymentText}

${reservation.notes ? `📝 *Observaciones:* ${reservation.notes}\n` : ''}
📍 *Identificador único:* #${raffle.id.slice(0, 4)}-${formattedNum}

¡Mucha suerte! 🍀✨`;
}
