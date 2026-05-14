import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createOrganizationSchema, updateOrganizationSchema } from './dto';
import { OrganizationService } from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async create(@Body() body: unknown) {
    const parsed = createOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const { userId, ...organization } = parsed.data;

    return this.organizationService.createWorkspace(userId, organization);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.organizationService.findByUserId(userId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.organizationService.findById(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationService.findBySlug(slug);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    const parsed = updateOrganizationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.organizationService.update(id, parsed.data);
  }
}
