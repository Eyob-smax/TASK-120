import { describe, it, expect } from 'vitest';
import {
  UserRole,
  MovementReason,
  OrderStatus,
  ReservationStatus,
  ReleaseReason,
  DiscrepancyState,
  TransferState,
  FilePreviewType,
  NotificationType,
  EventType,
  NotificationChannel,
  QueuedAttemptStatus,
  QualityCheckResult,
  LivenessResult,
  WaveStatus,
  TaskStatus,
} from '../src/lib/types/enums';

describe('Enums', () => {
  it('UserRole has exactly 4 members', () => {
    const values = Object.values(UserRole);
    expect(values).toHaveLength(4);
    expect(values).toContain('administrator');
    expect(values).toContain('warehouse_manager');
    expect(values).toContain('picker_packer');
    expect(values).toContain('auditor');
  });

  it('MovementReason has exactly 7 members', () => {
    const values = Object.values(MovementReason);
    expect(values).toHaveLength(7);
    expect(values).toContain('receive');
    expect(values).toContain('ship');
    expect(values).toContain('transfer_out');
    expect(values).toContain('transfer_in');
    expect(values).toContain('cycle_count_adjust');
    expect(values).toContain('reservation_hold');
    expect(values).toContain('reservation_release');
  });

  it('OrderStatus has exactly 7 members', () => {
    const values = Object.values(OrderStatus);
    expect(values).toHaveLength(7);
    expect(values).toContain('draft');
    expect(values).toContain('cancelled');
    expect(values).toContain('shipped');
  });

  it('ReservationStatus has exactly 3 members', () => {
    expect(Object.values(ReservationStatus)).toHaveLength(3);
  });

  it('ReleaseReason has exactly 3 members', () => {
    expect(Object.values(ReleaseReason)).toHaveLength(3);
  });

  it('DiscrepancyState has 4 members in lifecycle order', () => {
    const values = Object.values(DiscrepancyState);
    expect(values).toHaveLength(4);
    expect(values).toEqual(['opened', 'under_review', 'verified', 'resolved']);
  });

  it('TransferState has exactly 5 members', () => {
    expect(Object.values(TransferState)).toHaveLength(5);
  });

  it('FilePreviewType has exactly 6 members', () => {
    expect(Object.values(FilePreviewType)).toHaveLength(6);
  });

  it('NotificationType has exactly 5 event types', () => {
    const values = Object.values(NotificationType);
    expect(values).toHaveLength(5);
    expect(values).toContain('low_stock');
    expect(values).toContain('wave_assigned');
    expect(values).toContain('discrepancy_opened');
    expect(values).toContain('discrepancy_closed');
    expect(values).toContain('file_version_rollback');
  });

  it('EventType is an alias for NotificationType', () => {
    expect(EventType).toBe(NotificationType);
  });

  it('NotificationChannel has exactly 4 members', () => {
    const values = Object.values(NotificationChannel);
    expect(values).toHaveLength(4);
    expect(values).toContain('inbox');
    expect(values).toContain('sms');
    expect(values).toContain('email');
    expect(values).toContain('official_account');
  });

  it('QueuedAttemptStatus has exactly 3 members', () => {
    expect(Object.values(QueuedAttemptStatus)).toHaveLength(3);
  });

  it('QualityCheckResult has exactly 4 members', () => {
    expect(Object.values(QualityCheckResult)).toHaveLength(4);
  });

  it('LivenessResult has exactly 4 members', () => {
    expect(Object.values(LivenessResult)).toHaveLength(4);
  });

  it('WaveStatus has exactly 3 members', () => {
    expect(Object.values(WaveStatus)).toHaveLength(3);
  });

  it('TaskStatus has exactly 4 members', () => {
    expect(Object.values(TaskStatus)).toHaveLength(4);
  });

  it('all enums use string values', () => {
    const allEnums = [
      UserRole, MovementReason, OrderStatus, ReservationStatus,
      ReleaseReason, DiscrepancyState, TransferState, FilePreviewType,
      NotificationType, NotificationChannel, QueuedAttemptStatus,
      QualityCheckResult, LivenessResult, WaveStatus, TaskStatus,
    ];
    for (const enumObj of allEnums) {
      for (const value of Object.values(enumObj)) {
        expect(typeof value).toBe('string');
      }
    }
  });
});
