import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { REPORT_STYLES } from './schoolReportHtml.js';

/**
 * تحويل HTML عربي (RTL) إلى PDF عبر html2canvas مع دعم صفحات متعددة.
 */
export async function downloadHtmlBodyAsPdf(bodyHtml, filename = 'report.pdf') {
  const wrapper = document.createElement('div');
  wrapper.dir = 'rtl';
  wrapper.lang = 'ar';
  wrapper.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;background:#fff;color:#111;padding:20px;box-sizing:border-box;';
  wrapper.innerHTML = `<style>${REPORT_STYLES}</style>${bodyHtml}`;
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}
