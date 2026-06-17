import { downloadHtmlBodyAsPdf } from './arabicPdfExport';
import {
  buildReportDetailsBodyHtml,
  reportDetailsPdfFilename,
} from './reportDetailsHtml';

export async function exportReportDetailsPdf(report) {
  if (!report) return;
  const bodyHtml = buildReportDetailsBodyHtml(report);
  if (!bodyHtml) return;
  await downloadHtmlBodyAsPdf(bodyHtml, reportDetailsPdfFilename(report));
}
