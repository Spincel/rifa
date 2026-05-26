/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, Filter, Layers, CheckCircle2, Ticket, Sparkles, Check, X } from 'lucide-react';
import { Raffle, TicketReservation } from '../types';
import { formatTicketNumber } from '../utils';

interface RaffleGridProps {
  raffle: Raffle;
  onSelectNumber: (num: number) => void;
  onSelectMultipleNumbers?: (nums: number[]) => void;
  selectedNumber: number | null;
  isAdmin: boolean;
}

export default function RaffleGrid({ raffle, onSelectNumber, onSelectMultipleNumbers, selectedNumber, isAdmin }: RaffleGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FREE' | 'RESERVED' | 'PAID' | 'ABONADO'>('ALL');

  // Multi-selection state
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  const { totalNumbers, numberOffset, reservations } = raffle;

  // Let's build a clean list of numbers in the raffle
  const numbersList: number[] = [];
  for (let i = numberOffset; i < totalNumbers + numberOffset; i++) {
    numbersList.push(i);
  }

  // Toggle multi-select mode
  const handleToggleMultiMode = () => {
    setIsMultiMode(!isMultiMode);
    setSelectedNumbers([]);
  };

  // Click handler for grid cells
  const handleCellClick = (num: number) => {
    const isOccupied = !!reservations[num];

    if (isMultiMode) {
      if (isOccupied && !isAdmin) return; // Non-admins can't select occupied numbers

      if (selectedNumbers.includes(num)) {
        setSelectedNumbers(selectedNumbers.filter(n => n !== num));
      } else {
        setSelectedNumbers([...selectedNumbers, num]);
      }
    } else {
      onSelectNumber(num);
    }
  };

  // Get color depending on reservation status
  const getNumberColorClass = (num: number) => {
    const isSelected = isMultiMode ? selectedNumbers.includes(num) : selectedNumber === num;
    const reservation = reservations[num];

    if (isSelected) {
      return 'bg-indigo-600 text-white font-extrabold border-2 border-indigo-300 scale-105 shadow-md ring-4 ring-indigo-500/30';
    }

    if (!reservation) {
      return 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 hover:scale-105 hover:border-indigo-400';
    }

    // If not admin, any reservation is shown as solid RED (occupied)
    if (!isAdmin) {
      return 'bg-rose-500 text-white border border-rose-300 font-extrabold opacity-90';
    }

    if (reservation.status === 'PAGADO') {
      return 'bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold border border-emerald-300 hover:scale-105';
    }

    if (reservation.status === 'ABONADO') {
      return 'bg-amber-400 hover:bg-amber-500 text-white font-extrabold border border-amber-300 hover:scale-105';
    }

    // Default status: NO_PAGADO / APARTADO (Reservado)
    return 'bg-rose-500 hover:bg-rose-600 text-white border border-rose-300 font-extrabold hover:scale-105';
  };

  // Check if a number passes current searches and filters
  const passesFilter = (num: number) => {
    const res = reservations[num];

    // Filter by Reservation Status
    if (statusFilter === 'FREE' && res) return false;
    if (statusFilter === 'RESERVED' && (!res || res.status !== 'NO_PAGADO')) return false;
    if (statusFilter === 'ABONADO' && (!res || res.status !== 'ABONADO')) return false;
    if (statusFilter === 'PAID' && (!res || res.status !== 'PAGADO')) return false;

    // Filter by search query (only applies if we have a search string)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      // Search for literal number matching
      const fmtNum = formatTicketNumber(num, totalNumbers);
      if (fmtNum.includes(q) || String(num).includes(q)) {
        return true;
      }
      // Or reservation buyer info matching (ONLY FOR ADMINS)
      if (!isAdmin) return false;

      if (!res) return false;
      const nameMatch = res.buyerName.toLowerCase().includes(q);
      const phoneMatch = res.phone.includes(q);
      const notesMatch = res.notes.toLowerCase().includes(q);
      return nameMatch || phoneMatch || notesMatch;
    }

    return true;
  };

  // Counting totals for summary ribbons
  const totalReserved = Object.keys(reservations).length;
  const totalPaid = Object.values(reservations).filter(r => r.status === 'PAGADO').length;
  const totalAbonado = Object.values(reservations).filter(r => r.status === 'ABONADO').length;
  const totalFree = totalNumbers - totalReserved;

  return (
    <div className="bg-white rounded-2xl border border-slate-205 border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header and Filter Block */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1 select-none">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              Tablero de Números
            </h2>
            <button
              type="button"
              onClick={handleToggleMultiMode}
              id="btn-toggle-multi"
              className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full transition-all flex items-center space-x-1 cursor-pointer border shadow-xs ${
                isMultiMode
                  ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 animate-pulse'
                  : 'bg-indigo-50 text-indigo-650 border-indigo-150 hover:bg-indigo-100/80'
              }`}
            >
              <Sparkles className="w-3 h-3 text-current" />
              <span>{isMultiMode ? 'Selección Múltiple: ACTIVA' : 'Seleccionar Varios'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {isMultiMode
              ? 'Haz clic en múltiples números libres para apartarlos juntos.'
              : 'Haz clic en un número libre para apartarlo o ver detalles.'
            }
          </p>
        </div>

        {/* Real-time Search Panel */}
        <div className="relative max-w-sm w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por número, nombre o tel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-slate-800"
          />
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-800 border-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todos ({totalNumbers})
        </button>
        <button
          onClick={() => setStatusFilter('FREE')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
            statusFilter === 'FREE'
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Disponibles ({totalFree})
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setStatusFilter('RESERVED')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                statusFilter === 'RESERVED'
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Apartados ({totalReserved - totalPaid - totalAbonado})
            </button>
            <button
              onClick={() => setStatusFilter('ABONADO')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                statusFilter === 'ABONADO'
                  ? 'bg-purple-100 border-purple-300 text-purple-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Abonados ({totalAbonado})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Pagados ({totalPaid})
            </button>
          </>
        )}
      </div>

      {/* Grid wrapper */}
      <div className="relative">
        {/* Dynamic Display Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-[480px] overflow-y-auto p-1 bg-slate-50/50 rounded-2xl border border-slate-200/40">
          {numbersList.filter(passesFilter).map((num) => {
            const r = reservations[num];
            const fmt = formatTicketNumber(num, totalNumbers);
            const isOccupied = !!r;

            return (
              <button
                key={num}
                id={`grid-number-btn-${num}`}
                disabled={!isAdmin && isOccupied}
                onClick={() => handleCellClick(num)}
                className={`aspect-square sm:aspect-video md:aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-mono tracking-tight transition duration-200 outline-none ${
                  !isAdmin && isOccupied ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                } ${getNumberColorClass(num)}`}
              >
                <span className="text-base font-bold">{fmt}</span>
                {isAdmin && r && (
                  <span className="text-[9px] font-sans truncate max-w-[55px] font-normal leading-3 opacity-90 hidden sm:inline-block">
                    {r.buyerName.split(' ')[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Centered Empty State when search returns nothing */}
        {numbersList.filter(passesFilter).length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No se encontraron números</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros de búsqueda.</p>
          </div>
        )}
      </div>

      {/* sticky bottom multi-selection feedback banner */}
      {isMultiMode && selectedNumbers.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800 animate-slide-up sticky bottom-0 z-30 font-sans">
          <div className="flex items-center space-x-3.5 text-center sm:text-left">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-extrabold font-mono shadow-inner shrink-0">
              {selectedNumbers.length}
            </div>
            <div>
              <p className="text-sm font-extrabold text-white">Boletos en tu carrito</p>
              <p className="text-[11px] text-slate-400 font-semibold font-mono tracking-tight max-w-sm break-all">
                {selectedNumbers.map(n => '#' + formatTicketNumber(n, totalNumbers)).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={() => setSelectedNumbers([])}
              className="px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800 cursor-pointer text-center"
            >
              Limpiar
            </button>
            <button
              onClick={() => {
                if (onSelectMultipleNumbers) {
                  onSelectMultipleNumbers(selectedNumbers);
                }
              }}
              id="btn-confirm-multi-select"
              className="px-5 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] text-white rounded-xl transition shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>Apartar Boletos</span>
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Fast Visual References (Legend) */}
      <div className="bg-slate-50 rounded-xl p-4 flex flex-wrap gap-y-3 justify-around border border-slate-200/60 font-sans">
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="w-3.5 h-3.5 rounded bg-white border border-slate-200"></span>
          <span className="text-slate-400">Libre (Disponible)</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-200"></span>
          <span className="text-rose-500">Ocupado</span>
        </div>
        {isAdmin && (
          <>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-200"></span>
              <span className="text-amber-500 font-medium">Abono</span>
            </div>
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-250 border-emerald-200"></span>
              <span className="text-emerald-500 font-medium">Pagado</span>
            </div>
          </>
        )}
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-300 ring-2 ring-indigo-500/30"></span>
          <span className="text-indigo-600">Tu selección</span>
        </div>
      </div>
    </div>
  );
}
