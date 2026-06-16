import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { buildCutsRunDeps } from '../cuts/build-cuts-run-deps';
import { setCutsRunDeps } from '../cuts/ports/cuts-run-deps';

@Injectable()
export class CutsRunDepsAdapter implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    setCutsRunDeps(buildCutsRunDeps(this.prisma, this.storage, this.config));
  }
}
