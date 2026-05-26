/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Download, Share2, Check, Copy, AlertTriangle, Calendar, Award, Phone, Clock, DollarSign } from 'lucide-react';
import { Raffle, TicketReservation } from '../types';
import { formatTicketNumber, formatCurrency, generateWhatsAppMessage, getWhatsAppShareUrl } from '../utils';

interface TicketCanvasProps {
  raffle: Raffle;
  reservation: TicketReservation;
  onClose?: () => void;
}

const COLOR_MAPS: { [key: string]: { main: string; dark: string; light: string; bg: string; text: string } } = {
  emerald: { main: '#10b981', dark: '#047857', light: '#d1fae5', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800' },
  blue: { main: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  amber: { main: '#f59e0b', dark: '#b45309', light: '#fef3c7', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  rose: { main: '#f43f5e', dark: '#be123c', light: '#ffe4e6', bg: 'bg-rose-50 border-rose-200', text: 'text-rose-800' },
  violet: { main: '#8b5cf6', dark: '#6d28d9', light: '#ede9fe', bg: 'bg-violet-50 border-violet-200', text: 'text-violet-800' },
  red: { main: '#ef4444', dark: '#b91c1c', light: '#fee2e2', bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
  charcoal: { main: '#475569', dark: '#1e293b', light: '#f1f5f9', bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
};

export default function TicketCanvas({ raffle, reservation, onClose }: TicketCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState<string>('');
  const colorScheme = COLOR_MAPS[raffle.ticketColor || 'emerald'] || COLOR_MAPS.emerald;

  const numFormatted = formatTicketNumber(reservation.number, raffle.totalNumbers);
  const priceFormatted = formatCurrency(raffle.ticketPrice, raffle.currency);
  const paidFormatted = formatCurrency(reservation.amountPaid, raffle.currency);
  const dateFormatted = () => {
    if (!raffle.drawDate || raffle.drawDate === 'Por definir' || raffle.drawDate === 'PENDIENTE') {
      return 'Por definir';
    }
    const [year, month, day] = raffle.drawDate.split('-');
    return day && month && year ? `${day}/${month}/${year}` : raffle.drawDate;
  };

  // Generate dynamic canvas image to be able to download/share as file
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High fidelity setup (double or triple device resolution)
    const w = 1200;
    const h = 500;
    canvas.width = w;
    canvas.height = h;

    // Fill background with elegant subtle gradient
    const themeBg = ctx.createLinearGradient(0, 0, w, h);
    themeBg.addColorStop(0, '#ffffff');
    themeBg.addColorStop(1, '#f8fafc');
    ctx.fillStyle = themeBg;
    ctx.fillRect(0, 0, w, h);

    // Draw main outer rounded ticket block with border
    ctx.lineWidth = 14;
    ctx.strokeStyle = colorScheme.main;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 15, 15, w - 30, h - 30, 24, true, true);

    // Dynamic pattern overlay on left (the ticket theme color bar)
    ctx.fillStyle = colorScheme.main;
    ctx.fillRect(15, 15, 60, h - 30);

    // Perforation background circles logic (perforated left-stub separator at x = 320)
    const px = 320;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(px, 20);
    ctx.lineTo(px, h - 20);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw the perforated cuts at top and bottom overlaying the white circles
    ctx.fillStyle = '#f1f5f9'; // Matching outer canvas context or transparent background simulation
    ctx.strokeStyle = colorScheme.main;
    ctx.lineWidth = 8;
    // Top perforation notch
    ctx.beginPath();
    ctx.arc(px, 15, 24, 0, Math.PI, false);
    ctx.fill();
    ctx.stroke();
    // Bottom perforation notch
    ctx.beginPath();
    ctx.arc(px, h - 15, 24, 0, Math.PI, true);
    ctx.fill();
    ctx.stroke();

    // -------------------------------------------------------------
    // LEFT STUB DESIGN (CONTROL TALONARIO)
    // -------------------------------------------------------------
    ctx.fillStyle = colorScheme.dark;
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.fillText('TALONARIO CONTROL', 95, 60);

    ctx.fillStyle = '#475569';
    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillText('RIFA / SORTEO:', 95, 110);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px Helvetica, Arial, sans-serif';
    wrapText(ctx, raffle.title, 95, 135, 210, 24);

    ctx.fillStyle = '#475569';
    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillText('PARTICIPANTE:', 95, 220);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    wrapText(ctx, reservation.buyerName, 95, 245, 210, 24);

    ctx.fillStyle = '#475569';
    ctx.font = '16px Helvetica, Arial, sans-serif';
    ctx.fillText('TELÉFONO:', 95, 310);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.fillText(reservation.phone || 'Sin registro', 95, 335);

    // Large Ticket number on stub
    ctx.fillStyle = colorScheme.main;
    ctx.font = 'bold 50px Courier New, monospace';
    ctx.fillText(`No. ${numFormatted}`, 95, 415);

    // Stub vertical stamp bar
    ctx.save();
    ctx.translate(px - 15, h - 80);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.fillText(`VERIFICACIÓN_TALÓN_#${raffle.id.slice(0,4)}`, 0, 0);
    ctx.restore();

    // -------------------------------------------------------------
    // MAIN TICKET BODY DESIGN
    // -------------------------------------------------------------
    // Header title of the event
    ctx.fillStyle = colorScheme.dark;
    ctx.font = 'bold 36px Helvetica, Arial, sans-serif';
    ctx.fillText(raffle.title.toUpperCase(), 370, 75);

    // Subtitle badge
    ctx.fillStyle = colorScheme.light;
    roundRect(ctx, 370, 95, 230, 36, 6, true, false);
    ctx.fillStyle = colorScheme.dark;
    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillText('🎟️ BOLETO DE PARTICIPACIÓN', 385, 118);

    // Award/Prize label
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.fillText('🏆 PREMIO PRINCIPAL:', 370, 180);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
    wrapText(ctx, raffle.prize, 370, 215, 480, 34);

    // Ticket holder details
    ctx.fillStyle = '#475569';
    ctx.font = '18px Helvetica, Arial, sans-serif';
    ctx.fillText('👤 PARTICIPANTE Y CONTACTO:', 370, 310);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px Helvetica, Arial, sans-serif';
    ctx.fillText(`${reservation.buyerName} [${reservation.phone || 'S/N'}]`, 370, 340);

    // Draw date & time Info
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillText('📅 SORTEO:', 370, 395);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    const isTbd = !raffle.drawDate || raffle.drawDate === 'Por definir' || raffle.drawDate === 'PENDIENTE';
    const drawTimeFormatted = isTbd || !raffle.drawTime || raffle.drawTime === 'Por definir' ? '' : ` - ${raffle.drawTime} hrs`;
    ctx.fillText(`${dateFormatted()}${drawTimeFormatted}`, 370, 422);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillText('💰 COSTO:', 650, 395);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px Helvetica, Arial, sans-serif';
    ctx.fillText(`${priceFormatted}`, 650, 422);

    // -------------------------------------------------------------
    // BIG BEAUTIFUL VISUAL NUMBER CORNER (Right layout)
    // -------------------------------------------------------------
    ctx.fillStyle = colorScheme.light;
    roundRect(ctx, 890, 40, 270, 160, 16, true, false);

    ctx.fillStyle = colorScheme.dark;
    ctx.font = 'bold 14px Helvetica, Arial, sans-serif';
    ctx.fillText('NÚMERO ASIGNADO', 955, 75);

    ctx.fillStyle = colorScheme.dark;
    ctx.font = 'bold 72px Courier New, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(numFormatted, 1025, 155);
    ctx.textAlign = 'left'; // Reset standard left alignment

    // -------------------------------------------------------------
    // DYNAMIC FAKE BARCODE FOR AMAZING GAME DESIGN AESTHETICS
    // -------------------------------------------------------------
    const bX = 890;
    const bY = 230;
    const bW = 270;
    const bH = 65;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bX - 10, bY - 10, bW + 20, bH + 35);
    // Draw barcodes pattern
    const barcodeCodeStr = `${raffle.id.slice(0, 3)}${numFormatted}${reservation.phone.slice(-4)}`;
    ctx.fillStyle = '#0f172a';
    let currX = bX + 5;
    for (let j = 0; j < barcodeCodeStr.length; j++) {
      const charCode = barcodeCodeStr.charCodeAt(j);
      const w1 = (charCode % 4) + 1;
      const w2 = ((charCode + j) % 3) + 1;
      ctx.fillRect(currX, bY, w1 * 2, bH);
      currX += w1 * 2 + 2;
      ctx.fillRect(currX, bY, w2, bH);
      currX += w2 + 2;
    }
    // Barcode subtitle text
    ctx.fillStyle = '#475569';
    ctx.font = '13px Courier New, monospace';
    ctx.fillText(`ID-${raffle.id.slice(0,4).toUpperCase()}-${numFormatted}`, bX + 45, bY + bH + 18);

    // -------------------------------------------------------------
    // VINTAGE DIAGONAL PHYSICAL PAYMENT STAMP
    // -------------------------------------------------------------
    ctx.save();
    ctx.translate(1020, 380);
    ctx.rotate(-0.16); // Subtle slant

    if (reservation.status === 'PAGADO') {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.lineWidth = 5;
      // Stamp borders
      roundRect(ctx, -110, -35, 210, 70, 10, false, true);
      // Double inner border
      roundRect(ctx, -104, -30, 198, 60, 6, false, true);
      // Main text
      ctx.font = 'extrabold 32px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAGADO', -5, 12);
    } else if (reservation.status === 'ABONADO') {
      ctx.strokeStyle = '#ec4899';
      ctx.fillStyle = '#ec4899';
      ctx.lineWidth = 5;
      roundRect(ctx, -110, -35, 210, 70, 10, false, true);
      roundRect(ctx, -104, -30, 198, 60, 6, false, true);
      ctx.font = 'extrabold 22px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ABONADO', -5, -3);
      ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
      ctx.fillText(`PAGO DE ${paidFormatted}`, -5, 18);
    } else {
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 5;
      roundRect(ctx, -110, -35, 210, 70, 10, false, true);
      roundRect(ctx, -104, -30, 198, 60, 6, false, true);
      ctx.font = 'extrabold 24px Helvetica, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('APARTADO', -5, 10);
    }
    ctx.restore();

    // Export canvas image to storage state so standard image tags can view it easily (enabling tap and hold to share on iOS/Android!)
    try {
      setCanvasUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.error('Failed to export canvas URL', e);
    }
  }, [raffle, reservation, colorScheme]);

  // Support round rectangular border drawing on standard Canvas rendering
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke: boolean) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  // Support multiline text alignment wrapped within specific maximum pixel widths
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  const handleDownloadImage = () => {
    if (!canvasUrl) return;
    const link = document.createElement('a');
    link.download = `Boleto_Rifa_${numFormatted}.png`;
    link.href = canvasUrl;
    link.click();
  };

  const formattedMsg = generateWhatsAppMessage(raffle, reservation);
  const waUrl = getWhatsAppShareUrl(reservation.phone, formattedMsg);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formattedMsg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-4xl mx-auto p-2">
      {/* Visual Ticket Demonstration */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Ticket Action Deck */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 font-sans">
          <div className="flex items-center space-x-2 text-slate-700 font-sans">
            <span className="p-2 bg-slate-200/50 rounded-lg border border-slate-200">
              <Award className="w-5 h-5 text-slate-708 text-slate-600" />
            </span>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold font-mono uppercase tracking-wider">Previsualización de Boleto</p>
              <h4 className="text-sm font-bold text-slate-800">No. {numFormatted} para {reservation.buyerName}</h4>
            </div>
          </div>
          <div className="flex items-center gap-2 font-sans">
            <button
              onClick={handleCopyText}
              id={`btn-copy-ticket-${reservation.number}`}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition duration-150 flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar texto</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadImage}
              id={`btn-download-${reservation.number}`}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-150 flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG</span>
            </button>
          </div>
        </div>

        {/* Dynamic Canvas preview hidden offscreen or kept small, showing reactive image block in full view */}
        <div className="p-4 md:p-8 flex items-center justify-center bg-slate-800">
          <canvas ref={canvasRef} className="hidden" />
          {canvasUrl ? (
            <img
              src={canvasUrl}
              alt="Boleto Digital"
              referrerPolicy="no-referrer"
              className="w-full max-w-3xl rounded-xl shadow-2xl border border-slate-700 transition transform hover:scale-[1.01] duration-300 pointer-events-auto"
            />
          ) : (
            <div className="py-20 text-center text-slate-400 font-medium">Generando boleto interactivo...</div>
          )}
        </div>

        {/* Customer Interaction Segment */}
        <div className="p-5 md:p-6 bg-white border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans">
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-500" /> Enviar por WhatsApp
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Puedes enviar el boleto digital al participante directamente. Hay dos formas recomendadas de hacerlo:
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-500 space-y-2 pl-1">
                <li>Haz clic en <strong className="text-slate-700 font-semibold">"Descargar PNG"</strong> arriba para guardar la imagen del boleto.</li>
                <li>Haz clic en el botón de WhatsApp abajo para abrir la conversación de chat pre-redactada.</li>
                <li>En WhatsApp, simplemente <strong className="text-slate-700 font-semibold">adjunta la imagen descargada</strong> en ese chat de conversación.</li>
              </ol>

              {reservation.phone ? (
                <div className="pt-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    id={`btn-wa-direct-${reservation.number}`}
                    className="inline-flex items-center justify-center w-full px-5 py-3 tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition transform active:scale-95 duration-150 cursor-pointer font-sans text-xs"
                  >
                    <svg className="w-4.5 h-4.5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.015 14.12 1.01H11.5c-5.438 0-9.863 4.372-9.867 9.802-.001 1.776.471 3.513 1.365 5.05L1.933 21.84l6.103-1.597c.01-.002.3-.01.611.111zm12.355-7.558c-.33-.165-1.951-.963-2.251-1.072-.3-.109-.518-.164-.736.164-.218.328-.84.736-1.03 1.072-.18.337-.363.382-.693.218-.33-.164-1.396-.514-2.66-1.642-1.09-.972-1.825-2.172-2.039-2.527-.214-.355-.023-.547.142-.711.148-.148.33-.385.495-.578.165-.192.219-.328.33-.547.11-.219.055-.411-.028-.574-.083-.164-.736-1.772-1.009-2.427-.266-.641-.539-.553-.736-.563-.19-.01-.409-.012-.628-.012-.218 0-.573.082-.873.411-.3.328-1.147 1.12-1.147 2.73s1.173 3.163 1.337 3.382c.164.218 2.31 3.526 5.596 4.945.782.337 1.392.539 1.871.691.785.25 1.5.215 2.065.13.63-.095 1.951-.797 2.224-1.53.272-.733.272-1.362.191-1.492-.08-.13-.3-.213-.63-.377z"/>
                    </svg>
                    <span>Abrir Chat con {reservation.buyerName}</span>
                  </a>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-3.5 text-xs flex items-center space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Este participante no tiene número de teléfono guardado. Agrega un teléfono para habilitar el link de WhatsApp.</span>
                </div>
              )}
            </div>

            {/* Structured Text Preview panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Texto Redactado Complementario</h4>
              <div className="bg-white rounded border border-slate-200 p-4 font-mono text-[11px] text-slate-700 leading-relaxed max-h-[190px] overflow-y-auto whitespace-pre-wrap select-all">
                {formattedMsg}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                💡 Al presionar el botón de WhatsApp abrirás el chat, podrás pegar este texto que ya se copia de forma asistida o escribirle al usuario.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
