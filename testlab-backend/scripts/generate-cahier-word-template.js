const fs = require('fs');
const path = require('path');
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require('docx');

const outputPath = path.join(
  __dirname,
  '..',
  'src',
  'documents',
  'templates',
  'word',
  'cahier-template.docx',
);

function heading(text, level = HeadingLevel.HEADING_2) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 220, after: 120 },
  });
}

function body(text) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 80 },
  });
}

function sectionDivider() {
  return new Paragraph({
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        color: 'D0D0D0',
        size: 6,
      },
    },
    spacing: { after: 120 },
  });
}

function createMetadataTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['Client', '{metadata.clientName}'],
      ['Projet', '{project.name}'],
      ['Auteur', '{metadata.author}'],
      ['Version', '{metadata.version}'],
      ['Date', '{metadata.date}'],
    ].map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph(value)],
            }),
          ],
        }),
    ),
  });
}

function createTemplateFlagsTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['showStatistics', '{template.showStatistics}'],
      ['showExecutions', '{template.showExecutions}'],
      ['showPreconditions', '{template.showPreconditions}'],
      ['showSteps', '{template.showSteps}'],
      ['showApprovals', '{template.showApprovals}'],
      ['showContext', '{template.showContext}'],
      ['failedOnly', '{template.failedOnly}'],
    ].map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [new Paragraph(value)],
            }),
          ],
        }),
    ),
  });
}

function createTestCasesTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          'Code',
          'Name',
          'Preconditions',
          'Steps',
          'Expected Results',
        ].map(
          (header) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
            }),
        ),
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph('{#testCases}{code}')],
          }),
          new TableCell({
            children: [
              new Paragraph('{name}'),
              new Paragraph({
                children: [new TextRun({ text: 'Summary: ', bold: true }), new TextRun('{summary}')],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph('{#preconditions}- {content}{/preconditions}'),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph('{#steps}{order}. {action}{/steps}'),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph('{#steps}{order}. {expectedResult}{/steps}{/testCases}'),
            ],
          }),
        ],
      }),
    ],
  });
}

async function generateTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'Cahier de Recette', bold: true, size: 56 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 240 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '{metadata.title}', size: 30 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 260 },
          }),
          createMetadataTable(),
          new Paragraph({ text: 'Company Logo: {metadata.companyLogo}', spacing: { before: 240, after: 80 } }),
          new Paragraph({ text: 'Client Logo: {metadata.clientLogo}', spacing: { after: 320 } }),
          new Paragraph({
            children: [new PageBreak()],
          }),

          heading('Context', HeadingLevel.HEADING_1),
          body('{#template.showContext}Description: {context.description}{/template.showContext}'),
          body('{#template.showContext}Objective: {context.objective}{/template.showContext}'),
          sectionDivider(),

          heading('Project Information', HeadingLevel.HEADING_1),
          body('Project ID: {project.id}'),
          body('Project Name: {project.name}'),
          body('Project Owner: {project.owner}'),
          sectionDivider(),

          heading('Test Suites', HeadingLevel.HEADING_1),
          body('{#suites}Suite: {name}'),
          body('Order: {order}'),
          createTestCasesTable(),
          body('{#children}Nested Suite: {name}'),
          createTestCasesTable(),
          body('{/children}{/suites}'),
          sectionDivider(),

          new Paragraph('{#template.showApprovals}'),
          heading('Approvals', HeadingLevel.HEADING_1),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: ['Name', 'Role', 'Date'].map(
                  (header) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: header, bold: true })] })],
                    }),
                ),
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('{#approvals}{name}')] }),
                  new TableCell({ children: [new Paragraph('{role}')] }),
                  new TableCell({ children: [new Paragraph('{date}{/approvals}')] }),
                ],
              }),
            ],
          }),
          new Paragraph('{/template.showApprovals}'),
          sectionDivider(),

          new Paragraph('{#template.showStatistics}'),
          heading('Template Configuration', HeadingLevel.HEADING_1),
          body('Template Name: {template.name}'),
          body('Template Title: {template.title}'),
          body('Template Footer: {template.footer}'),
          createTemplateFlagsTable(),
          new Paragraph('{/template.showStatistics}'),
        ],
      },
    ],
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  console.log(`Template generated at: ${outputPath}`);
}

generateTemplate().catch((error) => {
  console.error('Failed to generate cahier Word template');
  console.error(error);
  process.exit(1);
});
