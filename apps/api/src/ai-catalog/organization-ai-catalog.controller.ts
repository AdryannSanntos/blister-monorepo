import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { builderCatalogQuerySchema } from './dto/builder-catalog.dto';
import { AICatalogService } from './ai-catalog.service';

@Controller('organizations/:orgId/ai')
export class OrganizationAICatalogController {
  constructor(private readonly aiCatalogService: AICatalogService) {}

  @Get('builder-catalog')
  @RequirePermission('agent.read')
  async listBuilderCatalog(@Param('orgId') orgId: string, @Query() query: unknown) {
    const parsed = builderCatalogQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.aiCatalogService.listBuilderCatalog(orgId, parsed.data);
  }
}
