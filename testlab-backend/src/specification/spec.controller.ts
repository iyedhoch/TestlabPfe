import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SpecService } from './spec.service';
import { Response } from 'express';
import { CreateTagDto, UpdateTagDto } from './spec.dto';

@Controller('specs')
export class SpecController {
  constructor(
    private readonly specService: SpecService,
    //private readonly clickUpService: ClickUpService,
  ) {}

  // ---------------- EPIC ----------------

  @Post('/create-epic')
async createEpic(@Body() body: any, @Res() res: Response) {
  try {
    console.log('Received payload:', JSON.stringify(body, null, 2));
    const epic = await this.specService.createEpic(body);
    res.status(201).json(epic);
  } catch (error: any) {
    console.error('Create epic error:', error.message);
    console.error('Full error:', error);
    res.status(400).json({ error: error.message, details: error.stack });
  }
}

  @Put('/update-epic/:id')
  async updateEpic(
    @Param('id') id: string, // ✅ fixed: was @Query
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const epic = await this.specService.updateEpic(id, body);
      res.status(200).json(epic);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Delete('/delete-epic/:id')
  async deleteEpic(
    @Param('id') id: string, // ✅ fixed: was @Query
    @Res() res: Response,
  ) {
    try {
      const epic = await this.specService.deleteEpic(id);
      res.status(200).json(epic);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  

  // ---------------- FEATURE ----------------

  @Post('/create-feature')
  async createFeature(@Body() body: any, @Res() res: Response) {
    try {
      const feature = await this.specService.createFeature(body);
      res.status(201).json(feature);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Put('/update-feature/:id')
  async updateFeature(
    @Param('id') id: string, // ✅ fixed: was @Query
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const feature = await this.specService.updateFeature(id, body);
      res.status(200).json(feature);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Delete('/delete-feature/:id') // ⚠️ should this be @Delete instead of @Put?
  async deleteFeature(
    @Param('id') id: string, // ✅ fixed: was @Query
    @Res() res: Response,
  ) {
    try {
      await this.specService.deleteFeature(id);
      res.status(200).json();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- USER STORY ----------------

  @Post('/create-story')
  @UseInterceptors(FilesInterceptor('attachment'))
  async createUserStory(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      const userStory = await this.specService.createUserStory({
        ...body,
        fileBuffers: files?.map((file) => file.buffer) ?? [],
        originalNames: files?.map((file) => file.originalname) ?? [],
      });
      res.status(201).json(userStory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Put('/update-story/:id')
  @UseInterceptors(FilesInterceptor('attachment'))
  async updateUserStory(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      const userStory = await this.specService.updateUserStory(id, {
        ...body,
        fileBuffers: files?.map((file) => file.buffer) ?? [],
        originalNames: files?.map((file) => file.originalname) ?? [],
      });
      res.status(200).json(userStory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Delete('/delete-story/:id')
  async deleteUserStory(
    @Param('id') id: string, // ✅ fixed: was @Query
    @Res() res: Response,
  ) {
    try {
      await this.specService.deleteUserStory(id);
      res.status(200).json();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ---------------- TAG ----------------

  @Get('/tags')
  async getAllTag(@Res() res: Response) {
    try {
      const tags = await this.specService.getAllTag();
      res.status(200).json(tags);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Get('/tags/:id')
  async getTagById(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      const tag = await this.specService.getTagById(id);
      res.status(200).json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Post('tags')
  async createTag(@Body() body: CreateTagDto, @Res() res: Response) {
    try {
      const tag = await this.specService.createTag(body);
      res.status(201).json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Put('tags/:id')
  async updateTag(
    @Param('id') id: string,
    @Body() body: UpdateTagDto,
    @Res() res: Response,
  ) {
    try {
      const tag = await this.specService.updateTag(id, body);
      res.status(200).json(tag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Delete('tags/:id')
  async deleteTag(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    try {
      await this.specService.deleteTag(id);
      res.status(200).json();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  @Get('/:projectId')
  async getEpicsByProject(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ) {
    try {
      const epics = await this.specService.getEpicsByProject(projectId);
      res.status(200).json(epics);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
