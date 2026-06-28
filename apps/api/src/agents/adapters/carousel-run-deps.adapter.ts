import { Injectable, OnModuleInit } from '@nestjs/common';
import { buildCarouselRunDeps } from '../carousel/build-carousel-run-deps';
import { setCarouselRunDeps } from '../carousel/ports/carousel-run-deps';

@Injectable()
export class CarouselRunDepsAdapter implements OnModuleInit {
  onModuleInit(): void {
    setCarouselRunDeps(buildCarouselRunDeps());
  }
}
