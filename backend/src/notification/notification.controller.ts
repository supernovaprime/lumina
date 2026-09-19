import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { PrismaService } from '../libs/prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 20;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      this.prisma.notification.count({ where: { userId: user.userId } }),
    ]);

    return {
      data: notifications,
      meta: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
    };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.userId) {
      return { message: 'Notification not found' };
    }

    await this.prisma.notification.update({
      where: { id },
      data: { status: 'READ' },
    });

    return { message: 'Notification marked as read' };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    await this.prisma.notification.updateMany({
      where: { userId: user.userId, status: { not: 'READ' } },
      data: { status: 'READ' },
    });

    return { message: 'All notifications marked as read' };
  }
}
