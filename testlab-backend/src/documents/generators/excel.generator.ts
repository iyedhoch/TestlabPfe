import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type {
  Suite,
  TestCase,
} from '../interfaces/cahier-recette.interface';
import type { CahierDocumentModel } from '../interfaces/document-model.interface';

@Injectable()
export class ExcelGenerator {
  async generate(model: CahierDocumentModel): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    this.buildMetadataSheet(workbook, model);
    this.buildContextSheet(workbook, model);
    this.buildProjectSheet(workbook, model);
    this.buildRevisionSheet(workbook, model);
    this.buildApprovalSheet(workbook, model);
    this.buildTestCasesSheet(workbook, model);
    this.buildSynthesisSheet(workbook, model);

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output as ArrayBuffer);
  }

  private buildMetadataSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Metadonnees');
    worksheet.columns = [
      { header: 'Champ', key: 'label', width: 24 },
      { header: 'Valeur', key: 'value', width: 70 },
    ];

    this.applyHeaderStyle(worksheet);

    worksheet.addRow({ label: 'Titre', value: model.metadata.title });
    worksheet.addRow({ label: 'Client', value: model.metadata.clientName });
    worksheet.addRow({ label: 'Projet', value: model.project.name });
    worksheet.addRow({ label: 'Version', value: model.metadata.version });
    worksheet.addRow({ label: 'Date', value: model.metadata.date });
    worksheet.addRow({ label: 'Auteur', value: model.metadata.author });

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildContextSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Description & Objectif');
    worksheet.columns = [
      { header: 'Section', key: 'label', width: 26 },
      { header: 'Contenu', key: 'value', width: 80 },
    ];

    this.applyHeaderStyle(worksheet);

    worksheet.addRow({ label: 'Description', value: model.context.description });
    worksheet.addRow({ label: 'Objectif', value: model.context.objective });

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildProjectSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Informations projet');
    worksheet.columns = [
      { header: 'Champ', key: 'label', width: 26 },
      { header: 'Valeur', key: 'value', width: 70 },
    ];

    this.applyHeaderStyle(worksheet);

    worksheet.addRow({ label: 'Projet', value: model.project.name });
    worksheet.addRow({ label: 'Responsable', value: model.project.owner });
    worksheet.addRow({ label: 'Identifiant', value: String(model.project.id) });
    worksheet.addRow({
      label: 'Anomalies ouvertes',
      value: model.project.openDefects ?? 0,
    });
    worksheet.addRow({ label: 'Client', value: model.metadata.clientName });

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildRevisionSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    type Revision = {
      date: string;
      version: string;
      author: string;
      status: string;
    };
    const worksheet = workbook.addWorksheet('Revisions');
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 16 },
      { header: 'Version', key: 'version', width: 14 },
      { header: 'Auteur', key: 'author', width: 30 },
      { header: 'Statut', key: 'status', width: 18 },
    ];

    this.applyHeaderStyle(worksheet);

    const revisions = (model as { revisions?: Revision[] }).revisions ?? [];
    for (const revision of revisions) {
      worksheet.addRow({
        date: revision.date,
        version: revision.version,
        author: revision.author,
        status: revision.status,
      });
    }

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildApprovalSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Approbations');
    worksheet.columns = [
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'Role', key: 'role', width: 24 },
      { header: 'Date', key: 'date', width: 16 },
    ];

    this.applyHeaderStyle(worksheet);

    for (const approval of model.approvals) {
      worksheet.addRow({
        name: approval.approverName || approval.name,
        role: approval.approverRole || approval.role,
        date: approval.approvalDate || approval.date,
      });
    }

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildTestCasesSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Cas de test');
    worksheet.columns = [
      { header: 'Suite', key: 'suite', width: 36 },
      { header: 'Code', key: 'code', width: 16 },
      { header: 'Nom', key: 'name', width: 45 },
      { header: 'Resume', key: 'summary', width: 48 },
      { header: 'Preconditions', key: 'preconditions', width: 52 },
      { header: 'Etape', key: 'step', width: 12 },
      { header: 'Action', key: 'action', width: 50 },
      { header: 'Resultat attendu', key: 'expected', width: 55 },
    ];

    this.applyHeaderStyle(worksheet);

    const flattenedSuites = this.flattenSuites(model.suites);
    for (const suite of flattenedSuites) {
      for (const testCase of suite.testCases) {
        const preconditions = this.formatPreconditions(testCase.preconditions);
        worksheet.addRow({
          suite: suite.path,
          code: testCase.code,
          name: testCase.name,
          summary: testCase.summary,
          preconditions,
          step: 'Preconditions',
          action: '',
          expected: '',
        });

        if (testCase.steps.length === 0) {
          continue;
        }

        for (const step of testCase.steps) {
          worksheet.addRow({
            suite: suite.path,
            code: testCase.code,
            name: testCase.name,
            summary: testCase.summary,
            preconditions: '',
            step: step.order,
            action: step.action,
            expected: step.expectedResult,
          });
        }
      }
    }

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private buildSynthesisSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Synthese');
    worksheet.columns = [
      { header: 'Indicateur', key: 'label', width: 34 },
      { header: 'Valeur', key: 'value', width: 30 },
    ];

    this.applyHeaderStyle(worksheet);

    const flattenedSuites = this.flattenSuites(model.suites);
    const totalSuites = flattenedSuites.length;
    const totalTestCases = flattenedSuites.reduce(
      (total, suite) => total + suite.testCases.length,
      0,
    );
    const totalSteps = flattenedSuites.reduce(
      (total, suite) =>
        total +
        suite.testCases.reduce((count, testCase) => count + testCase.steps.length, 0),
      0,
    );

    worksheet.addRow({ label: 'Nombre de suites', value: totalSuites });
    worksheet.addRow({ label: 'Nombre total de cas', value: totalTestCases });
    worksheet.addRow({ label: 'Nombre total d\'etapes', value: totalSteps });
    worksheet.addRow({
      label: 'Anomalies ouvertes',
      value: model.project.openDefects ?? 0,
    });

    this.applyBodyStyle(worksheet);
    this.autoSizeColumns(worksheet);
  }

  private applyHeaderStyle(worksheet: ExcelJS.Worksheet): void {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
  }

  private applyBodyStyle(worksheet: ExcelJS.Worksheet): void {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: 'top',
          wrapText: true,
        };
      }
    });
  }

  private autoSizeColumns(worksheet: ExcelJS.Worksheet, maxWidth = 80): void {
    worksheet.columns.forEach((column) => {
      let maxLength = (column.header?.toString().length ?? 10) + 2;

      if (column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const value = cell.value?.toString() ?? '';
          const effectiveLength = Math.min(value.length + 2, maxWidth);
          if (effectiveLength > maxLength) {
            maxLength = effectiveLength;
          }
        });
      }

      column.width = Math.max(column.width ?? 10, maxLength);
    });
  }

  private formatPreconditions(preconditions: TestCase['preconditions']): string {
    if (!preconditions || preconditions.length === 0) {
      return '';
    }

    return preconditions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => `${item.order}. ${item.content}`)
      .join('\n');
  }

  private flattenSuites(
    suites: Suite[],
    parentPath = '',
  ): Array<{ path: string; testCases: TestCase[] }> {
    return suites.flatMap((suite) => {
      const path = parentPath ? `${parentPath} > ${suite.name}` : suite.name;
      return [
        { path, testCases: suite.testCases },
        ...this.flattenSuites(suite.children, path),
      ];
    });
  }
}
