/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { Ticket, FileSpreadsheet, BarChart3, Trophy, Settings, HelpCircle, Gift, Sparkles, Star, Lock, LogOut } from 'lucide-react';
import { Raffle, TicketReservation } from './types';
import RaffleSelector from './components/RaffleSelector';
import RaffleGrid from './components/RaffleGrid';
import TicketFormModal from './components/TicketFormModal';
import RaffleStats from './components/RaffleStats';
import RaffleSettings from './components/RaffleSettings';
import RaffleListTable from './components/RaffleListTable';
import RandomWinnerPicker from './components/RandomWinnerPicker';
import { User } from 'firebase/auth';
import { initAuth } from './lib/firebaseAuth';
import {
  subscribeToRaffles,
  subscribeToReservations,
  saveRaffleMetadata,
  deleteRaffle,
  saveReservation,
  deleteReservation,
  importReservations,
  clearAllReservations
} from './lib/firebaseDb';
import GoogleSheetsSync from './components/GoogleSheetsSync';

const LOCAL_STORAGE_KEY = 'GESTOR_DE_RIFAS_SESSION_DATA_v1';

const DEFAULT_RAFFLES: Raffle[] = [
  {
    id: 'default-rifa-1',
    title: 'Rifa Gran Canasta Navideña',
    prize: 'Computadora Portátil y Canasta de Chocolates Premium',
    ticketPrice: 100,
    totalNumbers: 300,
    numberOffset: 1,
    drawDate: '2026-06-30',
    drawTime: '20:00',
    currency: 'MXN',
    ticketColor: 'emerald',
    reservations: {},
    description: 'Sorteo pro-fondas de graduación escolar. El número ganador se elegirá de acuerdo con el premio de la Lotería de Fin de Mes.'
  }
];

