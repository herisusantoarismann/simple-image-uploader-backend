import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { diskStorage } from 'multer';

@Controller()
export class AppController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get(':id')
  async getFile(@Param('id') id: string) {
    const file = await this.prismaService.getPrisma().image.findFirst({
      where: {
        id: Number(id),
      },
    });

    console.log(file);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      status: 'OK',
      data: {
        image: process.env.BASE_URL + '/uploads/' + file.fileName,
      },
    };
  }

  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uuid = uuidv4();
          const ext = path.extname(file.originalname);
          cb(null, uuid + ext);
        },
      }),
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: '.(png|jpeg|jpg)',
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    const savedFile = await this.prismaService.getPrisma().image.create({
      data: {
        fileName: file.filename,
      },
    });

    if (!savedFile) {
      throw new NotFoundException('File not saved');
    }

    return {
      status: 'OK',
      data: {
        fileName: savedFile.fileName,
      },
    };
  }
}
