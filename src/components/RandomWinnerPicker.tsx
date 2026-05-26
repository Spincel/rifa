/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Play, RefreshCw, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { Raffle, TicketReservation } from '../types';
import { formatTicketNumber, formatCurrency } from '../utils';

interface RandomWinnerPickerProps {
  raffle: Raffle;
}

export default function RandomWinnerPicker({ raffle }: RandomWinnerPickerProps) {
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [winnerNumber, setWinnerNumber] = useState<number | null>(null);
  const [currentRollingNum, setCurrentRollingNum] = useState<string>('00');
  const [winnerDetails, setWinnerDetails] = useState<TicketReservation | null>(null);

  // List candidates
  const getCandidates = (): TicketReservation[] => {
    const list = Object.values(raffle.reservations);
    if (onlyPaid) {
      return list.filter((r) => r.status === 'PAGADO');
    }
    return list; // All reserved
  };

  const candidates = getCandidates();

  const startDraw = () => {
    if (candidates.length === 0) return;
    
    setIsRunning(true);
    setWinnerNumber(null);
    setWinnerDetails(null);

    let counter = 0;
    const totalFlips = 30; // Suspense flips count
    const intervalTime = 80; // Speed of scroll in ms

    const rollingInterval = setInterval(() => {
      // Pick a random index representing candidates list values
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const tempWinner = candidates[randomIndex];
      
      setCurrentRollingNum(formatTicketNumber(tempWinner.number, raffle.totalNumbers));
      counter++;

      if (counter >= totalFlips) {
        clearInterval(rollingInterval);
        
        // Solidify actual random winner
        const finalWinner = candidates[Math.floor(Math.random() * candidates.length)];
        setWinnerNumber(finalWinner.number);
        setWinnerDetails(finalWinner);
        setIsRunning(false);
      }
    }, intervalTime);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-12 -mt-12"></div>

      {/* Header */}
      <div className="space-y-1.5 z-10 relative">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500 fill-amber-50" />
          Rueda de Sorteo Dinámico
        </h2>
        <p className="text-xs text-slate-400">
          Selecciona un ganador al azar en vivo de entre todos los participantes registrados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center font-sans">
        {/* Play Setup options */}
        <div className="space-y-4">
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-605">
            <h4 className="font-semibold text-slate-700 uppercase tracking-widest text-[10px]">Criterio de Participación:</h4>
            
            <div className="space-y-2.5 mt-2">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="drawCriteria"
                  checked={onlyPaid}
                  onChange={() => {
                    setOnlyPaid(true);
                    setWinnerNumber(null);
                    setWinnerDetails(null);
                  }}
                  className="rounded-full text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Sólo boletos totalmente PAGADOS ({raffle.reservations ? Object.values(raffle.reservations).filter((r)=>r.status==='PAGADO').length : 0})</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="drawCriteria"
                  checked={!onlyPaid}
                  onChange={() => {
                    setOnlyPaid(false);
                    setWinnerNumber(null);
                    setWinnerDetails(null);
                  }}
                  className="rounded-full text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Cualquier boleto apartado ({Object.keys(raffle.reservations).length})</span>
              </label>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed font-sans">
            ☝️ <strong className="text-slate-700">Consejo del organizador:</strong> Se recomienda configurar el sorteo "Sólo boletos pagados" para motivar a tus participantes a liquidar sus abonos antes de que ruede el sorteo oficial.
          </div>

          <div>
            <button
              onClick={startDraw}
              disabled={isRunning || candidates.length === 0}
              id="btn-spin-winner"
              className="w-full py-3.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl shadow-sm transition duration-150 flex items-center justify-center space-x-2 cursor-pointer font-sans"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Girando Tómbola...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Iniciar Sorteo ({candidates.length} elegibles)</span>
                </>
              )}
            </button>
            {candidates.length === 0 && (
              <p className="text-[10px] text-rose-500 font-semibold text-center mt-2.5 flex items-center justify-center gap-1 font-sans">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> No hay boletos registrados que cumplan estos criterios.
              </p>
            )}
          </div>
        </div>

        {/* Rolling Display and Results screen */}
        <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] text-center border border-slate-800 shadow-inner relative overflow-hidden">
          
          {/* Confetti simulation when winner selected */}
          {winnerDetails && !isRunning && (
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-amber-200/5 to-transparent animate-fade-in pointer-events-none"></div>
          )}

          {isRunning ? (
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-full">Mezclando</span>
              <div className="text-7xl font-black font-mono text-white tracking-widest leading-none">
                {currentRollingNum}
              </div>
              <p className="text-xs text-slate-400 font-sans">Seleccionando boleto ganador...</p>
            </div>
          ) : winnerDetails ? (
            <div className="space-y-4 animate-scale-up">
              <div className="mx-auto w-11 h-11 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg border border-amber-300">
                <Trophy className="w-6 h-6 fill-amber-100" />
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] tracking-widest text-emerald-400 font-mono font-bold uppercase bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  ¡Boleto Ganador!
                </span>
                <div className="text-6xl font-black font-mono text-white tracking-wider leading-none mt-1">
                  {formatTicketNumber(winnerDetails.number, raffle.totalNumbers)}
                </div>
              </div>

              <div className="text-sm">
                <p className="text-white font-bold text-base">{winnerDetails.buyerName}</p>
                <p className="text-slate-400 text-xs font-mono">{winnerDetails.phone || 'Tel del comprador no registrado'}</p>
              </div>

              <div className="text-[10.5px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                Identificador: #{raffle.id.slice(0, 4)}-{formatTicketNumber(winnerDetails.number, raffle.totalNumbers)}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-slate-600 mb-1">🎰</div>
              <p className="text-sm text-slate-400 font-bold">Tómbola Digital</p>
              <p className="text-[11px] text-slate-500 px-6 max-w-xs leading-relaxed">
                Haz clic en el botón de la izquierda para simular el sorteo y obtener el boleto ganador al instante.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
