import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { buildPuppeteerLaunchOptions } from './puppeteer-launch.helper';
import {
  hydrateHtmlWithRichEdits,
  type RichEditHydrationPayload,
} from './rich-editing.helper';

@Injectable()
export class PdfGenerator {
  private static readonly IMAGE_FETCH_TIMEOUT_MS = 15_000;

  async generateFromHtml(
    htmlContent: string,
    editPayload?: RichEditHydrationPayload,
  ): Promise<Buffer> {
    const browser = await puppeteer.launch(buildPuppeteerLaunchOptions());

    try {
      const page = await browser.newPage();
      const appPort = process.env.APP_PORT ?? '5000';
      const htmlWithInlinedImages = await this.inlineExternalImages(htmlContent);
      const contentWithBase = this.injectBaseHref(
        htmlWithInlinedImages,
        `http://127.0.0.1:${appPort}`,
      );

      let hydratedHtml = contentWithBase;
      try {
        hydratedHtml = await hydrateHtmlWithRichEdits(contentWithBase, editPayload);
      } catch (error) {
        // Fail open: preserve the save/download flow even if rich hydration cannot be applied.
        hydratedHtml = contentWithBase;
      }

      // Network idle is too strict for image-heavy FSDs; DOM readiness plus a
      // separate image wait is more reliable and still keeps image rendering intact.
      await page.setContent(hydratedHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      // Ensure remote images (e.g. Cloudinary) are loaded before PDF snapshot.
      await page.evaluate(async () => {
        const images = Array.from(document.images || []);

        await Promise.all(
          images.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) {
                  resolve();
                  return;
                }

                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
                setTimeout(done, 10000);
              }),
          ),
        );
      });

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

  private async inlineExternalImages(html: string): Promise<string> {
    const imgTagRegex = /<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi;
    const externalUrls = new Set<string>();

    for (const match of html.matchAll(imgTagRegex)) {
      const src = (match[2] || '').trim();
      if (/^https?:\/\//i.test(src)) {
        externalUrls.add(src);
      }
    }

    if (externalUrls.size === 0) {
      return html;
    }

    const dataUriByUrl = new Map<string, string>();

    await Promise.all(
      Array.from(externalUrls).map(async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          PdfGenerator.IMAGE_FETCH_TIMEOUT_MS,
        );

        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            return;
          }

          const contentType = response.headers.get('content-type') || '';
          if (!contentType.toLowerCase().startsWith('image/')) {
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          dataUriByUrl.set(url, `data:${contentType};base64,${base64}`);
        } catch {
          // Fail open: keep original URL if fetch/inlining fails.
        } finally {
          clearTimeout(timeoutId);
        }
      }),
    );

    let output = html;
    for (const [url, dataUri] of dataUriByUrl.entries()) {
      output = output.split(url).join(dataUri);
    }

    return output;
  }
}
