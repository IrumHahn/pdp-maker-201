import { Module } from "@nestjs/common";
import { SourcingController } from "./sourcing.controller";
import { SourcingService } from "./sourcing.service";
import { SourcingStoreService } from "./sourcing.store";
import { PrismaService } from "../../prisma/prisma.service";

@Module({
  controllers: [SourcingController],
  providers: [PrismaService, SourcingStoreService, SourcingService]
})
export class SourcingModule {}