export default function App() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [activeRaffleId, setActiveRaffleId] = useState<string>('');
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'GRID' | 'TABLE' | 'STATS' | 'DRAW' | 'SETTINGS'>('GRID');
  const [viewingRaffleId, setViewingRaffleId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Admin authentication states
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('rifa_is_admin') === 'true';
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Automatically restrict activeTab to GRID for normal users
  useEffect(() => {
    if (!isAdmin && activeTab !== 'GRID') {
      setActiveTab('GRID');
    }
  }, [isAdmin, activeTab]);

  // Google OAuth configuration states for persistent/on-demand sync
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [enableGoogleSync, setEnableGoogleSync] = useState(() => {
    try {
      return localStorage.getItem('ENABLE_GOOGLE_SHEETS_SYNC') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ENABLE_GOOGLE_SHEETS_SYNC', String(enableGoogleSync));
    } catch (e) {
      console.error(e);
    }
  }, [enableGoogleSync]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // 1. Initial State Loading & Real-time Subscription from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToRaffles((fetchedRaffles) => {
      setRaffles(fetchedRaffles);
      setActiveRaffleId((prev) => {
        if (!prev || !fetchedRaffles.some((r) => r.id === prev)) {
          return fetchedRaffles.length > 0 ? fetchedRaffles[0].id : '';
        }
        return prev;
      });
      setViewingRaffleId((prev) => {
        if (prev && !fetchedRaffles.some((r) => r.id === prev)) {
          return '';
        }
        return prev;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Subscription to active reservations
  useEffect(() => {
    if (!activeRaffleId) return;
    const unsubscribe = subscribeToReservations(activeRaffleId, (activeReservations) => {
      setRaffles((prevRaffles) =>
        prevRaffles.map((r) => {
          if (r.id !== activeRaffleId) return r;
          return { ...r, reservations: activeReservations };
        })
      );
    });

    return () => unsubscribe();
  }, [activeRaffleId]);

  // Get active raffle configuration
  const activeRaffle = raffles.find((r) => r.id === activeRaffleId) || raffles[0];

  // Callback to create a brand new empty raffle
  const handleCreateRaffle = async (title: string, prize: string, price: number, total: number, color: string) => {
    const newRaffle = {
      id: `raffle-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      prize,
      ticketPrice: price,
      totalNumbers: total,
      numberOffset: total === 300 ? 1 : 0,
      drawDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days future
      drawTime: '19:00',
      currency: 'MXN',
      ticketColor: color,
      description: 'Sorteo organizado de manera autónoma. ¡Apoya y gana!'
    };

    setActiveRaffleId(newRaffle.id);
    await saveRaffleMetadata(newRaffle);
  };

  // Callback to erase/delete a raffle catalog
  const handleDeleteRaffle = async (id: string) => {
    await deleteRaffle(id);
  };

  // Callback to save/overwrite a ticket reservation
  const handleSaveReservation = async (num: number, reservation: TicketReservation) => {
    await saveReservation(activeRaffleId, reservation);
  };

  // Callback to delete/free a number reservation
  const handleDeleteReservation = async (num: number) => {
    await deleteReservation(activeRaffleId, num);
  };

  // Callback to mass load imported reservations on a backup restore
  const handleImportReservations = async (imported: { [number: number]: TicketReservation }) => {
    await importReservations(activeRaffleId, imported);
  };

  // Callback to clear/restart reservations of an active raffle
  const handleResetActiveRaffle = async () => {
    await clearAllReservations(activeRaffleId);
  };

  // Callback to update general active raffle settings parameters
  const handleSaveRaffleSettings = async (updated: Raffle) => {
    await saveRaffleMetadata({
      id: updated.id,
      title: updated.title,
      prize: updated.prize,
      ticketPrice: updated.ticketPrice,
      totalNumbers: updated.totalNumbers,
      numberOffset: updated.numberOffset,
      drawDate: updated.drawDate,
      drawTime: updated.drawTime,
      currency: updated.currency,
      ticketColor: updated.ticketColor,
      description: updated.description || '',
      spreadsheetId: updated.spreadsheetId || '',
      spreadsheetUrl: updated.spreadsheetUrl || '',
    });
  };

  // Admin login actions
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === 'admin' && passwordInput === '654321') {
      setIsAdmin(true);
      sessionStorage.setItem('rifa_is_admin', 'true');
      setShowLoginModal(false);
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      setActiveTab('SETTINGS');
    } else {
      setLoginError('Usuario o contraseña incorrectos.');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('rifa_is_admin');
    setActiveTab('GRID');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold tracking-wide text-slate-600 animate-pulse">
          Cargando organizador de boletos...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white pb-16">
      
      {/* 1. Header Segment conforming to Clean Minimalism */}
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 flex-none sticky top-0 z-40 shadow-sm font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl select-none shadow-sm">R</div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 truncate max-w-[150px] sm:max-w-md">
            Sorteo Pro {activeRaffle ? (
              <span className="text-slate-400 font-normal">· {activeRaffle.title}</span>
            ) : (
              <span className="text-slate-400 font-normal">· Panel General</span>
            )}
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          {isAdmin ? (
            <>
              {activeRaffle && (
                <div className="flex flex-col items-end shrink-0 select-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Recaudación</span>
                  <span className="text-sm md:text-lg font-mono font-bold text-emerald-600">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: activeRaffle.currency, minimumFractionDigits: 0 }).format(
                      (Object.values(activeRaffle.reservations || {}) as TicketReservation[]).reduce((acc: number, current) => acc + current.amountPaid, 0)
                    )}
                  </span>
                </div>
              )}
              {activeRaffle && <div className="w-[1px] h-10 bg-slate-200"></div>}
              <button
                onClick={handleLogout}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-full text-xs md:text-sm font-semibold transition shrink-0 cursor-pointer flex items-center gap-2"
                title="Cerrar sesión de administrador"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              id="gear-admin-login-btn"
              className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition duration-150 flex items-center space-x-2 cursor-pointer shadow-sm bg-white text-xs font-semibold font-sans"
              title="Acceso de Administrador"
            >
              <Settings className="w-4.5 h-4.5 text-slate-500 hover:text-indigo-600 transition animate-[spin_12s_linear_infinite]" />
              <span className="text-slate-700 text-xs font-bold">Gestionar</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Primary Navigation Tabs Dashboard */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Empty State for regular users when no drawing exists */}
        {!isAdmin && raffles.length === 0 && (
          <div className="max-w-md mx-auto py-16 text-center space-y-6 animate-fade-in font-sans">
            <div className="w-20 h-20 bg-slate-100 border border-slate-200 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <Ticket className="w-10 h-10 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">No hay sorteos disponibles</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto font-normal">
                Sorteo Pro está listo, pero el administrador aún no ha creado ninguna rifa o sorteo activo en la plataforma.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs uppercase tracking-wider transition shadow-md hover:shadow-lg cursor-pointer"
              >
                <Settings className="w-4 h-4 animate-[spin_12s_linear_infinite]" />
                <span>Gestionar Sorteos</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty State for Admin users when no drawings exist */}
        {isAdmin && raffles.length === 0 && (
          <div className="max-w-4xl mx-auto space-y-6 font-sans">
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-2xl p-5 md:p-6 mb-4">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                🏆 ¡Bienvenido Administrador!
              </h3>
              <p className="text-xs text-indigo-800 mt-1 font-normal">
                Aún no has creado ningún sorteo activo en la base de datos de Firebase. Utiliza el selector a continuación para crear tu primera rifa completando los parámetros.
              </p>
            </div>
            
            <RaffleSelector
              raffles={raffles}
              activeRaffleId={activeRaffleId}
              onSelect={setActiveRaffleId}
              onCreateRaffle={handleCreateRaffle}
              onDeleteRaffle={handleDeleteRaffle}
            />
          </div>
        )}

        {/* Portfolio of individual active raffle cards for regular visitors */}
        {!isAdmin && viewingRaffleId === '' && raffles.length > 0 && (
          <div className="max-w-5xl mx-auto space-y-6 font-sans animate-fade-in">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sorteos Disponibles</h2>
              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">Selecciona uno de nuestros sorteos activos individuales para ver los números de boletos disponibles y asegurar tu participación.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {raffles.map((raffle) => {
                const totalReservas = Object.keys(raffle.reservations || {}).length;
                const percentSold = Math.round((totalReservas / raffle.totalNumbers) * 100);
                
                const themeColor = raffle.ticketColor || 'emerald';
                let accentBg = 'bg-emerald-50 border-emerald-100 text-emerald-800';
                if (themeColor === 'blue') accentBg = 'bg-blue-50 border-blue-100 text-blue-800';
                if (themeColor === 'amber') accentBg = 'bg-amber-50 border-amber-100 text-amber-800';
                if (themeColor === 'rose') accentBg = 'bg-rose-50 border-rose-100 text-rose-800';
                if (themeColor === 'violet') accentBg = 'bg-violet-50 border-violet-100 text-violet-800';

                return (
                  <div key={raffle.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${accentBg}`}>
                          🏆 Sorteo Individual
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {totalReservas} de {raffle.totalNumbers} vendidos
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                        {raffle.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed font-normal">
                        {raffle.description || 'Sorteo organizado de manera autónoma. ¡Apoya y gana con nosotros!'}
                      </p>

                      <div className="pt-2 space-y-1.5 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Premio:</span>
                          <span className="font-bold text-slate-800 text-right max-w-[180px] truncate">{raffle.prize}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Costo del boleto:</span>
                          <span className="font-mono font-bold text-emerald-600">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: raffle.currency, minimumFractionDigits: 0 }).format(raffle.ticketPrice)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Fecha del Sorteo:</span>
                          <span className="font-semibold text-slate-600">
                            {raffle.drawDate === 'Por definir' ? 'Por definir ⏳' : `${raffle.drawDate.split('-').reverse().join('/')} a las ${raffle.drawTime} hrs`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {/* Venta Progress progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>Progreso de venta</span>
                          <span>{percentSold}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                            style={{ width: `${percentSold}%` }}
                          ></div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setActiveRaffleId(raffle.id);
                          setViewingRaffleId(raffle.id);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 h-11"
                      >
                        <Ticket className="w-4 h-4" />
                        <span>Visualizar Boletos</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dedicated single-drawing ticket visualizer for chosen active raffle */}
        {!isAdmin && viewingRaffleId !== '' && activeRaffle && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <button
                onClick={() => setViewingRaffleId('')}
                className="mb-4 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition duration-150 cursor-pointer shadow-sm animate-fade-in"
              >
                ← Volver a Sorteos
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden font-sans animate-fade-in mb-4">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full -mr-8 -mt-8"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                <div className="space-y-2">
                  <div className="inline-flex items-center space-x-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    🏆 Sorteo Activo
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                    {activeRaffle.title}
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-normal">
                    {activeRaffle.description || 'Sorteo organizado de manera autónoma. ¡Apoya y gana con nosotros!'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 pt-1 font-sans">
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                      <Gift className="w-4 h-4 mr-1 text-emerald-600" />
                      <strong>Premio:</strong>&nbsp;{activeRaffle.prize}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-4 shrink-0 md:text-right border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                  <div className="flex-1 md:flex-initial">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Costo Boleto</span>
                    <span className="text-lg md:text-xl font-mono font-black text-slate-900 font-bold">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: activeRaffle.currency, minimumFractionDigits: 0 }).format(activeRaffle.ticketPrice)}
                    </span>
                  </div>
                  <div className="flex-1 md:flex-initial">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-sans">Fecha del Sorteo</span>
                    <span className="text-xs font-semibold text-slate-700 font-sans">
                      {activeRaffle.drawDate === 'Por definir' ? 'Por definir ⏳' : `${activeRaffle.drawDate.split('-').reverse().join('/')} a las ${activeRaffle.drawTime} hrs`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <RaffleGrid
              raffle={activeRaffle}
              selectedNumber={selectedNumber}
              onSelectNumber={(num) => setSelectedNumber(num)}
            />
          </div>
        )}

        {/* Complete administrative dashboard view */}
        {isAdmin && raffles.length > 0 && activeRaffle && (
          <div className="space-y-6 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
              <div className="lg:col-span-2">
                <RaffleSelector
                  raffles={raffles}
                  activeRaffleId={activeRaffleId}
                  onSelect={setActiveRaffleId}
                  onCreateRaffle={handleCreateRaffle}
                  onDeleteRaffle={handleDeleteRaffle}
                />
              </div>
              <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-full min-h-[148px] overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6"></div>
                <div>
                  <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Total Recaudado en esta Rifa:</p>
                  <h2 className="text-3xl font-extrabold tracking-tight text-emerald-600 mt-1 font-mono">
                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: activeRaffle.currency, minimumFractionDigits: 0 }).format(
                      (Object.values(activeRaffle.reservations || {}) as TicketReservation[]).reduce((acc: number, current) => acc + current.amountPaid, 0)
                    )}
                  </h2>
                </div>
                <div className="text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium flex items-center justify-between font-sans">
                  <span>Boletos: <strong className="text-slate-800">{Object.keys(activeRaffle.reservations || {}).length}</strong> de {activeRaffle.totalNumbers}</span>
                  <span className="text-indigo-600 font-mono font-bold bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Cloud Sync Active</span>
                </div>
              </div>
            </div>

            {/* Switcher Navigation Tab deck */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab('GRID')}
                id="tab-nav-grid"
                className={`px-4.5 py-3 text-xs font-bold rounded-xl transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  activeTab === 'GRID'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Apartar Números</span>
              </button>
              
              <button
                onClick={() => setActiveTab('TABLE')}
                id="tab-nav-table"
                className={`px-4.5 py-3 text-xs font-bold rounded-xl transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  activeTab === 'TABLE'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Participantes</span>
              </button>

              <button
                onClick={() => setActiveTab('STATS')}
                id="tab-nav-stats"
                className={`px-4.5 py-3 text-xs font-bold rounded-xl transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  activeTab === 'STATS'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Finanzas y Avance</span>
              </button>

              <button
                onClick={() => setActiveTab('DRAW')}
                id="tab-nav-draw"
                className={`px-4.5 py-3 text-xs font-bold rounded-xl transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  activeTab === 'DRAW'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Tómbola Sorteo</span>
              </button>

              <button
                onClick={() => setActiveTab('SETTINGS')}
                id="tab-nav-settings"
                className={`px-4.5 py-3 text-xs font-bold rounded-xl transition flex items-center space-x-2 shrink-0 cursor-pointer ${
                  activeTab === 'SETTINGS'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Ajustes</span>
              </button>
            </div>

            {/* Target View Switched output content */}
            <div className="space-y-6">
              {activeTab === 'GRID' && (
                <RaffleGrid
                  raffle={activeRaffle}
                  selectedNumber={selectedNumber}
                  onSelectNumber={(num) => setSelectedNumber(num)}
                />
              )}

              {activeTab === 'TABLE' && (
                <RaffleListTable
                  raffle={activeRaffle}
                  onEditTicket={(num) => {
                    setSelectedNumber(num);
                  }}
                  onDeleteTicket={(num) => {
                    handleDeleteReservation(num);
                  }}
                  onImportReservations={handleImportReservations}
                  onResetRaffle={handleResetActiveRaffle}
                />
              )}

              {activeTab === 'STATS' && (
                <RaffleStats raffle={activeRaffle} />
              )}

              {activeTab === 'DRAW' && (
                <RandomWinnerPicker raffle={activeRaffle} />
              )}

              {activeTab === 'SETTINGS' && (
                <div className="space-y-6">
                  <RaffleSettings
                    raffle={activeRaffle}
                    onSave={handleSaveRaffleSettings}
                  />

                  {/* Toggle configuration for Google Sheets Sync integration */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition hover:shadow-md duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center font-bold text-lg">
                          📊
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            Integración con Google Sheets
                          </h4>
                          <p className="text-xs text-slate-400 font-medium">Respaldar y guardar boletos reservados automáticamente en tu propia nube.</p>
                        </div>
                      </div>
                      <div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={enableGoogleSync}
                            onChange={(e) => setEnableGoogleSync(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {enableGoogleSync && (
                    <GoogleSheetsSync
                      raffle={activeRaffle}
                      onUpdateRaffle={handleSaveRaffleSettings}
                      googleUser={googleUser}
                      googleToken={googleToken}
                      setGoogleUser={setGoogleUser}
                      setGoogleToken={setGoogleToken}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. Overlay Modals for Ticket Registration Form */}
      {selectedNumber !== null && (
        <TicketFormModal
          raffle={activeRaffle}
          number={selectedNumber}
          onSave={(num, reservation) => {
            handleSaveReservation(num, reservation);
            // Don't close immediately to allow downloading the ticket inside modal tabs
          }}
          onDelete={(num) => {
            handleDeleteReservation(num);
            setSelectedNumber(null);
          }}
          onClose={() => setSelectedNumber(null)}
        />
      )}

      {/* 5. Overlay Modal for Admin Login Gate */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginError('');
                setUsernameInput('');
                setPasswordInput('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
            <div className="flex flex-col items-center text-center space-y-3 mb-6 font-sans">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-xs">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Acceso de Administrador</h3>
              <p className="text-xs text-slate-500 max-w-[240px]">
                Inicie sesión para acceder a finanzas, participantes, ajustes globales y tómbola.
              </p>
            </div>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4 font-sans">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block text-left uppercase tracking-wider">Usuario</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block text-left uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="******"
                  className="w-full text-sm px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5 text-center font-semibold">
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-md leading-none h-11"
              >
                <span>Entrar al Panel</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
