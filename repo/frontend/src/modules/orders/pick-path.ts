import type { PickPathStep, PickPathConfig } from '$lib/types/orders';

export function sortPickPath(
  steps: PickPathStep[],
  config: PickPathConfig,
): PickPathStep[] {
  if (steps.length === 0) return [];

  const zonePriorityMap = new Map<string, number>();
  config.zonePriority.forEach((zone, index) => {
    zonePriorityMap.set(zone.toLowerCase(), index);
  });

  const maxPriority = config.zonePriority.length;

  const sorted = [...steps].sort((a, b) => {
    // Sort by zone priority first
    const aPriority = zonePriorityMap.get(a.zone.toLowerCase()) ?? maxPriority;
    const bPriority = zonePriorityMap.get(b.zone.toLowerCase()) ?? maxPriority;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Within the same zone priority, sort by bin code alphanumerically
    return a.binCode.toLowerCase().localeCompare(b.binCode.toLowerCase());
  });

  // Assign sequence numbers 1..N
  return sorted.map((step, index) => ({
    ...step,
    sequence: index + 1,
  }));
}
