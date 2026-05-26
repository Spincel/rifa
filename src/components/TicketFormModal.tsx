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
  number: number;
  onSave: (num: number, reservation: TicketReservation) => void;
  onDelete: (num: number) => void;
  onClose: () => void;
}

export default function TicketFormModal({ raffle, number, onSave, onDelete, onClose }: TicketFormModalProps) {
  const existingReservation = raffle.reservations[number];

  // Tab state: 'FORM' or 'TICKET'
  const [activeTab, setActiveTab] = useState<'FORM' | 'TICKET'>(existingReservation ? 'TICKET' : 'FORM');

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
  }, [existingReservation, number]);

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

    if (status === 'ABONADO') {
      if (amountPaid <= 0) {
        setErrorMsg('El monto del abono debe ser mayor que 0.');
        return;
      }
      if (amountPaid >= raffle.ticketPrice) {
        setErrorMsg(`Para abonos, el monto debe ser menor al precio total del boleto (${formatCurrency(raffle.ticketPrice, raffle.currency)}). De lo contrario, selecciona "PAGADO".`);
        return;
      }
    }

    const payload: TicketReservation = {
      number,
      buyerName: buyerName.trim(),
      phone: phone.trim(),
      status,
      amountPaid: status === 'PAGADO' ? raffle.ticketPrice : (status === 'NO_PAGADO' ? 0 : amountPaid),
      notes: notes.trim(),
      reservedAt: existingReservation ? existingReservation.reservedAt : new Date().toISOString(),
    };

    onSave(number, payload);
    // Switch to ticket view if successful
    setActiveTab('TICKET');
  };

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de liberar este número? Se borrarán todos los datos del participante.')) {
      onDelete(number);
      onClose();
    }
  };

  const numFormatted = formatTicketNumber(number, raffle.totalNumbers);

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
          ) : (
            <form onSubmit={handleSave} className="space-y-5 max-w-2xl mx-auto">
              
              {/* Alert Feedback Messages */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-2xl text-xs flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Informative Header */}
              <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-mono tracking-wider block mb-1">Rifa Activa</span>
                  <strong className="text-slate-800 text-sm">{raffle.title}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 uppercase font-mono tracking-wider block mb-1">Precio por Boleto</span>
                  <strong className="text-emerald-600 text-sm font-bold">{formatCurrency(raffle.ticketPrice, raffle.currency)}</strong>
                </div>
              </div>

              {/* Participant details segment */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Datos del Comprador
                </h4>
                
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
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-805 text-slate-800"
                    required
                  />
                </div>

                {/* WhatsApp Phone */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Número de Teléfono (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 1234567890"
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-805 text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400">Introduce código de país para que WhatsApp direccione automáticamente sin agregar el contacto.</p>
                </div>

                {/* Observation / Notes */}
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
                    className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-805 text-slate-800"
                  />
                </div>
              </div>

              {/* Finances and payment block */}
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

              {/* Form Action deck */}
              <div className="flex items-center justify-between pt-2">
                {existingReservation ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2.5 text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-xl transition duration-150 flex items-center space-x-1.5 focus:ring-2 focus:ring-red-200 cursor-pointer"
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
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-205 bg-slate-100 hover:bg-slate-200 rounded-xl transition duration-150 cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition duration-150 shadow-sm cursor-pointer flex items-center space-x-1.5 font-sans"
                  >
                    <Star className="w-4 h-4 fill-white text-white" />
                    <span>Confirmar Boleto</span>
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
