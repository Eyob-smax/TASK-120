import { writable } from 'svelte/store';
import type { FaceProfile, CaptureSession } from '$lib/types/identity';
import { getProfiles } from './identity.service';

export const identityStore = writable<FaceProfile[]>([]);
export const captureStore = writable<CaptureSession | null>(null);

export async function loadProfiles(): Promise<void> {
  const profiles = await getProfiles();
  identityStore.set(profiles);
}
