/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Search, Phone, FileSpreadsheet, Download, Upload, Trash2, Edit, Award, HelpCircle, Check, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { Raffle, TicketReservation } from '../types';
import { formatTicketNumber, formatCurrency, generateWhatsAppMessage, getWhatsAppShareUrl } from '../utils';

interface RaffleListTableProps {
  raffle: Raffle;
  onEditTicket: (num: number) => void;
  onDeleteTicket: (num: number) => void;
  onImportReservations: (imported: { [number: number]: TicketReservation }) => void;
  onResetRaffle: () => void;
}

export default function RaffleListTable({ raffle, onEditTicket, onDeleteTicket, onImportReservations, onResetRaffle }: RaffleListTableProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reservationsList = Object.values(raffle.reservations).sort((a, b) => a.number - b.number);

  // Apply filters and search
  const filteredList = reservationsList.filter((r) => {
    // Search matching
    const q = search.toLowerCase().trim();
    const formattedNum = formatTicketNumber(r.number, raffle.totalNumbers);
    const matchesSearch =
      r.buyerName.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      formattedNum.includes(q) ||
      (r.notes || '').toLowerCase().includes(q);

    // Status filter matching
    if (filterStatus === 'ALL') return matchesSearch;
    return r.status === filterStatus && matchesSearch;
  });

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(raffle.reservations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Backup_Reservaciones_${raffle.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Quick runtime validation
        const isValid = Object.entries(parsed).every(([key, value]) => {
          const num = Number(key);
          const val = value as any;
          return !isNaN(num) && typeof val === 'object' && val !== null && 'buyerName' in val;
        });

        if (isValid) {
          onImportReservations(parsed);
          alert('¡Reservaciones importadas con éxito!');
        } else {
          alert('Error: El formato del archivo JSON de respaldo no es válido.');
        }
      } catch (err) {
        alert('Error: No se pudo leer el archivo seleccionado. Asegúrate de importar un archivo JSON válido.');
      }
    };
    reader.readAsText(file);
    // Reset file input value to allow re-selection
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* List Header and Backup Buttons */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
            Organizador de Participantes
          </h2>
          <p className="text-xs text-slate-400">Listado interactivo de todos los números apartados, pagos y accesos directos.</p>
        </div>

        {/* Data Import / Export Backup row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* File input invisible */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            id="btn-import-reservations"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
            title="Importar archivo JSON de respaldo"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar Copia</span>
          </button>
          
          <button
            onClick={handleExportBackup}
            disabled={reservationsList.length === 0}
            id="btn-export-reservations"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition flex items-center space-x-1.5 disabled:opacity-55 disabled:pointer-events-none cursor-pointer"
            title="Exportar archivo JSON de respaldo"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Respaldos</span>
          </button>

          <button
            onClick={() => {
              if (window.confirm('¿Deseas reiniciar la rifa completa? Esto borrará TODOS los boletos apartados de manera permanente.')) {
                onResetRaffle();
              }
            }}
            id="btn-reset-raffle"
            className="px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reiniciar Rifa</span>
          </button>
        </div>
      </div>

      {/* Filter and search bar segment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
        
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por comprador, número o celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
          />
        </div>

        {/* Status filter selection */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
          >
            <option value="ALL">Filtrar por Estado (Todos)</option>
            <option value="NO_PAGADO">Apartados sin pagar</option>
            <option value="ABONADO">Abonados (Parcial)</option>
            <option value="PAGADO">Pagados completamente</option>
          </select>
        </div>
      </div>

      {/* Tableau list representation */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 max-h-[400px] overflow-y-auto">
        <table className="min-w-full text-left text-xs bg-white">
          <thead className="bg-slate-55 bg-slate-50 border-b border-slate-200 text-slate-500 font-mono font-bold tracking-wider uppercase">
            <tr>
              <th className="px-4 py-3 text-center">No.</th>
              <th className="px-4 py-3">Nombre Participante</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Estado Pago</th>
              <th className="px-4 py-3 text-right">Monto Pagado</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredList.map((r) => {
              const formattedNum = formatTicketNumber(r.number, raffle.totalNumbers);
              const totalCost = formatCurrency(raffle.ticketPrice, raffle.currency);
              const paidAmount = formatCurrency(r.amountPaid, raffle.currency);

              return (
                <tr key={r.number} className="hover:bg-slate-50/50 transition">
                  {/* Number bubble badge */}
                  <td className="px-4 py-3 text-center font-bold">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono rounded-lg border border-slate-200/70 text-xs">
                      {formattedNum}
                    </span>
                  </td>
                  
                  {/* Participant name */}
                  <td className="px-4 py-3 font-semibold text-slate-900 truncate max-w-[150px]" title={r.buyerName}>
                    {r.buyerName}
                  </td>

                  {/* Phone number */}
                  <td className="px-4 py-3 text-slate-500 font-mono">
                    {r.phone || <span className="text-slate-350 italic text-[10px]">No registrado</span>}
                  </td>

                  {/* Payment tag badge */}
                  <td className="px-4 py-3">
                    {r.status === 'PAGADO' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-500 text-white border border-emerald-300">
                        PAGADO
                      </span>
                    ) : r.status === 'ABONADO' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-400 text-white border border-amber-300">
                        ABONADO
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold bg-rose-500 text-white border border-rose-300">
                        RESERVADO
                      </span>
                    )}
                  </td>

                  {/* Paid numeric column */}
                  <td className="px-4 py-3 text-right font-mono font-bold">
                    {paidAmount} <span className="text-[10px] text-slate-400 font-normal">/ {totalCost}</span>
                  </td>

                  {/* Short observations note */}
                  <td className="px-4 py-3 text-slate-500 truncate max-w-[160px]" title={r.notes}>
                    {r.notes || '-'}
                  </td>

                  {/* Responsive row Action icons */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* WhatsApp Row trigger */}
                      {r.phone ? (
                        <a
                          href={getWhatsAppShareUrl(r.phone, generateWhatsAppMessage(raffle, r))}
                          target="_blank"
                          rel="noreferrer"
                          id={`list-wa-btn-${r.number}`}
                          className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition"
                          title="Enviar por WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div className="p-1.5 text-slate-300 cursor-not-allowed bg-slate-50 border border-slate-100 rounded-lg">
                          <Phone className="w-3.5 h-3.5 opacity-60" />
                        </div>
                      )}

                      {/* Ticket graphics modal launcher trigger */}
                      <button
                        onClick={() => onEditTicket(r.number)}
                        id={`list-ticket-btn-${r.number}`}
                        className="p-1.5 text-slate-600 bg-slate-50 hover:bg-slate-800 hover:text-white rounded-lg transition"
                        title="Ver Boleto / Previsualizar"
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete reservation */}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de liberar el número ${formattedNum}?`)) {
                            onDeleteTicket(r.number);
                          }
                        }}
                        id={`list-delete-btn-${r.number}`}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition"
                        title="Liberar número"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-xs">No hay reservas registradas</p>
                  <p className="text-[10px] text-slate-400 mt-1">Prueba seleccionando un número en la cuadrícula para registrar datos.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
