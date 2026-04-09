import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDatabase, closeDb, resetDb } from '../../src/lib/db/connection';
import {
  importProfiles,
  exportProfiles,
  enrollProfile,
} from '../../src/modules/identity/identity.service';
import { FaceProfileRepository } from '../../src/lib/db';

describe('Import/Export Flows', () => {
  beforeEach(async () => { await initDatabase(); });
  afterEach(async () => { await resetDb(); });

  describe('Identity JSON Import', () => {
    it('imports valid JSON profiles', async () => {
      const json = JSON.stringify({
        profiles: [
          { name: 'Alice', groupId: 'g1', attributes: { dept: 'warehouse' } },
          { name: 'Bob', attributes: {} },
        ],
      });
      const result = await importProfiles(json, 'json');
      expect(result.totalRecords).toBe(2);
      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
    });

    it('imports JSON array format', async () => {
      const json = JSON.stringify([{ name: 'Charlie' }]);
      const result = await importProfiles(json, 'json');
      expect(result.importedCount).toBe(1);
    });

    it('skips profiles without name', async () => {
      const json = JSON.stringify([{ name: '' }, { name: 'Valid' }]);
      const result = await importProfiles(json, 'json');
      expect(result.importedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('handles invalid JSON gracefully', async () => {
      const result = await importProfiles('not json{{{', 'json');
      expect(result.importedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Identity CSV Import', () => {
    it('imports valid CSV', async () => {
      const csv = 'name,group\nAlice,warehouse\nBob,shipping';
      const result = await importProfiles(csv, 'csv');
      expect(result.importedCount).toBe(2);
    });

    it('handles empty CSV', async () => {
      const csv = 'name,group';
      const result = await importProfiles(csv, 'csv');
      expect(result.importedCount).toBe(0);
    });
  });

  describe('Identity Export', () => {
    it('exports JSON with correct format', async () => {
      await enrollProfile('Alice', 'g1', { dept: 'warehouse' });
      await enrollProfile('Bob', undefined, {});

      const output = await exportProfiles([], 'json');
      const parsed = JSON.parse(output);
      expect(parsed.formatVersion).toBe('1.0');
      expect(parsed.exportedAt).toBeTruthy();
      expect(parsed.profiles).toHaveLength(2);
      const names = parsed.profiles.map((p: any) => p.name);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
    });

    it('exports CSV with correct columns', async () => {
      await enrollProfile('Alice');
      const output = await exportProfiles([], 'csv');
      const lines = output.split('\n');
      expect(lines[0]).toBe('id,name,group,enrolledAt');
      expect(lines.length).toBe(2); // header + 1 data row
    });

    it('exports selected profiles only', async () => {
      const p1 = await enrollProfile('Alice');
      await enrollProfile('Bob');
      const output = await exportProfiles([p1.id], 'json');
      const parsed = JSON.parse(output);
      expect(parsed.profiles).toHaveLength(1);
      expect(parsed.profiles[0].name).toBe('Alice');
    });
  });
});
