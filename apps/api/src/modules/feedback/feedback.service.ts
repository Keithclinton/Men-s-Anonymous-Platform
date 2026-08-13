import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CorePrismaService } from '../../common/prisma/core-prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/** Post-session ratings tied to pseudonym + session, not identity. See ARCHITECTURE.md §4. */
@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: CorePrismaService) {}

  async submit(sessionId: string, raterId: string, dto: SubmitFeedbackDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { booking: true, feedback: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.booking.clientId !== raterId) {
      throw new ForbiddenException('Only the client in this session can leave feedback');
    }
    if (session.booking.status !== 'COMPLETED') {
      throw new ConflictException('Feedback can only be left after the session is completed');
    }
    if (session.feedback) {
      throw new ConflictException('Feedback has already been submitted for this session');
    }

    return this.prisma.feedback.create({
      data: {
        sessionId,
        raterId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async forProvider(providerId: string) {
    return this.prisma.feedback.findMany({
      where: { session: { booking: { providerId } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });
  }
}
