import { writable, get } from 'svelte/store';
import { FileRepository, TransferSessionRepository } from '$lib/db';
import { createOptimisticUpdate } from '$lib/services';
import { deleteFile as _deleteFile, restoreFile as _restoreFile } from './recycle-bin.service';
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

export async function optimisticDeleteFile(fileId: string, userId: string) {
  const current = get(fileStore);
  const optimistic = current.filter(f => f.id !== fileId);

  return createOptimisticUpdate(fileStore, optimistic, async () => {
    await _deleteFile(fileId, userId);
    const files = await fileRepo.getAll();
    fileStore.set(files.filter(f => !f.isDeleted));
  });
}

export async function optimisticRestoreFile(entryId: string) {
  return createOptimisticUpdate(fileStore, get(fileStore), async () => {
    await _restoreFile(entryId);
    const files = await fileRepo.getAll();
    fileStore.set(files.filter(f => !f.isDeleted));
  });
}
