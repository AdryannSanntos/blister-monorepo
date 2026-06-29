import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { buildCarouselRunDeps } from '../carousel/build-carousel-run-deps';
import { setCarouselRunDeps } from '../carousel/ports/carousel-run-deps';
import { CarouselRenderService } from '../carousel/services/carousel-render.service';
import { CarouselTemplateService } from '../carousel/services/carousel-template.service';

@Injectable()
export class CarouselRunDepsAdapter implements OnModuleInit {
  private readonly templateService = new CarouselTemplateService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly renderService: CarouselRenderService,
  ) {}

  onModuleInit(): void {
    setCarouselRunDeps(
      buildCarouselRunDeps(this.prisma, this.storage, this.templateService, this.renderService),
    );
  }
}
