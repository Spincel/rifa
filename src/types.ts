/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PaymentStatus = 'PAGADO' | 'NO_PAGADO' | 'ABONADO';

export interface TicketReservation {
  number: number; // The number reserved (e.g., 0 to 99, or 1 to 100)
  buyerName: string;
  phone: string;
  status: PaymentStatus;
  amountPaid: number; // The amount paid (equals total price if PAGADO, 0 if NO_PAGADO, or partial if ABONADO)
  notes: string;
  reservedAt: string; // ISO String
}

export interface Raffle {
  id: string;
  title: string;
  prize: string;
  ticketPrice: number;
  totalNumbers: number; // e.g., 50, 100, 200, 500, 1000
  numberOffset: number; // 0 (start representing from 00) or 1 (start representing from 01)
  drawDate: string; // E.g. "2026-06-30"
  drawTime: string; // E.g. "20:00"
  currency: string; // E.g. "MXN", "USD", "COP", etc.
  reservations: { [number: number]: TicketReservation };
  ticketColor: string; // Theme color for this raffle ticket visual
  description?: string;
  spreadsheetId?: string; // Google Sheets ID linked to this raffle
  spreadsheetUrl?: string; // Google Sheets browser Link
}
