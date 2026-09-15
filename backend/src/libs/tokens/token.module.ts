import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
