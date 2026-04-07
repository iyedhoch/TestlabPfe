import { Injectable } from '@nestjs/common';
import type { ProjectExecutionRecord } from '../../mock-data/project-executions.data';
import type { TemplateConfigRecord } from '../../mock-data/template-configs.data';

@Injectable()
export class DocumentFilterService {
  applyTemplateFilters(
    executions: ProjectExecutionRecord[],
    templateConfig: TemplateConfigRecord,
  ): ProjectExecutionRecord[] {
    if (templateConfig.failedOnly) {
      return executions.filter(
        (item) => item.status === 'failed' || item.status === 'blocked',
      );
    }

    return executions;
  }
}
