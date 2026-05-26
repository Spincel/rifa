/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DollarSign, Wallet, Users, AlertCircle, Percent, Sparkles, TrendingUp } from 'lucide-react';
import { Raffle } from '../types';
import { formatCurrency } from '../utils';

interface RaffleStatsProps {
  raffle: Raffle;
}

export default function RaffleStats({ raffle }: RaffleStatsProps) {
  const { ticketPrice, totalNumbers, reservations, currency } = raffle;

  const totalTicketsCount = totalNumbers;
  const reservedTicketsList = Object.values(reservations);
  const totalReservedCount = reservedTicketsList.length;
  
  // Realized collection calculation
  let totalRecaudado = 0;
  let totalPendientePorCobrar = 0;

  reservedTicketsList.forEach((ticket) => {
    totalRecaudado += ticket.amountPaid;
    const pendingForThisTicket = ticketPrice - ticket.amountPaid;
    totalPendientePorCobrar += Math.max(0, pendingForThisTicket);
  });

  const potentialRevenue = totalTicketsCount * ticketPrice;
  const paidCount = reservedTicketsList.filter((r) => r.status === 'PAGADO').length;
  const abonadoCount = reservedTicketsList.filter((r) => r.status === 'ABONADO').length;
  const apartadoCount = reservedTicketsList.filter((r) => r.status === 'NO_PAGADO').length;
  const disponibleCount = totalTicketsCount - totalReservedCount;

  // Percentages with decimal fallback
  const pctReserved = totalTicketsCount > 0 ? (totalReservedCount / totalTicketsCount) * 100 : 0;
  const pctPaid = totalReservedCount > 0 ? (paidCount / totalReservedCount) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 4 Grid Key metrics card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Potencial Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Capacidad Total (100%)</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {formatCurrency(potentialRevenue, currency)}
            </h3>
            <p className="text-[10.5px] text-slate-400 font-sans">Meta si vendes todo</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-650">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Realized Income */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-150 border-emerald-200 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8"></div>
          <div className="space-y-1.5 z-10">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Recaudado (Efectivo)</span>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight font-mono">
              {formatCurrency(totalRecaudado, currency)}
            </h3>
            <p className="text-[10.5px] text-emerald-600 font-medium font-sans">Dinero en mano/cuenta</p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 z-10">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Collections */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Pendiente por Cobrar</span>
            <h3 className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight font-mono">
              {formatCurrency(totalPendientePorCobrar, currency)}
            </h3>
            <p className="text-[10.5px] text-slate-400 font-sans">Abonos pendientes + apartados</p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-120 border-indigo-100 rounded-xl text-indigo-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Reservations Summary status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Boletos Apartados</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight font-mono">
              {totalReservedCount} / {totalTicketsCount}
            </h3>
            <p className="text-[10.5px] text-slate-400 font-sans">{disponibleCount} disponibles para venta</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-650">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Progress Bars and mini analytical summary cards */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-850 text-slate-800 flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-indigo-500" />
            Metas y Avance de Ventas
          </h3>
          <p className="text-xs text-slate-400">Métricas dinámicas del progreso de asignación y recaudación física.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Progress: Assigment rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-605">
              <span className="text-slate-505 font-medium text-slate-600">Porcentaje de Boletos Apartados:</span>
              <span className="font-mono text-slate-800 font-extrabold">{pctReserved.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctReserved}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10.5px] text-slate-400">
              <span>{totalReservedCount} Boletos del total de {totalTicketsCount}</span>
              <span>Faltan {disponibleCount} boletos</span>
            </div>
          </div>

          {/* Progress: Collection rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-605">
              <span className="text-slate-505 font-medium text-slate-600">Porcentaje de Boletos Liquidados:</span>
              <span className="font-mono text-emerald-600 font-extrabold">{pctPaid.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pctPaid}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10.5px] text-slate-400">
              <span>{paidCount} de {totalReservedCount} apartados están totalmente liquidados</span>
              <span>{abonadoCount} abonados y {apartadoCount} sin pagar</span>
            </div>
          </div>
        </div>

        {/* Detailed counts footer status chips */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-around text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-slate-100 border border-slate-300 rounded-full"></span>
            <span className="text-slate-400 text-xs">Disponibles: <strong className="text-slate-800 font-mono">{disponibleCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            <span className="text-slate-400 text-xs">Apartados (sin pago): <strong className="text-slate-800 font-mono">{apartadoCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
            <span className="text-slate-400 text-xs">Abonados: <strong className="text-slate-800 font-mono">{abonadoCount}</strong></span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
            <span className="text-slate-400 text-xs">Pagados: <strong className="text-slate-800 font-mono">{paidCount}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
