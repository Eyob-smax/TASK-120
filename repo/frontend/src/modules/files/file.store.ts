import { writable } from 'svelte/store';
import { FileRepository, TransferSessionRepository } from '$lib/db';
import type { FileRecord, TransferSession, RecycleBinEntry } from '$lib/types/files';

const fileRepo = new FileRepository();
const transferRepo = new TransferSessionRepository();

export const fileStore = writable<FileRecord[]>([]);
export const transferStore = writable<TransferSession[]>([]);
export const recycleBinStore = writable<RecycleBinEntry[]>([]);

export async function loadFiles(): Promise<void> {
  const files = await fileRepo.getAll();
  fileStore.set(files.filter(f => !f.isDeleted));
}

export async function loadTransfers(): Promise<void> {
  transferStore.set(await transferRepo.getAll());
}
