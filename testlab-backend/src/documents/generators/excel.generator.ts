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

    this.buildSuiteSheet(workbook, model);

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output as ArrayBuffer);
  }

  private buildSuiteSheet(
    workbook: ExcelJS.Workbook,
    model: CahierDocumentModel,
  ): void {
    const worksheet = workbook.addWorksheet('Smoke Tests');
    worksheet.views = [{ zoomScale: 115 }];
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 8.89 },
      { header: 'Section Hierarchy', key: 'hierarchy', width: 38.78 },
      { header: 'Section', key: 'section', width: 35.22 },
      { header: 'Test case title', key: 'title', width: 29.44 },
      { header: 'Preconditions', key: 'preconditions', width: 27.78 },
      { header: 'Steps', key: 'steps', width: 55 },
      { header: 'Expected Result', key: 'expected', width: 80.55 },
    ];
    const headerRow = worksheet.getRow(1);
    headerRow.values = [
      undefined,
      ...worksheet.columns.map((column) => String(column.header ?? '')),
    ];
    this.applyHeaderRowStyle(headerRow);

    for (const suite of model.suites) {
      this.addSuiteBlock(worksheet, suite);
    }
  }

  private addSuiteBlock(worksheet: ExcelJS.Worksheet, suite: Suite): void {
    const suiteRow = worksheet.addRow({ id: suite.name });
    worksheet.mergeCells(suiteRow.number, 1, suiteRow.number, 7);
    this.applySuiteRowStyle(suiteRow);

    const nestedSuites = this.flattenSuites([suite]);
    for (const nested of nestedSuites) {
      for (const testCase of nested.testCases) {
        const row = worksheet.addRow({
          id: testCase.code,
          hierarchy: nested.path,
          section: nested.name,
          title: testCase.name,
          preconditions: this.formatPreconditions(testCase.preconditions),
          steps: this.formatSteps(testCase.steps),
          expected: this.formatExpectedResults(testCase.steps),
        });
        this.applyTestCaseRowStyle(row);
      }
    }
  }

  private applyHeaderRowStyle(row: ExcelJS.Row): void {
    row.height = 17.4;
    row.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB9CDE5' },
      };
    });
  }

  private applySuiteRowStyle(row: ExcelJS.Row): void {
    row.height = 37.8;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF95B3D7' },
      };
    });
  }

  private applyTestCaseRowStyle(row: ExcelJS.Row): void {
    row.height = 126;
    row.eachCell((cell, colNumber) => {
      if (colNumber === 1) {
        cell.alignment = { vertical: 'top' };
        return;
      }
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  }

  private formatPreconditions(preconditions: TestCase['preconditions']): string {
    if (!preconditions || preconditions.length === 0) {
      return '';
    }

    return preconditions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((item) => item.content.trim())
      .filter((item) => item.length > 0)
      .join('\n');
  }

  private formatSteps(steps: TestCase['steps']): string {
    if (!steps || steps.length === 0) {
      return '';
    }

    return steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => `${step.order}.${(step.action || '').trim()}`)
      .join('\n');
  }

  private formatExpectedResults(steps: TestCase['steps']): string {
    if (!steps || steps.length === 0) {
      return '';
    }

    return steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => (step.expectedResult || '').trim())
      .filter((value) => value.length > 0)
      .join('\n');
  }

  private flattenSuites(
    suites: Suite[],
    parentPath = '',
  ): Array<{ path: string; name: string; testCases: TestCase[] }> {
    return suites.flatMap((suite) => {
      const path = parentPath ? `${parentPath} > ${suite.name}` : suite.name;
      return [
        { path, name: suite.name, testCases: suite.testCases },
        ...this.flattenSuites(suite.children, path),
      ];
    });
  }
}
