/**
 * Ingresse Database Service
 * Handles database operations for Ingresse user data
 */

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  ingresseUsers,
  ingresseUserPhones,
  ingresseUserAddresses,
  ingresseUserDocuments,
  type IngresseUser,
} from '@/db/schema/ingresse';
import { encrypt, decrypt } from '@/utils/encryption';
import type { UserInfoData } from '../types/ingresse.types';

/**
 * Decrypted Ingresse User Profile
 * Includes decrypted tokens and document numbers
 */
export interface DecryptedIngresseProfile extends Omit<IngresseUser, 'token' | 'authToken'> {
  token: string;
  authToken: string | null;
  phones: Array<{
    id: number;
    ingresseUserId: number;
    ddi: number;
    number: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  addresses: Array<{
    id: number;
    ingresseUserId: number;
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    zipcode: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  documents: Array<{
    id: number;
    ingresseUserId: number;
    type: number;
    number: string; // Decrypted
    createdAt: Date;
    updatedAt: Date;
  }>;
}

/**
 * Check if a user has already linked an Ingresse account
 * @param userId - System user ID
 * @returns True if account is linked, false otherwise
 */
export async function checkIfUserLinked(userId: number): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(ingresseUsers)
    .where(eq(ingresseUsers.userId, userId))
    .limit(1);

  return !!existing;
}

/**
 * Create a new Ingresse profile for a user
 * Stores encrypted tokens and creates related records in a transaction
 * @param userId - System user ID
 * @param loginData - Login response data (token, userId, authToken)
 * @param userInfo - Complete user profile from Ingresse API
 * @returns Created Ingresse user record
 */
export async function createIngresseProfile(
  userId: number,
  loginData: { token: string; userId: number; authToken?: string },
  userInfo: UserInfoData
): Promise<IngresseUser> {
  return db.transaction(async (tx) => {
    // Insert main user record with encrypted tokens
    const [ingresseUser] = await tx
      .insert(ingresseUsers)
      .values({
        userId,
        ingresseUserId: String(loginData.userId),
        token: encrypt(loginData.token),
        authToken: loginData.authToken ? encrypt(loginData.authToken) : null,
        name: userInfo.name,
        email: userInfo.email,
        birthdate: userInfo.birthdate,
        nationality: userInfo.nationality,
        gender: userInfo.gender,
      })
      .returning();

    if (!ingresseUser) {
      throw new Error('Failed to create Ingresse user profile');
    }

    // Insert phone if available
    if (userInfo.phone) {
      await tx.insert(ingresseUserPhones).values({
        ingresseUserId: ingresseUser.id,
        ddi: userInfo.phone.ddi,
        number: userInfo.phone.number,
      });
    }

    // Insert address if available
    if (userInfo.address) {
      await tx.insert(ingresseUserAddresses).values({
        ingresseUserId: ingresseUser.id,
        street: userInfo.address.street,
        number: userInfo.address.number,
        complement: userInfo.address.complement,
        district: userInfo.address.district,
        zipcode: userInfo.address.zipcode,
        city: userInfo.address.city,
        state: userInfo.address.state,
        country: userInfo.address.country,
      });
    }

    // Insert document if available (encrypted)
    if (userInfo.document) {
      await tx.insert(ingresseUserDocuments).values({
        ingresseUserId: ingresseUser.id,
        type: userInfo.document.type,
        numberEncrypted: encrypt(userInfo.document.number),
      });
    }

    return ingresseUser;
  });
}

/**
 * Get Ingresse profile for a user (with decrypted sensitive data)
 * @param userId - System user ID
 * @returns Decrypted profile with related data, or null if not linked
 */
export async function getIngresseProfile(userId: number): Promise<DecryptedIngresseProfile | null> {
  const profile = await db.query.ingresseUsers.findFirst({
    where: eq(ingresseUsers.userId, userId),
    with: {
      phones: true,
      addresses: true,
      documents: true,
    },
  });

  if (!profile) {
    return null;
  }

  // Decrypt sensitive fields
  return {
    ...profile,
    token: decrypt(profile.token),
    authToken: profile.authToken ? decrypt(profile.authToken) : null,
    documents: profile.documents.map((doc) => ({
      ...doc,
      number: decrypt(doc.numberEncrypted),
    })),
  };
}

/**
 * Update Ingresse profile data
 * @param userId - System user ID
 * @param updates - Partial update data
 * @returns Updated Ingresse user record
 */
export async function updateIngresseProfile(
  userId: number,
  updates: Partial<Pick<IngresseUser, 'name' | 'email' | 'birthdate' | 'nationality' | 'gender'>>
): Promise<IngresseUser> {
  const [updated] = await db
    .update(ingresseUsers)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(ingresseUsers.userId, userId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update Ingresse profile');
  }

  return updated;
}

/**
 * Delete Ingresse profile for a user
 * Cascade deletes all related data (phones, addresses, documents)
 * @param userId - System user ID
 */
export async function deleteIngresseProfile(userId: number): Promise<void> {
  await db.delete(ingresseUsers).where(eq(ingresseUsers.userId, userId));
}

/**
 * Sync user data from Ingresse API and update database
 * @param userId - System user ID
 * @param ingresseUserId - Ingresse platform user ID
 * @param userToken - Ingresse user token
 * @param userInfo - Fresh user data from Ingresse API
 */
export async function syncUserDataFromApi(
  userId: number,
  userInfo: UserInfoData
): Promise<void> {
  await db.transaction(async (tx) => {
    // Update main user record
    await tx
      .update(ingresseUsers)
      .set({
        name: userInfo.name,
        email: userInfo.email,
        birthdate: userInfo.birthdate,
        nationality: userInfo.nationality,
        gender: userInfo.gender,
        updatedAt: new Date(),
      })
      .where(eq(ingresseUsers.userId, userId));

    // Get ingresse user ID
    const [ingresseUser] = await tx
      .select()
      .from(ingresseUsers)
      .where(eq(ingresseUsers.userId, userId))
      .limit(1);

    if (!ingresseUser) {
      throw new Error('Ingresse user not found');
    }

    // Update phone (delete old, insert new)
    await tx.delete(ingresseUserPhones).where(eq(ingresseUserPhones.ingresseUserId, ingresseUser.id));
    if (userInfo.phone) {
      await tx.insert(ingresseUserPhones).values({
        ingresseUserId: ingresseUser.id,
        ddi: userInfo.phone.ddi,
        number: userInfo.phone.number,
      });
    }

    // Update address (delete old, insert new)
    await tx
      .delete(ingresseUserAddresses)
      .where(eq(ingresseUserAddresses.ingresseUserId, ingresseUser.id));
    if (userInfo.address) {
      await tx.insert(ingresseUserAddresses).values({
        ingresseUserId: ingresseUser.id,
        ...userInfo.address,
      });
    }

    // Update document (delete old, insert new with encryption)
    await tx
      .delete(ingresseUserDocuments)
      .where(eq(ingresseUserDocuments.ingresseUserId, ingresseUser.id));
    if (userInfo.document) {
      await tx.insert(ingresseUserDocuments).values({
        ingresseUserId: ingresseUser.id,
        type: userInfo.document.type,
        numberEncrypted: encrypt(userInfo.document.number),
      });
    }
  });
}
