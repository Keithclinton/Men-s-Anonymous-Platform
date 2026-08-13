import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateResourceDto {
  @IsIn(['ARTICLE', 'VIDEO'])
  type: 'ARTICLE' | 'VIDEO';

  @IsString()
  @MinLength(2)
  title: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
