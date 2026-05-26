/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  LogIn,
  LogOut,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Database,
  Unlink,
  Info,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Raffle } from '../types';
import { googleSignIn, initAuth, logoutGoogle, getAccessToken } from '../lib/firebaseAuth';
import { createRaffleSpreadsheet, syncRaffleToSpreadsheet } from '../lib/googleSheets';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncProps {
  raffle: Raffle;
  onUpdateRaffle: (updated: Raffle) => void;
  // Shared token states of App
  googleUser: User | null;
  googleToken: string | null;
  setGoogleUser: (user: User | null) => void;
  setGoogleToken: (token: string | null) => void;
}

export default function GoogleSheetsSync({
  raffle,
  onUpdateRaffle,
  googleUser,
  googleToken,
  setGoogleUser,
  setGoogleToken,
}: GoogleSheetsSyncProps) {
  const [loading, setLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);

  // Auto-sync whenever raffle changes, if token is available
  useEffect(() => {
    if (googleToken && raffle.spreadsheetId) {
      const performAutoSync = async () => {
        try {
          await syncRaffleToSpreadsheet(googleToken, raffle.spreadsheetId!, raffle);
        } catch (err) {
          console.error('Auto-sync check failed:', err);
        }
      };
      
      // Debounce auto-sync slightly to protect limits
      const t = setTimeout(performAutoSync, 1500);
      return () => clearTimeout(t);
    }
  }, [raffle, googleToken]);

  const handleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('No se pudo conectar con tu cuenta de Google. Verifica los permisos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!googleToken) {
      setErrorMsg('Debes iniciar sesión primero.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      // 1. Create Spreadsheet
      const sheetInfo = await createRaffleSpreadsheet(googleToken, raffle);
      
      // 2. Build updated raffle with sheet link
      const updatedRaffle: Raffle = {
        ...raffle,
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetUrl: sheetInfo.spreadsheetUrl,
      };

      // 3. Save states
      onUpdateRaffle(updatedRaffle);

      // 4. Run first Sync
      const success = await syncRaffleToSpreadsheet(googleToken, sheetInfo.spreadsheetId, updatedRaffle);
      if (success) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        setErrorMsg('La hoja fue creada pero no se pudieron volcar los datos iniciales. Inténtalo de nuevo.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error creando Google Sheet en Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!googleToken || !raffle.spreadsheetId) {
      setErrorMsg('Faltan credenciales de Google o la hoja no está vinculada.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const success = await syncRaffleToSpreadsheet(googleToken, raffle.spreadsheetId, raffle);
      if (success) {
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 4000);
      } else {
        setErrorMsg('Fallo en la comunicación con Google Sheets API.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Excepción durante la sincronización.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = () => {
    const confirmUnlink = window.confirm(
      '¿Estás seguro de que deseas desvincular Google Sheets de esta rifa? El archivo continuará intacto en tu Google Drive, pero la aplicación dejará de actualizarlo.'
    );
    if (!confirmUnlink) return;

    onUpdateRaffle({
      ...raffle,
      spreadsheetId: undefined,
      spreadsheetUrl: undefined,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 mt-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-xs border border-emerald-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              Conexión con Google Sheets
            </h3>
            <p className="text-xs text-slate-400 font-medium">Guarda la rifa y la lista de participantes en tiempo real.</p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition cursor-pointer self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showExplanation ? 'Ocultar Guía' : 'Ver Campos y Guía Step-by-Step'}</span>
        </button>
      </div>

      {/* Guide step-by-step panel */}
      {showExplanation && (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 md:p-5 text-xs text-slate-600 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-slate-800 font-bold border-b border-slate-200/65 pb-2">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Guía de Conexión y Campos Almacenados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans leading-relaxed">
            {/* Step 1 & 2 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">1</span>
                  Autenticación de Google
                </h4>
                <p className="text-slate-500 text-[11px] pl-6">
                  Iniciarás sesión con tu cuenta personal para otorgar de manera segura acceso para leer/escribir a la hoja y crear el archivo en Google Drive.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">2</span>
                  Estructura del Libro Creado
                </h4>
                <p className="text-slate-500 text-[11px] pl-6">
                  Se generará una hoja en tu Google Drive llamada <strong className="text-slate-700">"Rifa Digital - {raffle.title}"</strong> compuesta por 2 pestañas específicas de datos.
                </p>
              </div>
            </div>

            {/* Step 3 & 4 */}
            <div className="space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">3</span>
                  Pestaña 1: Configuración Rifa
                </h4>
                <p className="text-slate-500 text-[11px] pl-6">
                  Campos guardados en formato llave-valor:
                  <br />• <strong className="text-slate-700">Atributos:</strong> ID Rifa, Título, Premio Principal, Precio Boleto, Total de Boletos, Fecha Sorteo, Hora Sorteo, Moneda, Descripción, Última sincronización.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">4</span>
                  Pestaña 2: Boletos y Participantes
                </h4>
                <p className="text-slate-500 text-[11px] pl-6">
                  Muestra la tabla de todos los números apartados:
                  <br />• <strong className="text-slate-700">Columnas:</strong> Boleto #, Participante, Teléfono, Estado de Pago (PAGADO, NO_PAGADO, ABONADO), Monto Abonado, Notas, Fecha Apartado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection State Panel */}
      <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Email / Profile block */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Estado de la cuenta</span>
            {googleUser ? (
              <div className="flex items-center gap-2.5">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-650 bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {googleUser.email ? googleUser.email.slice(0, 2) : 'G'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-none">{googleUser.displayName || 'Administrador de Sorteos'}</p>
                  <p className="text-xs text-indigo-600 font-semibold">{googleUser.email}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                <div className="w-2.5 h-2.5 bg-slate-300 rounded-full animate-ping"></div>
                <span>Sin conectar. Inicia sesión con Google para activar la sincronización.</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="shrink-0 flex items-center gap-2.5">
            {googleUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer flex items-center gap-1.5 border border-slate-200"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-500" /> : <LogOut className="w-4 h-4 text-slate-500" />}
                <span>Cerrar Cuenta</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={loading}
                className="gsi-material-button font-semibold cursor-pointer max-w-xs"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper shadow-xs border border-slate-250 py-1 px-3 bg-white rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 hover:bg-slate-55 transition">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5 block">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Conectar con Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sheets Integration Workflow Panel */}
      {googleUser && (
        <div className="border border-slate-150 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Soporte de Hojas Activo</span>
          </div>

          {raffle.spreadsheetId ? (
            /* Linked State */
            <div className="space-y-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-xs text-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Rifa Vinculada Correctamente</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal pl-5">
                    Tus cambios de boletos y precios se sincronizarán directamente con esta hoja de cálculo.
                  </p>
                </div>

                <a
                  href={raffle.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-1.5 self-start md:self-auto shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Google Sheet ↗</span>
                </a>
              </div>

              {/* Sync Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-black font-semibold text-white px-4 py-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
                    )}
                    <span>Sincronizar Manualmente</span>
                  </button>

                  {syncSuccess && (
                    <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 p-2 rounded-lg py-1.5 flex items-center gap-1.5 animate-bounce">
                      <span>✓</span> ¡Sincronizado!
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleUnlink}
                  className="text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-100 px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1 ml-auto cursor-pointer"
                  title="Desvincular esta Google Sheet"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Desvincular Rifa</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unlinked State */
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs font-medium text-slate-500 leading-relaxed font-sans">
                Esta rifa aún no está vinculada a ninguna Google Sheet. Presiona el botón de abajo para que generemos un nuevo archivo exclusivo en tu Google Drive y sincronicemos todos tus boletos actuales de una sola vez.
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleCreateSheet}
                  disabled={loading}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-xl transition duration-150 shadow-sm cursor-pointer flex items-center justify-center gap-2 leading-none"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-200" />
                  )}
                  <span>Crear y Vincular Google Sheet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Output block */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-800 uppercase block tracking-wider text-[10px]">Error de Sincronización</span>
            <span className="text-rose-700 font-medium">{errorMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
