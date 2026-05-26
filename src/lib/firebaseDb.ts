/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, auth } from './firebaseAuth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import { Raffle, TicketReservation } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global helper to format and throw errors compliant with Firestore specifications
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection Validation as requested by the integration guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// Invoke connection validation initially.
testConnection();

// 2. Real-time Subscription to all Raffle documents
export function subscribeToRaffles(onUpdate: (raffles: Raffle[]) => void, onError?: (err: Error) => void) {
  const path = 'raffles';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const rafflesList: Raffle[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        rafflesList.push({
          id: docSnap.id,
          title: data.title || '',
          prize: data.prize || '',
          ticketPrice: Number(data.ticketPrice) || 0,
          totalNumbers: Number(data.totalNumbers) || 100,
          numberOffset: Number(data.numberOffset) || 0,
          drawDate: data.drawDate || '',
          drawTime: data.drawTime || '',
          currency: data.currency || 'MXN',
          ticketColor: data.ticketColor || 'slate',
          description: data.description || '',
          spreadsheetId: data.spreadsheetId || '',
          spreadsheetUrl: data.spreadsheetUrl || '',
          reservations: {}, // Populated separately in real-time
        });
      });
      onUpdate(rafflesList);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

// 3. Real-time Subscription to Ticket Reservations for a specific Raffle
export function subscribeToReservations(
  raffleId: string,
  onUpdate: (reservations: { [number: number]: TicketReservation }) => void,
  onError?: (err: Error) => void
) {
  const path = `raffles/${raffleId}/reservations`;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const resMap: { [number: number]: TicketReservation } = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const num = Number(docSnap.id);
        resMap[num] = {
          number: num,
          buyerName: data.buyerName || '',
          phone: data.phone || '',
          status: data.status || 'NO_PAGADO',
          amountPaid: Number(data.amountPaid) || 0,
          notes: data.notes || '',
          reservedAt: data.reservedAt || new Date().toISOString(),
        };
      });
      onUpdate(resMap);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

// 4. Create or Update a Raffle
export async function saveRaffleMetadata(raffle: Omit<Raffle, 'reservations'>) {
  const path = `raffles/${raffle.id}`;
  try {
    await setDoc(doc(db, 'raffles', raffle.id), {
      title: raffle.title,
      prize: raffle.prize,
      ticketPrice: raffle.ticketPrice,
      totalNumbers: raffle.totalNumbers,
      numberOffset: raffle.numberOffset,
      drawDate: raffle.drawDate,
      drawTime: raffle.drawTime,
      currency: raffle.currency,
      ticketColor: raffle.ticketColor,
      description: raffle.description || '',
      spreadsheetId: raffle.spreadsheetId || '',
      spreadsheetUrl: raffle.spreadsheetUrl || '',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 5. Delete a Raffle (and clean up reservations if needed, though they can be cascading or left orphans)
export async function deleteRaffle(raffleId: string) {
  const path = `raffles/${raffleId}`;
  try {
    // Delete the metadata document
    await deleteDoc(doc(db, 'raffles', raffleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 6. Save or Update single ticket reservation
export async function saveReservation(raffleId: string, reservation: TicketReservation) {
  const numId = String(reservation.number);
  const path = `raffles/${raffleId}/reservations/${numId}`;
  try {
    await setDoc(doc(db, 'raffles', raffleId, 'reservations', numId), {
      buyerName: reservation.buyerName,
      phone: reservation.phone,
      status: reservation.status,
      amountPaid: reservation.amountPaid,
      notes: reservation.notes || '',
      reservedAt: reservation.reservedAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 7. Delete single reservation
export async function deleteReservation(raffleId: string, num: number) {
  const numId = String(num);
  const path = `raffles/${raffleId}/reservations/${numId}`;
  try {
    await deleteDoc(doc(db, 'raffles', raffleId, 'reservations', numId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 8. Bulk import reservations
export async function importReservations(raffleId: string, reservations: { [number: number]: TicketReservation }) {
  const path = `raffles/${raffleId}/reservations`;
  try {
    const batch = writeBatch(db);
    // Write in batch mode (standard limit: up to 500 documents per batch)
    // We can slice inputs if they are too large, but typical imports are usually within batch limits.
    const keys = Object.keys(reservations);
    for (const key of keys) {
      const num = Number(key);
      const res = reservations[num];
      const numSnapRef = doc(db, 'raffles', raffleId, 'reservations', String(num));
      batch.set(numSnapRef, {
        buyerName: res.buyerName,
        phone: res.phone,
        status: res.status,
        amountPaid: res.amountPaid,
        notes: res.notes || '',
        reservedAt: res.reservedAt,
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 9. Reset all reservations for a raffle
export async function clearAllReservations(raffleId: string) {
  const path = `raffles/${raffleId}/reservations`;
  try {
    const snapshot = await getDocs(collection(db, 'raffles', raffleId, 'reservations'));
    const batch = writeBatch(db);
    snapshot.forEach((snap) => {
      batch.delete(snap.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
