export enum UserRole {
  Administrator = 'administrator',
  WarehouseManager = 'warehouse_manager',
  PickerPacker = 'picker_packer',
  Auditor = 'auditor',
}

export enum MovementReason {
  Receive = 'receive',
  Ship = 'ship',
  TransferOut = 'transfer_out',
  TransferIn = 'transfer_in',
  CycleCountAdjust = 'cycle_count_adjust',
  ReservationHold = 'reservation_hold',
  ReservationRelease = 'reservation_release',
}

export enum OrderStatus {
  Draft = 'draft',
  Confirmed = 'confirmed',
  Reserved = 'reserved',
  Picking = 'picking',
  Packing = 'packing',
  Shipped = 'shipped',
  Cancelled = 'cancelled',
}

export enum ReservationStatus {
  Active = 'active',
  Released = 'released',
  Fulfilled = 'fulfilled',
}

export enum ReleaseReason {
  Timeout = 'timeout',
  Cancel = 'cancel',
  Fulfilled = 'fulfilled',
}

export enum DiscrepancyState {
  Opened = 'opened',
  UnderReview = 'under_review',
  Verified = 'verified',
  Resolved = 'resolved',
}

export enum TransferState {
  Pending = 'pending',
  Active = 'active',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
}

export enum FilePreviewType {
  Image = 'image',
  Pdf = 'pdf',
  Text = 'text',
  Audio = 'audio',
  Video = 'video',
  Unsupported = 'unsupported',
}

export enum NotificationType {
  LowStock = 'low_stock',
  WaveAssigned = 'wave_assigned',
  DiscrepancyOpened = 'discrepancy_opened',
  DiscrepancyClosed = 'discrepancy_closed',
  FileVersionRollback = 'file_version_rollback',
}

export const EventType = NotificationType;
export type EventType = NotificationType;

export enum NotificationChannel {
  Inbox = 'inbox',
  Sms = 'sms',
  Email = 'email',
  OfficialAccount = 'official_account',
}

export enum QueuedAttemptStatus {
  Pending = 'pending',
  Simulated = 'simulated',
  Skipped = 'skipped',
}

export enum QualityCheckResult {
  Pass = 'pass',
  FailResolution = 'fail_resolution',
  FailBrightness = 'fail_brightness',
  FailOcclusion = 'fail_occlusion',
}

export enum LivenessResult {
  Pass = 'pass',
  FailNoBlink = 'fail_no_blink',
  FailNoTurn = 'fail_no_turn',
  FailTimeout = 'fail_timeout',
}

export enum WaveStatus {
  Planned = 'planned',
  InProgress = 'in_progress',
  Completed = 'completed',
}

export enum TaskStatus {
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Completed = 'completed',
  Blocked = 'blocked',
}
