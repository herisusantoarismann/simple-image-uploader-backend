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

  @Get(':slug')
  async getFile(@Param('slug') slug: string) {
    const file = await this.prismaService.getPrisma().image.findFirst({
      where: {
        slug: slug,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return {
      status: 'OK',
      data: {
        name: file.name,
        type: file.type,
        size: file.size,
        url: process.env.BASE_URL + '/uploads/' + file.name,
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
    const uuid = uuidv4();
    const ext = file.mimetype.split('/')[1]; // Dapatkan ekstensi dari tipe file
    const fileSizeKB = Math.round(file.size / 1024); // Ubah ukuran file ke kilobyte dan bulatkan

    const savedFile = await this.prismaService.getPrisma().image.create({
      data: {
        slug: uuid,
        name: file.filename,
        type: ext,
        size: fileSizeKB.toString(),
      },
    });

    if (!savedFile) {
      throw new NotFoundException('File not saved');
    }

    return {
      status: 'OK',
      data: {
        fileName: savedFile.name,
        slug: savedFile.slug,
        type: savedFile.type,
        size: savedFile.size,
        url: process.env.BASE_URL + '/uploads/' + savedFile.name,
      },
    };
  }
}
