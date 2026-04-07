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
    const worksheet = workbook.addWorksheet('Test Cases');

    worksheet.columns = [
      { header: 'Suite', key: 'suite', width: 36 },
      { header: 'Test Case Code', key: 'code', width: 18 },
      { header: 'Test Case Name', key: 'name', width: 45 },
      { header: 'Summary', key: 'summary', width: 48 },
      { header: 'Step #', key: 'step', width: 10 },
      { header: 'Action', key: 'action', width: 50 },
      { header: 'Expected Result', key: 'expected', width: 55 },
    ];

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', wrapText: true };

    const flattenedSuites = this.flattenSuites(model.suites);
    for (const suite of flattenedSuites) {
      for (const testCase of suite.testCases) {
        if (testCase.steps.length === 0) {
          worksheet.addRow({
            suite: suite.path,
            code: testCase.code,
            name: testCase.name,
            summary: testCase.summary,
            step: '',
            action: '',
            expected: '',
          });
          continue;
        }

        for (const step of testCase.steps) {
          worksheet.addRow({
            suite: suite.path,
            code: testCase.code,
            name: testCase.name,
            summary: testCase.summary,
            step: step.order,
            action: step.action,
            expected: step.expectedResult,
          });
        }
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = {
          vertical: 'top',
          wrapText: true,
        };
      }
    });

    worksheet.columns.forEach((column) => {
      let maxLength = (column.header?.toString().length ?? 10) + 2;

      if (column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const value = cell.value?.toString() ?? '';
          const effectiveLength = Math.min(value.length + 2, 80);
          if (effectiveLength > maxLength) {
            maxLength = effectiveLength;
          }
        });
      }

      column.width = Math.max(column.width ?? 10, maxLength);
    });

    const output = await workbook.xlsx.writeBuffer();
    return Buffer.from(output as ArrayBuffer);
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
