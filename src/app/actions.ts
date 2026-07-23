'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateStoreSettings() {
  try {
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating store settings layout path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown revalidation error' };
  }
}
