import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { buildPuppeteerLaunchOptions } from './puppeteer-launch.helper';
import {
  hydrateHtmlWithRichEdits,
  type RichEditHydrationPayload,
} from './rich-editing.helper';
import { fetchRemoteBinary, toDataUri } from './remote-image.helper';

@Injectable()
export class PdfGenerator {
  private static readonly IMAGE_FETCH_TIMEOUT_MS = 15_000;

  async generateFromHtml(
    htmlContent: string,
    editPayload?: RichEditHydrationPayload,
    companyLogo?: string,
    clientLogo?: string,
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
      console.log('HTML length:', hydratedHtml.length);
      console.log('First 3000 chars:', hydratedHtml.substring(0, 3000));
      console.log('Last 2000 chars:', hydratedHtml.slice(-2000));
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

      const marginTopMm = 20;
      const marginBottomMm = 45;

      await page.evaluate(
        ({ pageHeightMm, marginTopMm, marginBottomMm }) => {
          const tocItems = Array.from(
            document.querySelectorAll('.toc-list .toc-item'),
          );
          if (tocItems.length === 0) {
            return;
          }

          const measure = document.createElement('div');
          measure.style.width = '1mm';
          measure.style.height = '1mm';
          measure.style.position = 'absolute';
          measure.style.visibility = 'hidden';
          document.body.appendChild(measure);
          const pxPerMm = measure.getBoundingClientRect().height;
          measure.remove();

          if (!pxPerMm || !Number.isFinite(pxPerMm)) {
            return;
          }

          const pageHeightPx =
            (pageHeightMm - marginTopMm - marginBottomMm) * pxPerMm;
          if (!pageHeightPx || pageHeightPx <= 0) {
            return;
          }

          tocItems.forEach((item) => {
            const link = item.querySelector('a[href^="#"]');
            const href = link ? link.getAttribute('href') || '' : '';
            const anchor = href.startsWith('#') ? href.slice(1) : '';
            if (!anchor) {
              return;
            }

            const target = document.getElementById(anchor);
            if (!target) {
              return;
            }

            const rect = target.getBoundingClientRect();
            const y = rect.top + window.scrollY;
            const pageNumber = Math.max(1, Math.floor(y / pageHeightPx) + 1);
            const spans = item.querySelectorAll('span');
            const pageSpan = spans.length ? spans[spans.length - 1] : null;
            if (pageSpan) {
              pageSpan.textContent = String(pageNumber);
            }
          });
        },
        { pageHeightMm: 297, marginTopMm, marginBottomMm },
      );
      

      const inlinedCompanyLogo = companyLogo
        ? await this.inlineSingleImage(companyLogo)
        : '';
      const inlinedClientLogo = clientLogo
        ? await this.inlineSingleImage(clientLogo)
        : '';
      const footerTemplate = this.buildFooterTemplate(inlinedCompanyLogo, inlinedClientLogo);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate,
        margin: {
          top: '20mm',
          bottom: '30mm',   // <-- reserves space for the footer
          left: '15mm',
          right: '15mm',
        },
      });
      console.log('Margin bottom applied: 30mm');

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
        try {
          const result = await fetchRemoteBinary(url, {
            timeoutMs: PdfGenerator.IMAGE_FETCH_TIMEOUT_MS,
          });

          if (!result) {
            return;
          }

          if (!result.contentType.toLowerCase().startsWith('image/')) {
            return;
          }

          dataUriByUrl.set(url, toDataUri(result.contentType, result.buffer));
        } catch {
          // Fail open: keep original URL if fetch/inlining fails.
        }
      }),
    );

    let output = html;
    for (const [url, dataUri] of dataUriByUrl.entries()) {
      output = output.split(url).join(dataUri);
    }

    return output;
  }
  private async inlineSingleImage(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url; // already inlined
  try {
    const result = await fetchRemoteBinary(url, {
      timeoutMs: PdfGenerator.IMAGE_FETCH_TIMEOUT_MS,
    });
    if (!result) return url;
    return toDataUri(result.contentType, result.buffer);
  } catch {
    return url; // fallback to original URL
  }
}
    private buildFooterTemplate(companyLogo?: string, clientLogo?: string): string {
    const leftImg = companyLogo
      ? `<img src="${companyLogo}" style="height:24px;object-fit:contain;" />`
      : '';
    const rightImg = clientLogo
      ? `<img src="${clientLogo}" style="height:24px;object-fit:contain;" />`
      : '';

    return `
  <div style="
    width:100%;
    padding:0 15mm;
    display:flex;
    align-items:center;
    justify-content:space-between;
    font-size:11px;
    color:#6b6b6b;
    box-sizing:border-box;
    position:relative;
  ">
    <span style="width:150px;">${leftImg}</span>
    <span style="position:absolute; left:50%; transform:translateX(-50%);">
      <span class="pageNumber"></span>
    </span>
    <span style="width:150px; text-align:right;">${rightImg}</span>
  </div>
`;
  }
  
}
