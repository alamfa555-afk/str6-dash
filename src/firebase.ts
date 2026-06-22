import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from './types';
import { INITIAL_ITEMS, INITIAL_ISSUES, INITIAL_RECEIVES } from './data';

const firebaseConfig = {
  apiKey: "AIzaSyCmmYfpnaCqV8YIbjnIWsfYVdJ5tD0xan0",
  authDomain: "analytical-wavelet-6l2lq.firebaseapp.com",
  projectId: "analytical-wavelet-6l2lq",
  storageBucket: "analytical-wavelet-6l2lq.firebasestorage.app",
  messagingSenderId: "348670108513",
  appId: "1:348670108513:web:c90e3b7dd0ff12e3bddb20"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with the custom database ID and configure to ignore undefined properties (prevents crashes when optional fields are empty/undefined)
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "ai-studio-fd38caef-76c3-4dea-b4e8-bec289f3cf45");

// Collection references
export const itemsColRef = collection(db, "inv_items");
export const issuesColRef = collection(db, "inv_issues");
export const receivesColRef = collection(db, "inv_receives");

/**
 * Seeds the database with default initialization data if the inventory is completely empty.
 */
export async function seedDatabaseIfEmpty() {
  try {
    const itemsSnapshot = await getDocs(itemsColRef);
    if (itemsSnapshot.empty) {
      console.log("Database is empty. Seeding initial datasets...");
      const batch = writeBatch(db);

      // Seed core inventory items
      INITIAL_ITEMS.forEach((item) => {
        const itemDoc = doc(itemsColRef, item.id);
        batch.set(itemDoc, item);
      });

      // Seed issue transactions
      INITIAL_ISSUES.forEach((issue) => {
        const issueDoc = doc(issuesColRef, issue.id);
        batch.set(issueDoc, issue);
      });

      // Seed receive transactions
      INITIAL_RECEIVES.forEach((receive) => {
        const receiveDoc = doc(receivesColRef, receive.id);
        batch.set(receiveDoc, receive);
      });

      await batch.commit();
      console.log("Database seeded successfully.");
    }
  } catch (error) {
    console.error("Error checking or seeding database:", error);
  }
}

/**
 * Helper to strip out undefined keys from an object before sending to Firestore
 */
function sanitizeForFirestore<T>(obj: T): T {
  const clean = { ...obj } as any;
  Object.keys(clean).forEach((key) => {
    if (clean[key] === undefined) {
      delete clean[key];
    }
  });
  return clean;
}

/**
 * Saves/updates an inventory item in Firestore.
 */
export async function saveInventoryItem(item: InventoryItem) {
  const itemDoc = doc(itemsColRef, item.id);
  const data = sanitizeForFirestore(item);
  await setDoc(itemDoc, data);
}

/**
 * Deletes an inventory item and cleans up any related records if needed.
 */
export async function deleteInventoryItem(itemId: string) {
  const itemDoc = doc(itemsColRef, itemId);
  await deleteDoc(itemDoc);
}

/**
 * Records an issue transaction.
 */
export async function saveIssueTransaction(transaction: IssueTransaction) {
  const issueDoc = doc(issuesColRef, transaction.id);
  const data = sanitizeForFirestore(transaction);
  await setDoc(issueDoc, data);
}

/**
 * Deletes an issue transaction.
 */
export async function deleteIssueTransaction(id: string) {
  const issueDoc = doc(issuesColRef, id);
  await deleteDoc(issueDoc);
}

/**
 * Records a receive transaction.
 */
export async function saveReceiveTransaction(transaction: ReceiveTransaction) {
  const rcvDoc = doc(receivesColRef, transaction.id);
  const data = sanitizeForFirestore(transaction);
  await setDoc(rcvDoc, data);
}

/**
 * Deletes a receive transaction.
 */
export async function deleteReceiveTransaction(id: string) {
  const rcvDoc = doc(receivesColRef, id);
  await deleteDoc(rcvDoc);
}

/**
 * Wipes out all data and recreates default seed data.
 */
export async function resetDatabaseToDefaults() {
  const batch = writeBatch(db);

  // Get and delete all current items
  const itemsSn = await getDocs(itemsColRef);
  itemsSn.forEach((d) => batch.delete(d.ref));

  // Get and delete all current issues
  const issuesSn = await getDocs(issuesColRef);
  issuesSn.forEach((d) => batch.delete(d.ref));

  // Get and delete all current receives
  const receivesSn = await getDocs(receivesColRef);
  receivesSn.forEach((d) => batch.delete(d.ref));

  // Commit deletions first
  await batch.commit();

  // Seed default data
  await seedDatabaseIfEmpty();
}
