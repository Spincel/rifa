/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, Sparkles, HelpCircle, Palette, RefreshCw } from 'lucide-react';
import { Raffle } from '../types';

interface RaffleSettingsProps {
  raffle: Raffle;
  onSave: (updatedRaffle: Raffle) => void;
}

const COLOR_BLOCKS = [
  { id: 'emerald', name: 'Esmeralda', hex: '#10b981', bg: 'bg-emerald-500' },
  { id: 'blue', name: 'Zafiro', hex: '#3b82f6', bg: 'bg-blue-500' },
  { id: 'amber', name: 'Dorado', hex: '#f59e0b', bg: 'bg-amber-500' },
  { id: 'rose', name: 'Rosa Coral', hex: '#f43f5e', bg: 'bg-rose-500' },
  { id: 'violet', name: 'Espacio Violeta', hex: '#8b5cf6', bg: 'bg-violet-500' },
  { id: 'red', name: 'Rojo Rubí', hex: '#ef4444', bg: 'bg-red-500' },
  { id: 'charcoal', name: 'Antracita', hex: '#475569', bg: 'bg-slate-600' },
];

export default function RaffleSettings({ raffle, onSave }: RaffleSettingsProps) {
  const [title, setTitle] = useState(raffle.title);
  const [prize, setPrize] = useState(raffle.prize);
  const [ticketPrice, setTicketPrice] = useState(raffle.ticketPrice);
  const [totalNumbers, setTotalNumbers] = useState(raffle.totalNumbers);
  const [numberOffset, setNumberOffset] = useState(raffle.numberOffset);
  const [drawDate, setDrawDate] = useState(raffle.drawDate);
  const [drawTime, setDrawTime] = useState(raffle.drawTime);
  const [currency, setCurrency] = useState(raffle.currency);
  const [ticketColor, setTicketColor] = useState(raffle.ticketColor || 'emerald');
  const [description, setDescription] = useState(raffle.description || '');

  const [notifMsg, setNotifMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  // Update values if raffle configuration is changed
  useEffect(() => {
    setTitle(raffle.title);
    setPrize(raffle.prize);
    setTicketPrice(raffle.ticketPrice);
    setTotalNumbers(raffle.totalNumbers);
    setNumberOffset(raffle.numberOffset);
    setDrawDate(raffle.drawDate);
    setDrawTime(raffle.drawTime);
    setCurrency(raffle.currency);
    setTicketColor(raffle.ticketColor || 'emerald');
    setDescription(raffle.description || '');
    setNotifMsg('');
    setWarningMsg('');
  }, [raffle]);

  // Monitor total number reductions
  useEffect(() => {
    const reservedNumbers = Object.keys(raffle.reservations).map(Number);
    const maxReservedNum = reservedNumbers.length > 0 ? Math.max(...reservedNumbers) : -1;
    const offsetLimitNum = totalNumbers + numberOffset - 1;

    if (maxReservedNum > offsetLimitNum) {
      setWarningMsg(`¡Atención! Ya has reservado boletos con números altos (hasta el No. ${maxReservedNum}). Si reduces el total de números o el desfase, se podrían perder o quedar fuera de rango esas reservaciones.`);
    } else {
      setWarningMsg('');
    }
  }, [totalNumbers, numberOffset, raffle.reservations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifMsg('');

    if (!title.trim() || !prize.trim()) {
      alert('Por favor, rellena los campos obligatorios.');
      return;
    }

    onSave({
      ...raffle,
      title: title.trim(),
      prize: prize.trim(),
      ticketPrice: Number(ticketPrice),
      totalNumbers: Number(totalNumbers),
      numberOffset: Number(numberOffset),
      drawDate,
      drawTime,
      currency,
      ticketColor,
      description: description.trim(),
    });

    setNotifMsg('¡Configuración de la rifa guardada correctamente!');
    setTimeout(() => setNotifMsg(''), 4000);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Settings Header */}
      <div className="flex flex-col space-y-1.5 border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Ajustes de la Rifa
        </h2>
        <p className="text-xs text-slate-400">Personaliza los detalles de la rifa, el costo de participación y la fecha del sorteo.</p>
      </div>

      {/* Notifications and Warning feedbacks */}
      {notifMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium">
          <span className="p-1 bg-emerald-200 text-emerald-800 rounded-lg">✓</span>
          <span>{notifMsg}</span>
        </div>
      )}

      {warningMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* Form Fields body split into columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Left Column: Basic Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Información Principal</h3>
          
          {/* Raffle Title */}
          <div className="space-y-1.5">
            <label htmlFor="raffleTitle" className="text-xs font-semibold text-slate-700">Título del Sorteo <span className="text-rose-500">*</span></label>
            <input
              type="text"
              id="raffleTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Sorteo Gran Canasta de Fin de Año"
              className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 transition"
              required
            />
          </div>

          {/* Award/Prize */}
          <div className="space-y-1.5">
            <label htmlFor="rafflePrize" className="text-xs font-semibold text-slate-700">Premio a Entregar <span className="text-rose-500">*</span></label>
            <input
              type="text"
              id="rafflePrize"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="Ej. Dinero en Efectivo o Laptop Asus"
              className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 transition"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="raffleDesc" className="text-xs font-semibold text-slate-700">Descripción o Condiciones del Sorteo</label>
            <textarea
              id="raffleDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. El sorteo se realizará con base en la Lotería Nacional, se requiere boleto pagado antes de la fecha límite..."
              rows={3}
              className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 transition"
            />
          </div>
        </div>

        {/* Right Column: Ticket parameters and dates */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Boletos, Precios y Fechas</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Ticket Price */}
            <div className="space-y-1.5">
              <label htmlFor="price" className="text-xs font-semibold text-slate-700">Precio por Boleto</label>
              <input
                type="number"
                id="price"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Number(e.target.value))}
                min="0"
                className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 transition font-mono font-bold"
                required
              />
            </div>

            {/* Currency picker */}
            <div className="space-y-1.5">
              <label htmlFor="currency" className="text-xs font-semibold text-slate-700">Moneda</label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition"
              >
                <option value="MXN">MXN ($ - Pesos Méx)</option>
                <option value="USD">USD ($ - Dólar US)</option>
                <option value="COP">COP ($ - Pesos Col)</option>
                <option value="CLP">CLP ($ - Pesos Chil)</option>
                <option value="PEN">PEN (S/. - Soles)</option>
                <option value="ARS">ARS ($ - Pesos Arg)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Total numbers count */}
            <div className="space-y-1.5">
              <label htmlFor="totalNumbers" className="text-xs font-semibold text-slate-700">Cantidad de Boletos</label>
              <select
                id="totalNumbers"
                value={totalNumbers}
                onChange={(e) => setTotalNumbers(Number(e.target.value))}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition"
              >
                <option value="10">10 números</option>
                <option value="50">50 números</option>
                <option value="100">100 números (Estándar 00-99)</option>
                <option value="200">200 números</option>
                <option value="300">300 números (Sorteo 1-300)</option>
                <option value="500">500 números</option>
                <option value="1000">1000 números (000-999)</option>
              </select>
            </div>

            {/* Start offset (e.g. 0 or 1) */}
            <div className="space-y-1.5">
              <label htmlFor="numberOffset" className="text-xs font-semibold text-slate-700">Comenzar desde</label>
              <select
                id="numberOffset"
                value={numberOffset}
                onChange={(e) => setNumberOffset(Number(e.target.value))}
                className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition"
              >
                <option value="0">El número 0 (ej. 00-99)</option>
                <option value="1">El número 1 (ej. 01-100)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 bg-slate-50/50 border border-slate-200 p-2.5 rounded-xl">
              <input
                type="checkbox"
                id="isTbd"
                checked={drawDate === 'Por definir'}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDrawDate('Por definir');
                    setDrawTime('Por definir');
                  } else {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setDrawDate(d.toISOString().split('T')[0]);
                    setDrawTime('19:00');
                  }
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300 cursor-pointer"
              />
              <label htmlFor="isTbd" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                Fecha y hora por definir (Pendiente de confirmar)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Draw Date */}
              <div className="space-y-1.5">
                <label htmlFor="drawDate" className="text-xs font-semibold text-slate-700">Fecha del Sorteo</label>
                <input
                  type="date"
                  id="drawDate"
                  value={drawDate === 'Por definir' ? '' : drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  disabled={drawDate === 'Por definir'}
                  required={drawDate !== 'Por definir'}
                />
              </div>

              {/* Draw Time */}
              <div className="space-y-1.5">
                <label htmlFor="drawTime" className="text-xs font-semibold text-slate-700">Hora del Sorteo</label>
                <input
                  type="time"
                  id="drawTime"
                  value={drawTime === 'Por definir' ? '' : drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  disabled={drawDate === 'Por definir'}
                  required={drawTime !== 'Por definir'}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual theme select palette color picker */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-slate-500" /> Tema Visual del Boleto Digital
        </h3>
        <p className="text-[11px] text-slate-400">Elige la paleta cromática con la que se generará la imagen del boleto digital final.</p>
        
        <div className="flex flex-wrap gap-3">
          {COLOR_BLOCKS.map((themeColor) => (
            <button
              type="button"
              key={themeColor.id}
              onClick={() => setTicketColor(themeColor.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition hover:bg-slate-50 cursor-pointer ${
                ticketColor === themeColor.id
                  ? 'border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/20'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              <span className={`w-4 h-4 rounded-full ${themeColor.bg}`} />
              <span className="text-slate-700 font-medium">{themeColor.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Register actions footer */}
      <div className="pt-3 flex justify-end">
        <button
          type="submit"
          id="btn-save-settings"
          className="px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-sm transition transform active:scale-95 duration-150 flex items-center space-x-1.5 font-sans"
        >
          <Save className="w-4.5 h-4.5" />
          <span>Guardar Configuración</span>
        </button>
      </div>

    </form>
  );
}
