import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { CopilotService, type CopilotMessage } from './copilot.service';

class MessageDto {
  @IsString()
  role!: 'user' | 'assistant' | 'system';

  @IsString()
  content!: string;
}

class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages!: MessageDto[];
}

class RcaDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  ciName?: string;
}

@ApiTags('copilot')
@ApiBearerAuth()
@Controller('copilot')
export class CopilotController {
  constructor(private copilot: CopilotService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Unified AI copilot chat' })
  chat(@CurrentUser() user: JwtPayload, @Body() body: ChatDto) {
    return this.copilot.chat(user.tenantId, body.messages as CopilotMessage[], user.sub);
  }

  @Post('rca')
  @ApiOperation({ summary: 'Run RCA workflow' })
  rca(@CurrentUser() user: JwtPayload, @Body() body: RcaDto) {
    return this.copilot.runRca(user.tenantId, body);
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Recommendation engine' })
  recommendations(@CurrentUser() user: JwtPayload) {
    return this.copilot.getRecommendations(user.tenantId).then((recommendations) => ({
      recommendations,
      total: recommendations.length,
    }));
  }
}
