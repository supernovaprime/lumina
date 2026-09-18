import { Injectable, Logger } from '@nestjs/common';
import { SlotGeneratorService } from '../../business/slot-generator.service';

@Injectable()
export class GenerateSlotsProcessor {
  private readonly logger = new Logger(GenerateSlotsProcessor.name);

  constructor(private readonly slotGenerator: SlotGeneratorService) {}

  async process(businessId: string, horizonDays: number = 30): Promise<void> {
    try {
      const result = await this.slotGenerator.generateSlots(businessId, horizonDays);
      this.logger.log(`Generated slots for ${businessId}: ${(result as any)?.created ?? 0} created`);
    } catch (err) {
      this.logger.error(`Slot generation failed for ${businessId}: ${(err as Error).message}`);
    }
  }
}
