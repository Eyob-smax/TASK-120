import type { BaseEntity } from './common';
import type {
  OrderStatus,
  ReservationStatus,
  ReleaseReason,
  WaveStatus,
  TaskStatus,
  DiscrepancyState,
} from './enums';

export interface Order extends BaseEntity {
  orderNumber: string;
  status: OrderStatus;
  lines: OrderLine[];
  customerId?: string;
  notes?: string;
  createdBy: string;
}

export interface OrderLine {
  id: string;
  orderId: string;
  skuId: string;
  binId?: string;
  quantity: number;
  reservationId?: string;
}

export interface Reservation extends BaseEntity {
  orderId: string;
  skuId: string;
  binId: string;
  quantity: number;
  status: ReservationStatus;
  lastActivityAt: string;
  releasedAt?: string;
  releaseReason?: ReleaseReason;
}

export interface Wave extends BaseEntity {
  waveNumber: string;
  status: WaveStatus;
  orderIds: string[];
  lineCount: number;
  config: WaveConfig;
  startedAt?: string;
  completedAt?: string;
}

export interface WaveConfig {
  maxLinesPerWave: number;
  priorityRules?: string[];
}

export interface PickerTask extends BaseEntity {
  waveId: string;
  pickerId: string;
  status: TaskStatus;
  steps: PickPathStep[];
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PickPathStep {
  binId: string;
  zone: string;
  binCode: string;
  skuId: string;
  quantity: number;
  sequence: number;
}

export interface PickPathConfig {
  sortBy: 'zone_then_bin';
  zonePriority: string[];
}

export interface Discrepancy extends BaseEntity {
  taskId: string;
  orderId?: string;
  state: DiscrepancyState;
  reportedBy: string;
  reportedAt: string;
  description: string;
  attachments: DiscrepancyAttachment[];
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  resolvedAt?: string;
}

export interface DiscrepancyAttachment {
  id: string;
  discrepancyId: string;
  fileId: string;
  type: string;
  name: string;
  addedAt: string;
}
