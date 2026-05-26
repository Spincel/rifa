/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Edit3, Clipboard, Star, Check, Trash2, ShieldAlert, Award, FileText } from 'lucide-react';
import { Raffle, TicketReservation, PaymentStatus } from '../types';
import { formatTicketNumber, formatCurrency } from '../utils';
import TicketCanvas from './TicketCanvas';

interface TicketFormModalProps {
  raffle: Raffle;
  number?: number | null;
  numbers?: number[];
  isAdmin: boolean;
  onSave: (num: number, reservation: TicketReservation) => void;
  onDelete?: (num: number) => void;
  onClose: () => void;
}

export default function TicketFormModal({ raffle, number, numbers, isAdmin, onSave, onDelete, onClose }: TicketFormModalProps) {
  const isMulti = !!numbers && numbers.length > 0;
  const existingReservation = isMulti ? undefined : (number ? raffle.reservations[number] : undefined);

  // Tab state: 'FORM' or 'TICKET'
  const [activeTab, setActiveTab] = useState<'FORM' | 'TICKET'>(existingReservation ? 'TICKET' : 'FORM');

  // Request flow state for non-admins
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form states
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('NO_PAGADO');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load existing data if edit mode
  useEffect(() => {
    if (existingReservation) {
      setBuyerName(existingReservation.buyerName);
      setPhone(existingReservation.phone);
      setStatus(existingReservation.status);
      setAmountPaid(existingReservation.amountPaid);
      setNotes(existingReservation.notes);
    } else {
      setBuyerName('');
      setPhone('');
      setStatus('NO_PAGADO');
      setAmountPaid(0);
      setNotes('');
    }
    setErrorMsg('');
    setIsSubmitted(false);
  }, [existingReservation, number, isMulti]);

  // Adjust paid amount according to payment status
  const handleStatusChange = (newStatus: PaymentStatus) => {
    setStatus(newStatus);
    if (newStatus === 'PAGADO') {
      setAmountPaid(raffle.ticketPrice);
    } else if (newStatus === 'NO_PAGADO') {
      setAmountPaid(0);
    } else {
      // For ABONADO, set to half or default partial
      setAmountPaid(Math.floor(raffle.ticketPrice / 2));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!buyerName.trim()) {
      setErrorMsg('Por favor introduce el nombre del participante.');
      return;
    }

    if (!isAdmin && !phone.trim()) {
      setErrorMsg('Por favor introduce tu número de teléfono (WhatsApp) para ponernos en contacto.');
      return;
    }

    if (isAdmin && status === 'ABONADO') {
      if (amountPaid <= 0) {
        setErrorMsg('El monto del abono debe ser mayor que 0.');
        return;
      }
      if (amountPaid >= raffle.ticketPrice) {
        setErrorMsg(`Para abonos, el monto debe ser menor al precio total del boleto (${formatCurrency(raffle.ticketPrice, raffle.currency)}). De lo contrario, selecciona "PAGADO".`);
        return;
      }
    }

    if (isMulti && numbers) {
      const reservedAt = new Date().toISOString();
      numbers.forEach((num) => {
        const payload: TicketReservation = {
          number: num,
          buyerName: buyerName.trim(),
          phone: phone.trim(),
          status: isAdmin ? status : 'NO_PAGADO', // Non-admins always reserve as unpaid/apartado first
          amountPaid: isAdmin ? (status === 'PAGADO' ? raffle.ticketPrice : (status === 'NO_PAGADO' ? 0 : amountPaid)) : 0,
          notes: isAdmin ? notes.trim() : 'Apartado por cliente desde la web (Multi)',
          reservedAt,
        };
        onSave(num, payload);
      });

      if (!isAdmin) {
        setIsSubmitted(true);
      } else {
        onClose();
      }
    } else if (number) {
      const payload: TicketReservation = {
        number,
        buyerName: buyerName.trim(),
        phone: phone.trim(),
        status: isAdmin ? status : 'NO_PAGADO', // Non-admins always reserve as unpaid/apartado first
        amountPaid: isAdmin ? (status === 'PAGADO' ? raffle.ticketPrice : (status === 'NO_PAGADO' ? 0 : amountPaid)) : 0,
        notes: isAdmin ? notes.trim() : 'Apartado por cliente desde la web',
        reservedAt: existingReservation ? existingReservation.reservedAt : new Date().toISOString(),
      };

      onSave(number, payload);
      
      if (!isAdmin) {
        setIsSubmitted(true);
      } else {
        // Switch to ticket view if successful (admin only)
        setActiveTab('TICKET');
      }
    }
  };

  const handleDelete = () => {
    if (number && onDelete) {
      if (window.confirm('¿Estás seguro de liberar este número? Se borrarán todos los datos del participante.')) {
        onDelete(number);
        onClose();
      }
    }
  };

  const numFormatted = number ? formatTicketNumber(number, raffle.totalNumbers) : '';

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 md:p-6 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-slate-50 text-slate-800 rounded-xl flex items-center justify-center font-mono text-xl font-bold tracking-tight border border-slate-200 select-none shadow-sm">
              {numFormatted}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-mono tracking-wider uppercase font-bold">Número de Boleto</p>
              <h3 className="text-base font-semibold text-slate-800">Gestión de Reservación</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-modal"
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation if reservation already exists */}
        {existingReservation && (
          <div className="flex bg-slate-55 bg-slate-50 p-1.5 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('TICKET')}
              id="tab-ticket-view"
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'TICKET'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Boleto Digital</span>
            </button>
            <button
              onClick={() => setActiveTab('FORM')}
              id="tab-form-view"
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === 'FORM'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Editar Registro</span>
            </button>
          </div>
        )}

         {/* Modal Body container with scrollbars */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto bg-slate-50/40">
          {activeTab === 'TICKET' && existingReservation ? (
            <TicketCanvas
              raffle={raffle}
              reservation={existingReservation}
              onClose={onClose}
            />
          ) : isSubmitted ? (
            <div className="max-w-md mx-auto text-center py-8 px-4 space-y-6 font-sans animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce shadow-sm">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {isMulti ? '¡Boletos Pre-Apartados!' : '¡Boleto Pre-Apartado!'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  ID: #{isMulti ? formatTicketNumber(numbers![0], raffle.totalNumbers) : numFormatted}-{Date.now().toString().slice(-4)}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3.5 text-left shadow-sm">
                <div className="flex flex-col gap-1 text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-400 font-semibold uppercase font-mono">
                    {isMulti ? 'Boletos Seleccionados:' : 'Boleto Seleccionado:'}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isMulti ? (
                      numbers!.map(n => (
                        <span key={n} className="text-indigo-750 font-extrabold font-mono text-xs bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-150 border-indigo-100 uppercase">
                          #{formatTicketNumber(n, raffle.totalNumbers)}
                        </span>
                      ))
                    ) : (
                      <span className="text-indigo-650 font-extrabold font-mono text-xs bg-indigo-55 px-2 py-0.5 rounded-lg border border-indigo-200">
                        #{numFormatted}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs space-y-1 text-slate-600">
                  <p><strong>A nombre de:</strong> {buyerName}</p>
                  <p><strong>Teléfono:</strong> {phone}</p>
                  <p><strong>Rifa:</strong> {raffle.title}</p>
                  <p><strong>Monto Total:</strong> <span className="text-emerald-600 font-extrabold">{formatCurrency((isMulti ? numbers!.length : 1) * raffle.ticketPrice, raffle.currency)}</span></p>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-3 rounded-xl font-medium leading-relaxed">
                  ⚠️ <strong>Instrucciones:</strong> Tu reservación está pre-apartada. Envía un mensaje de WhatsApp al administrador usando el botón de abajo para coordinar tu método de pago y confirmarlo.
                </div>
              </div>

               <div className="space-y-3 pt-2">
                <a
                  href={`https://wa.me/${raffle.adminPhone ? raffle.adminPhone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(
                    isMulti
                      ? `¡Hola! Acabo de apartar los boletos: ${numbers!.map(n => `#` + formatTicketNumber(n, raffle.totalNumbers)).join(', ')} para el sorteo "${raffle.title}". Mi nombre es ${buyerName.trim()}. ¿Cómo realizo el pago para confirmarlos?`
                      : `¡Hola! Acabo de apartar el boleto #${numFormatted} para el sorteo "${raffle.title}". Mi nombre es ${buyerName.trim()}. ¿Cómo realizo el pago para confirmarlo?`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  id="btn-whatsapp-redirect"
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center space-x-2 text-sm cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.264 2.266 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.454L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.98 14.133.953 11.538.95c-5.433 0-9.859 4.37-9.863 9.8.001 2.03.547 4.022 1.585 5.811L2.254 21.8l5.393-1.411c1.6.873 3.321 1.332 4.962 1.334zM17.91 14.86c-.347-.172-2.054-1.002-2.37-1.117-.317-.116-.549-.172-.78.172-.23.344-.891 1.117-1.092 1.346-.201.23-.404.258-.75.086-1.58-.751-2.616-1.303-3.659-3.078-.276-.469.276-.435.79-1.444.086-.172.043-.323-.021-.453-.064-.13-.55-1.31-.752-1.8-.198-.477-.399-.413-.549-.42-.142-.007-.305-.007-.468-.007-.163 0-.427.06-.65.305-.224.24-.855.828-.855 2.016 0 1.187.873 2.33 1.0 2.5.122.164 1.71 2.585 4.14 3.619 1.99.845 2.502.72 3.4.529.569-.122 1.712-.693 1.953-1.365.241-.673.241-1.25.17-1.365-.07-.116-.273-.172-.62-.344z"/>
                  </svg>
                  <span>Enviar WhatsApp al Administrador</span>
                </a>

                {/* Let clients see their first digital ticket block only if single */}
                {!isMulti && number && (
                  <button
                    type="button"
                    onClick={() => {
                      raffle.reservations[number] = {
                        number,
                        buyerName: buyerName.trim(),
                        phone: phone.trim(),
                        status: 'NO_PAGADO',
                        amountPaid: 0,
                        notes: 'Pre-apartado',
                        reservedAt: new Date().toISOString()
                      };
                      setActiveTab('TICKET');
                      setIsSubmitted(false);
                    }}
                    id="btn-view-receipt-unpaid"
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer font-sans"
                  >
                    🎫 Ver mi Boleto Digital
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  id="btn-close-sub"
                  className="w-full py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer font-sans"
                >
                  Volver al listado
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 max-w-2xl mx-auto">
              
              {/* Alert Feedback Messages */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-000 text-red-800 p-3.5 rounded-2xl text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Informative Header */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex justify-between items-center text-xs font-sans">
                <div>
                  <span className="text-slate-400 uppercase font-mono tracking-wider block mb-1">Rifa Activa</span>
                  <strong className="text-slate-800 text-sm">{raffle.title}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase font-mono tracking-wider block mb-1">
                    {isMulti ? `Precio Total (${numbers!.length} Boletos)` : 'Precio por Boleto'}
                  </span>
                  <strong className="text-emerald-600 text-sm font-bold">
                    {isMulti 
                      ? formatCurrency(raffle.ticketPrice * numbers!.length, raffle.currency)
                      : formatCurrency(raffle.ticketPrice, raffle.currency)
                    }
                  </strong>
                </div>
              </div>

              {/* Participant details segment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Datos del Comprador
                </h4>

                {/* List of multi tickets display if there are many */}
                {isMulti && (
                  <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold font-mono">Números Seleccionados a tu nombre:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {numbers!.map(num => (
                        <span key={num} className="inline-block text-xs font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-150 border-indigo-100 px-2 py-0.5 rounded-md">
                          #{formatTicketNumber(num, raffle.totalNumbers)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="buyerName" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="buyerName"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                    required
                  />
                </div>

                {/* WhatsApp Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Número de Teléfono (WhatsApp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 1234567890"
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                    required={!isAdmin}
                  />
                  <p className="text-[10px] text-slate-400">Introduce código de país para que WhatsApp direccione automáticamente sin agregar el contacto.</p>
                </div>

                {/* Observation / Notes - Admin Only */}
                {isAdmin && (
                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Observaciones o Notas
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Es amigo de la familia, me paga el viernes..."
                      rows={2}
                      className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Finances and payment block - Admin Only */}
              {isAdmin && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Estado del Pago
                  </h4>

                  {/* Status Segment controls */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('NO_PAGADO')}
                      className={`p-3 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                        status === 'NO_PAGADO'
                          ? 'bg-rose-500 border-rose-300 text-white shadow-sm font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      🚫 RESERVADO
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('ABONADO')}
                      className={`p-3 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                        status === 'ABONADO'
                          ? 'bg-amber-400 border-amber-300 text-white shadow-sm font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ ABONADO
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('PAGADO')}
                      className={`p-3 text-xs font-semibold rounded-xl border text-center transition cursor-pointer ${
                        status === 'PAGADO'
                          ? 'bg-emerald-500 border-emerald-300 text-white shadow-sm font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      ✅ PAGADO
                    </button>
                  </div>

                  {/* Dynamic custom amount for ABONADO status */}
                  {status === 'ABONADO' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fade-in">
                      <label htmlFor="amountPaid" className="text-xs font-semibold text-amber-900">
                        Monto del Abono Realizado
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-slate-505 text-slate-500 text-xs font-bold">$</span>
                        </div>
                        <input
                          type="number"
                          id="amountPaid"
                          value={amountPaid === 0 ? '' : amountPaid}
                          onChange={(e) => setAmountPaid(Number(e.target.value))}
                          placeholder="Ej. 50"
                          className="w-full text-sm pl-7 pr-4 py-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-slate-800"
                          min="1"
                          max={raffle.ticketPrice - 1}
                          required
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-amber-700 font-medium font-sans">
                        <span>Precio total del boleto: {formatCurrency(raffle.ticketPrice, raffle.currency)}</span>
                        <span>Pendiente regular: {formatCurrency(raffle.ticketPrice - (amountPaid || 0), raffle.currency)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Form Action deck */}
              <div className="flex items-center justify-between pt-2">
                {isAdmin && existingReservation ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition duration-150 flex items-center space-x-1.5 focus:ring-2 focus:ring-red-200 cursor-pointer animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Liberar Número</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-150 cursor-pointer font-sans"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition duration-150 shadow-sm cursor-pointer flex items-center space-x-1.5 font-sans"
                  >
                    <Star className="w-4 h-4 fill-white text-white" />
                    <span>{isAdmin ? 'Confirmar Registro' : 'Apartar Boleto'}</span>
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
