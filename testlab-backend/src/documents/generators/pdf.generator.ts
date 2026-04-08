import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class PdfGenerator {
  async generateFromHtml(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      const appPort = process.env.APP_PORT ?? '5000';
      const contentWithBase = this.injectBaseHref(
        htmlContent,
        `http://127.0.0.1:${appPort}`,
      );

      await page.setContent(contentWithBase, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private injectBaseHref(htmlContent: string, baseHref: string): string {
    if (/<base\s+href=/i.test(htmlContent)) {
      return htmlContent;
    }

    const baseTag = `<base href="${baseHref}">`;
    if (/<head[^>]*>/i.test(htmlContent)) {
      return htmlContent.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}`);
    }

    return `${baseTag}${htmlContent}`;
  }
}
