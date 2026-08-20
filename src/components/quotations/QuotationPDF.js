import { jsPDF } from 'jspdf';

const safe = (value) => String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
const number = (value) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
const lines = (doc, value, width) => doc.splitTextToSize(safe(value), width);

const drawPageFrame = (doc, pageWidth, pageHeight) => {
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(30, 30, pageWidth - 60, pageHeight - 60, 12, 12, 'F');
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(30, 30, pageWidth - 60, pageHeight - 60, 12, 12, 'S');
};

const drawItemsHeader = (doc, y, pageWidth, left, right) => {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(left, y, pageWidth - 88, 28, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 57, y + 18);
    doc.text('Product & Description', 90, y + 18);
    doc.text('Qty', 280, y + 18);
    doc.text('Rate', 370, y + 18, { align: 'right' });
    doc.text('Disc.', 430, y + 18, { align: 'right' });
    doc.text('Amount', 510, y + 18, { align: 'right' });
    return y + 30;
};

export function downloadQuotationPdf(quotation) {
    if (!quotation) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const company = quotation.company_info || {};
    const customer = quotation.customer_info || {};
    const items = Array.isArray(quotation.items) ? quotation.items : [];
    const left = 44;
    const right = pageWidth - 44;

    drawPageFrame(doc, pageWidth, pageHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.text(safe(company.company_name || 'Company Name'), left, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text(safe(company.company_address || ''), left, 90);
    doc.text(`GST: ${safe(company.company_gst_number || 'N/A')}`, left, 106);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('QUOTATION', right, 72, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Quotation', 410, 94);
    doc.text('Date', 410, 110);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(safe(quotation.quotation_number || 'QUO-0000'), right, 94, { align: 'right' });
    doc.text(new Date(quotation.created_at || Date.now()).toLocaleDateString('en-GB'), right, 110, { align: 'right' });

    doc.setDrawColor(218, 226, 234);
    doc.line(left, 130, right, 130);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Quotation For', left, 158);
    doc.setFillColor(250, 251, 253);
    doc.roundedRect(left, 170, pageWidth - 88, 92, 6, 6, 'F');
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(left, 170, pageWidth - 88, 92, 6, 6, 'S');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(safe(customer.customer_name || quotation.customer_name || 'Customer'), left + 14, 192);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text(safe(customer.company_name || ''), left + 14, 210);
    doc.text(safe(customer.address || ''), left + 14, 226);
    doc.text([customer.email, customer.phone].filter(Boolean).map(safe).join('  |  '), left + 14, 244);

    let y = 294;
    y = drawItemsHeader(doc, y, pageWidth, left, right);
    items.forEach((item, index) => {
        const nameLines = lines(doc, item.name || 'Product', 180);
        const lineHeight = 11;
        const rowHeight = Math.max(30, nameLines.length * lineHeight + 14);

        if (y + rowHeight > pageHeight - 170) {
            doc.addPage();
            drawPageFrame(doc, pageWidth, pageHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(17, 24, 39);
            doc.text('Quotation - Product Details (continued)', left, 62);
            y = drawItemsHeader(doc, 82, pageWidth, left, right);
        }

        const contentCenterY = y + rowHeight / 2;
        const nameStartY = contentCenterY - ((nameLines.length - 1) * lineHeight) / 2 + 3;

        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 251);
            doc.rect(left, y, pageWidth - 88, rowHeight, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(17, 24, 39);
        doc.text(String(index + 1), 57, contentCenterY + 3);
        nameLines.forEach((line, lineIndex) => {
            doc.text(line, 90, nameStartY + lineIndex * lineHeight);
        });
        doc.text(String(item.qty || 0), 285, contentCenterY + 3);
        doc.text(number(item.rate), 380, contentCenterY + 3, { align: 'right' });
        doc.text(`${number(item.discount)}%`, 435, contentCenterY + 3, { align: 'right' });
        doc.text(number(item.amount), 515, contentCenterY + 3, { align: 'right' });
        doc.setDrawColor(225, 230, 236);
        doc.line(left, y + rowHeight, right, y + rowHeight);
        y += rowHeight;
    });

    if (y + 175 > pageHeight - 30) {
        doc.addPage();
        drawPageFrame(doc, pageWidth, pageHeight);
        y = 80;
    }

    const summaryY = Math.max(y + 28, 500);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(350, summaryY, 205, 128, 6, 6, 'F');
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(350, summaryY, 205, 128, 6, 6, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text('Subtotal', 366, summaryY + 22);
    doc.text(number(quotation.subtotal), 540, summaryY + 22, { align: 'right' });
    doc.text('Discount', 366, summaryY + 42);
    doc.text(`- ${number(quotation.discount_amount)}`, 540, summaryY + 42, { align: 'right' });
    doc.text(`GST (${number(quotation.gst_rate)}%)`, 366, summaryY + 62);
    doc.text(number(quotation.tax_amount), 540, summaryY + 62, { align: 'right' });
    doc.setDrawColor(200, 208, 218);
    doc.line(366, summaryY + 76, 540, summaryY + 76);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Total', 366, summaryY + 101);
    doc.text(number(quotation.grand_total), 540, summaryY + 101, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Notes', left, summaryY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text(lines(doc, quotation.terms || 'Thank you for your business.', 270), left, summaryY + 38);
    doc.setFontSize(8);
    doc.text('This quotation is subject to the terms mentioned above.', left, pageHeight - 62);
    doc.save(`${safe(quotation.quotation_number || 'quotation')}.pdf`);
}
