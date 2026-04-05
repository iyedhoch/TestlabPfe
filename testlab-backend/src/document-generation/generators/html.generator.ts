import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import type { CahierDocumentModel, FsdDocumentModel, SupportedDocumentType } from '../adapters/testlab-data.adapter';

@Injectable()
export class HtmlGenerator {
  generate(
    model: CahierDocumentModel | FsdDocumentModel,
    _mode?: string,
    documentType: SupportedDocumentType = 'cahier',
  ): string {
    if (documentType === 'fsd') {
      return Handlebars.compile('<html><body><h1>{{metadata.title}}</h1><p>{{metadata.projectName}}</p></body></html>')(model);
    }

    return Handlebars.compile('<html><body><h1>{{metadata.title}}</h1><p>{{project.name}}</p></body></html>')(model as CahierDocumentModel);
  }
}