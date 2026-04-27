import puppeteer from 'puppeteer';
import { buildPuppeteerLaunchOptions } from './puppeteer-launch.helper';

export interface RichEditHydrationPayload {
  editValues?: Record<string, string>;
  richEditValues?: Record<string, string>;
  sectionBackgroundValues?: Record<string, string>;
  pageStyle?: {
    backgroundColor?: string;
  };
}

function hasRichEditPayload(payload?: RichEditHydrationPayload): boolean {
  if (!payload) {
    return false;
  }

  return Boolean(
    (payload.richEditValues && Object.keys(payload.richEditValues).length > 0) ||
      (payload.sectionBackgroundValues && Object.keys(payload.sectionBackgroundValues).length > 0) ||
      (payload.editValues && Object.keys(payload.editValues).length > 0) ||
      payload.pageStyle?.backgroundColor,
  );
}

export async function hydrateHtmlWithRichEdits(
  htmlContent: string,
  editPayload?: RichEditHydrationPayload,
): Promise<string> {
  if (!hasRichEditPayload(editPayload)) {
    return htmlContent;
  }

  const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 12000,
    });

    await page.evaluate((payload) => {
      const resolvedPayload = payload || {};
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

      body.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,li,th,td,span').forEach((element) => {
        if (!shouldAutoMarkEditable(element)) {
          return;
        }

        element.setAttribute('data-edit-path', buildAutoEditPath(element, body));
      });

      if (resolvedPayload.pageStyle?.backgroundColor) {
        body.style.backgroundColor = resolvedPayload.pageStyle.backgroundColor;
      }

      const pageColor = resolvedPayload.pageStyle?.backgroundColor;
      const styleId = 'document-page-background-style';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = `
        @page {
          margin: 0;
        }

        html,
        body {
          min-height: 100%;
          background-color: ${pageColor || '#ffffff'};
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        body {
          margin: 0;
          padding: 18mm 14mm;
        }

        article.page {
          max-width: none;
          width: 100%;
          margin: 0;
        }

        td,
        th {
          background-color: #ffffff;
        }
      `;

      if (resolvedPayload.sectionBackgroundValues) {
        Object.entries(resolvedPayload.sectionBackgroundValues).forEach(([path, value]) => {
          document.querySelectorAll<HTMLElement>(`[data-edit-path="${path}"]`).forEach((element) => {
            element.style.backgroundColor = value;
          });
        });
      }

      document.querySelectorAll<HTMLElement>('[data-edit-path]').forEach((element) => {
        const path = element.getAttribute('data-edit-path');
        if (!path) {
          return;
        }

        if (
          resolvedPayload.richEditValues &&
          Object.prototype.hasOwnProperty.call(resolvedPayload.richEditValues, path)
        ) {
          element.innerHTML = resolvedPayload.richEditValues[path];
          return;
        }

        if (
          resolvedPayload.editValues &&
          Object.prototype.hasOwnProperty.call(resolvedPayload.editValues, path)
        ) {
          element.textContent = resolvedPayload.editValues[path];
        }
      });
    }, editPayload);

    return await page.content();
  } finally {
    await browser.close();
  }
}