import { Logger } from '@nestjs/common';
import { SlotReconcilerService } from '../../business/slot-reconciler.service';

export class ReconcileSlotsProcessor {
  private readonly logger = new Logger(ReconcileSlotsProcessor.name);

  constructor(private readonly slotReconciler: SlotReconcilerService) {}

  async process(businessId: string): Promise<void> {
    try {
      const result = await this.slotReconciler.reconcileFutureSlots(businessId);
      this.logger.log(`Reconciled slots for ${businessId}: ${result.deleted} deleted, ${result.orphaned} orphaned`);
    } catch (err) {
      this.logger.error(`Slot reconciliation failed for ${businessId}: ${(err as Error).message}`);
    }
  }
}
