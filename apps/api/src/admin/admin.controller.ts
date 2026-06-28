import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { createCompanyDtoSchema, type CreateCompanyDto } from './dto/create-company.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('companies')
  @UsePipes(new ZodValidationPipe(createCompanyDtoSchema))
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.adminService.createCompanyWithOwner(dto);
  }
}
