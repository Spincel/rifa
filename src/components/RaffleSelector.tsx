/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlusCircle, Layers, FolderHeart, Trash2, Calendar, Award } from 'lucide-react';
import { Raffle } from '../types';

interface RaffleSelectorProps {
  raffles: Raffle[];
  activeRaffleId: string;
  onSelect: (id: string) => void;
  onCreateRaffle: (title: string, prize: string, price: number, totalNumbers: number, colorTheme: string) => void;
  onDeleteRaffle: (id: string) => void;
}

export default function RaffleSelector({ raffles, activeRaffleId, onSelect, onCreateRaffle, onDeleteRaffle }: RaffleSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrize, setNewPrize] = useState('');
  const [newPrice, setNewPrice] = useState(100);
  const [newTotalNumbers, setNewTotalNumbers] = useState(100);
  const [newColorTheme, setNewColorTheme] = useState('emerald');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim() || !newPrize.trim()) {
      alert('Por favor completa todos los campos del sorteo.');
      return;
    }

    onCreateRaffle(newTitle.trim(), newPrize.trim(), Number(newPrice), Number(newTotalNumbers), newColorTheme);
    
    // Reset Form
    setNewTitle('');
    setNewPrize('');
    setNewPrice(100);
    setNewTotalNumbers(100);
    setNewColorTheme('emerald');
    setShowCreateForm(false);
  };

  const activeRaffle = raffles.find((r) => r.id === activeRaffleId);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-650" />
            Selector de Rifas
          </h2>
          <p className="text-xs text-slate-400">Crea o cambia entre diferentes sorteos que tengas organizados.</p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          id="btn-toggle-create-raffle-form"
          className="px-4 py-2 text-xs font-semibold text-slate-800 hover:text-white bg-slate-150 bg-slate-100 hover:bg-slate-900 rounded-xl transition flex items-center space-x-1 cursor-pointer"
        >
          <PlusCircle className="w-4.5 h-4.5 shrink-0" />
          <span>{showCreateForm ? 'Ocultar' : 'Nueva Rifa'}</span>
        </button>
      </div>

      {/* Selector Dropdown / Selection Segment */}
      {!showCreateForm ? (
        <div className="space-y-3">
          <label htmlFor="raffleSelect" className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Sorteo Activo:</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              id="raffleSelect"
              value={activeRaffleId}
              onChange={(e) => onSelect(e.target.value)}
              className="flex-1 text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {raffles.map((r) => {
                const totalReservas = Object.keys(r.reservations).length;
                return (
                  <option key={r.id} value={r.id}>
                    🏆 {r.title} — ({totalReservas} de {r.totalNumbers} vendidos)
                  </option>
                );
              })}
            </select>

            {raffles.length > 1 && (
              <button
                onClick={() => {
                  if (activeRaffle && window.confirm(`¿Estás seguro de que quieres eliminar COMPLETAMENTE la rifa "${activeRaffle.title}"? Todos los registros, pagos y boletos asociados a esta rifa se perderán definitivamente.`)) {
                    onDeleteRaffle(activeRaffleId);
                  }
                }}
                id="btn-delete-active-raffle"
                className="px-4 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition flex items-center justify-center space-x-1.5 border border-red-200 cursor-pointer"
                title="Eliminar esta rifa por completo"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-bold sm:hidden lg:inline">Eliminar Rifa</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Create New Raffle Form Panel */
        <form onSubmit={handleCreate} className="bg-slate-55 bg-slate-50/70 border border-slate-200/50 p-4 rounded-2xl space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans border-b border-slate-200 pb-1.5">Crear nueva rifa, sorteo o evento</h3>

          {/* Title input */}
          <div className="space-y-1">
            <label htmlFor="newRaffleTitle" className="text-xs font-semibold text-slate-700">Título del Sorteo</label>
            <input
              type="text"
              id="newRaffleTitle"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej. Rifa Navideña de la Oficina"
              className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-slate-800"
              required
            />
          </div>

          {/* Prize input */}
          <div className="space-y-1">
            <label htmlFor="newRafflePrize" className="text-xs font-semibold text-slate-700">Premio Principal</label>
            <input
              type="text"
              id="newRafflePrize"
              value={newPrize}
              onChange={(e) => setNewPrize(e.target.value)}
              placeholder="Ej. Canasta con licor y chocolates premium"
              className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Ticket Price */}
            <div className="space-y-1">
              <label htmlFor="newRafflePrice" className="text-xs font-semibold text-slate-700">Precio por Boleto</label>
              <input
                type="number"
                id="newRafflePrice"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                min="1"
                className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-slate-800"
                required
              />
            </div>

            {/* Total numbers count select */}
            <div className="space-y-1">
              <label htmlFor="newRaffleTotalNum" className="text-xs font-semibold text-slate-700">Cantidad de Boletos</label>
              <select
                id="newRaffleTotalNum"
                value={newTotalNumbers}
                onChange={(e) => setNewTotalNumbers(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-slate-800"
              >
                <option value="10">10 números</option>
                <option value="50">50 números</option>
                <option value="100">100 números (00-99)</option>
                <option value="200">200 números</option>
                <option value="300">300 números (1-300)</option>
                <option value="500">500 números</option>
                <option value="1000">1000 números (000-999)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Paleta del Boleto Digital</label>
            <div className="flex gap-2">
              {['emerald', 'blue', 'amber', 'rose', 'violet'].map((c) => {
                const bgClass =
                  c === 'emerald'
                    ? 'bg-emerald-500'
                    : c === 'blue'
                    ? 'bg-blue-500'
                    : c === 'amber'
                    ? 'bg-amber-500'
                    : c === 'rose'
                    ? 'bg-rose-500'
                    : 'bg-violet-500';
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewColorTheme(c)}
                    className={`w-6 h-6 rounded-full ${bgClass} ring-offset-2 transition-all cursor-pointer ${
                      newColorTheme === c ? 'ring-2 ring-slate-850' : 'opacity-65 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 justify-end pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-3.5 py-1.5 text-xs text-slate-650 hover:bg-slate-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg shadow transition"
            >
              Confirmar Rifa
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
