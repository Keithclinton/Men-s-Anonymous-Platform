import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffRoles } from '../../common/decorators/staff-roles.decorator';
import { Role } from '../../generated/prisma-core';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ResourcesService } from './resources.service';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Public()
  @Get()
  list(@Query('tag') tag?: string) {
    return this.resources.listPublished(tag);
  }

  @Public()
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.resources.getById(id);
  }

  @Roles(Role.ADMIN)
  @StaffRoles('STAFF_MODERATOR')
  @Post()
  create(@Body() dto: CreateResourceDto) {
    return this.resources.create(dto);
  }
}
