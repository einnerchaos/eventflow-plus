import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { SourcesService } from './sources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, AdminOnly } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { QuerySourcesDto } from './dto/query-sources.dto';

@ApiTags('Sources')
@Controller('sources')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Create new event source' })
  @ApiBody({ type: CreateSourceDto })
  async createSource(
    @Body() dto: CreateSourceDto,
    @Request() req: RequestWithUser,
  ) {
    return this.sourcesService.createSource(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all sources' })
  async listSources(@Query() query: QuerySourcesDto) {
    return this.sourcesService.listSources(query);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Get source details' })
  async getSource(@Param('id') id: string) {
    const source = await this.sourcesService.getSource(id);
    if (!source) throw new BadRequestException('Source not found');
    return source;
  }

  @Get(':id/api-key')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Generate/regenerate API key for source' })
  async regenerateApiKey(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourcesService.regenerateApiKey(id, req.user.id);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Update source' })
  async updateSource(
    @Param('id') id: string,
    @Body() dto: UpdateSourceDto,
    @Request() req: RequestWithUser,
  ) {
    return this.sourcesService.updateSource(id, dto, req.user.id);
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Delete source' })
  async deleteSource(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourcesService.deleteSource(id, req.user.id);
  }

  @Post(':id/activate')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Activate source' })
  async activateSource(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.sourcesService.setActive(id, true, req.user.id);
    return { message: 'Source activated' };
  }

  @Post(':id/deactivate')
  @AdminOnly()
  @ApiParam({ name: 'id', description: 'Source ID' })
  @ApiOperation({ summary: 'Deactivate source' })
  async deactivateSource(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.sourcesService.setActive(id, false, req.user.id);
    return { message: 'Source deactivated' };
  }
}
