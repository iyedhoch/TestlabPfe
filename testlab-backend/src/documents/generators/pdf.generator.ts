import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { buildPuppeteerLaunchOptions } from './puppeteer-launch.helper';

type EditableValues = Record<string, string>;

@Injectable()
export class PdfGenerator {
  async generateFromHtml(
    htmlContent: string,
    editValues?: EditableValues,
  ): Promise<Buffer> {
    const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

    try {
      const page = await browser.newPage();
      const appPort = process.env.APP_PORT ?? '5000';
      const contentWithBase = this.injectBaseHref(
        htmlContent,
        `http://127.0.0.1:${appPort}`,
      );

      await page.setContent(contentWithBase, { waitUntil: 'networkidle0' });

      if (editValues && Object.keys(editValues).length > 0) {
        await page.evaluate((values) => {
          const body = document.body;

          const shouldAutoMarkEditable = (element: HTMLElement): boolean => {
            if (element.hasAttribute('data-edit-path')) {
              return false;
            }

            if (element.closest('style,script')) {
              return false;
            }

            const textContent = element.textContent?.replace(/\u00a0/g, ' ').trim() || '';
            if (!textContent.length) {
              return false;
            }

            if (element.children.length > 0) {
              return false;
            }

            return true;
          };

          const buildAutoEditPath = (element: HTMLElement, root: HTMLElement): string => {
            const segments: string[] = [];
            let current: HTMLElement | null = element;

            while (current && current !== root) {
              const parentElement: HTMLElement | null = current.parentElement;
              if (!parentElement) {
                break;
              }

              const currentTagName = current.tagName;
              const siblings = Array.from(parentElement.children).filter(
                (candidate: Element) => candidate.tagName === currentTagName,
              );
              const index = Math.max(0, siblings.indexOf(current));
              segments.unshift(`${current.tagName.toLowerCase()}${index}`);
              current = parentElement;
            }

            return `auto.${segments.join('.')}`;
          };

          body
            .querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,li,th,td,span')
            .forEach((element) => {
              if (!shouldAutoMarkEditable(element)) {
                return;
              }

              element.setAttribute('data-edit-path', buildAutoEditPath(element, body));
            });

          document.querySelectorAll<HTMLElement>('[data-edit-path]').forEach((element) => {
            const path = element.getAttribute('data-edit-path');
            if (!path) {
              return;
            }

            if (Object.prototype.hasOwnProperty.call(values, path)) {
              element.textContent = values[path];
            }
          });
        }, editValues);
      }

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
