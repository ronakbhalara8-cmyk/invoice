import { jsPDF } from 'jspdf';

const sanitizeText = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/[^\p{L}\p{N}\s\n\r\-.,/@():#_]/gu, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
};

const formatNumeric = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

const formatAmount = (value) => formatNumeric(value);

const splitLines = (doc, text, maxWidth) => doc.splitTextToSize(text || '', maxWidth);

function addTextBlock(doc, x, y, lines, lineHeight = 14) {
    const safeLines = Array.isArray(lines) ? lines : [lines];
    safeLines.forEach((line, index) => {
        doc.text(sanitizeText(line), x, y + index * lineHeight);
    });
    return y + safeLines.length * lineHeight;
}

export function downloadInvoicePdf(invoice) {
    if (!invoice) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const company = invoice.company_info || {};
    const billing = invoice.billing_to || {};
    const shipping = invoice.shipping_to || {};
    const currency = invoice.currency || 'INR';
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const customer_name = sanitizeText(invoice.customer_name || billing.customer_name || shipping.customer_name || 'Customer');
    const invoiceNumber = sanitizeText(invoice.invoice_number || 'INV-0000');
    const invoiceDate = new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB');
    const rawSubtotalValue = items.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        return sum + (qty * rate);
    }, 0);
    const discountAmountValue = Number(invoice.discount_amount || items.reduce((sum, item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const discount = Number(item.discount || 0);
        return sum + ((qty * rate) * (discount / 100));
    }, 0));
    const subtotalValue = Number(invoice.subtotal || (rawSubtotalValue - discountAmountValue));
    const gstRateValue = Number(invoice.gst_rate || 0);
    const taxAmountValue = Number(invoice.tax_amount || ((subtotalValue * gstRateValue) / 100));
    const grandTotalValue = Number(invoice.grand_total || (subtotalValue + taxAmountValue));

    const drawPageFrame = () => {
        doc.setFillColor(245, 247, 250);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(30, 30, 540, 780, 12, 12, 'F');
        doc.setDrawColor(200, 208, 218);
        doc.setLineWidth(1);
        doc.roundedRect(30, 30, 540, 780, 12, 12, 'S');
    };

    const drawTableHeader = (headerY) => {
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(45, headerY, 510, 28, 4, 4, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('#', col1, headerY + 19);
        doc.text('Item & Description', col2, headerY + 19);
        doc.text('Qty', col3, headerY + 19);
        doc.text('Rate', col4, headerY + 19, { align: 'right' });
        doc.text('Disc.', col5, headerY + 19, { align: 'right' });
        doc.text('Amount', col7, headerY + 19, { align: 'right' });
    };

    drawPageFrame();

    // ===== HEADER SECTION =====
    let currentY = 55;

    // Company section - Left side
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(45, currentY, 260, 85, 6, 6, 'F');
    doc.setDrawColor(200, 208, 218);
    doc.roundedRect(45, currentY, 260, 85, 6, 6, 'S');

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(16);
    doc.text(sanitizeText(company.company_name || 'Company Name'), 58, currentY + 25);

    // Company Address
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 90, 105);
    doc.setFontSize(9);
    const addrLines = splitLines(doc, sanitizeText(company.company_address || 'Company Address'), 220);
    addTextBlock(doc, 58, currentY + 43, addrLines, 12);

    // GST
    const gstY = currentY + 43 + (addrLines.length * 12) + 4;
    doc.text(`GST: ${sanitizeText(company.company_gst_number || 'N/A')}`, 58, gstY);

    // INVOICE box - Right side
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(430, currentY, 125, 40, 4, 4, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('INVOICE', 492, currentY + 27, { align: 'center' });

    // Invoice details - Right side
    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Invoice', 400, currentY + 62);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(invoiceNumber), 555, currentY + 62, { align: 'right' });

    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Date', 400, currentY + 80);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(invoiceDate), 555, currentY + 80, { align: 'right' });

    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Customer Name', 400, currentY + 98);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(customer_name), 555, currentY + 98, { align: 'right' });

    // Divider
    currentY = currentY + 85 + 30;
    doc.setDrawColor(218, 226, 234);
    doc.line(45, currentY, 555, currentY);

    // ===== BILL TO / SHIP TO SECTION =====
    currentY += 28;

    // Labels
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text('Bill To', 58, currentY);
    doc.text('Ship To', 330, currentY);

    // Bill To box
    currentY += 12;
    doc.setFillColor(250, 251, 253);
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(45, currentY, 240, 95, 6, 6, 'S');
    doc.roundedRect(45, currentY, 240, 95, 6, 6, 'F');

    // Ship To box
    doc.roundedRect(315, currentY, 240, 95, 6, 6, 'S');
    doc.roundedRect(315, currentY, 240, 95, 6, 6, 'F');

    // Bill To content
    let billY = currentY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    const billName = sanitizeText(billing.customer_name || 'Customer Name');
    doc.text(billName, 58, billY);
    billY += 15;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 90, 105);
    const billCompany = sanitizeText(billing.company_name || '');
    if (billCompany) {
        doc.text(billCompany, 58, billY);
        billY += 15;
    }

    const billAddress = sanitizeText(billing.address || '');
    const billAddrLines = splitLines(doc, billAddress, 200);
    addTextBlock(doc, 58, billY, billAddrLines, 12);
    billY += billAddrLines.length * 12 + 4;

    const billEmail = sanitizeText(billing.email || '');
    if (billEmail) {
        doc.text(billEmail, 58, billY);
        billY += 15;
    }

    const billPhone = sanitizeText(billing.phone || '');
    if (billPhone) {
        doc.text(billPhone, 58, billY);
    }

    // Ship To content
    let shipY = currentY + 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    const shipName = sanitizeText(shipping.customer_name || billing.customer_name || 'Customer Name');
    doc.text(shipName, 328, shipY);
    shipY += 15;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 90, 105);
    const shipCompany = sanitizeText(shipping.company_name || billing.company_name || '');
    if (shipCompany) {
        doc.text(shipCompany, 328, shipY);
        shipY += 15;
    }

    const shipAddress = sanitizeText(shipping.address || billing.address || '');
    const shipAddrLines = splitLines(doc, shipAddress, 200);
    addTextBlock(doc, 328, shipY, shipAddrLines, 12);
    shipY += shipAddrLines.length * 12 + 4;

    const shipEmail = sanitizeText(shipping.email || billing.email || '');
    if (shipEmail) {
        doc.text(shipEmail, 328, shipY);
        shipY += 15;
    }

    const shipPhone = sanitizeText(shipping.phone || billing.phone || '');
    if (shipPhone) {
        doc.text(shipPhone, 328, shipY);
    }

    // ===== ITEMS TABLE =====
    currentY = currentY + 95 + 30;

    // Column positions
    const col1 = 58;
    const col2 = 95;
    const col3 = 270;
    const col4 = 370;
    const col5 = 440;
    const col6 = 460;
    const col7 = 530;

    drawTableHeader(currentY);

    // Table rows
    let rowY = currentY + 32;
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    items.forEach((item, index) => {
        const name = sanitizeText(item.name || 'Item');
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const discount = Number(item.discount || 0);
        const amount = qty * rate * (1 - (discount / 100));

        const rawNameLines = name
            .split(/\n+/)
            .flatMap((part) => splitLines(doc, part || ' ', 150));
        const visibleName = rawNameLines.slice(0, 4);

        const lineHeight = 10;
        const textHeight = visibleName.length * lineHeight;
        const rowHeight = Math.max(32, textHeight + 14);

        if (rowY + rowHeight > pageHeight - 90) {
            doc.addPage();
            drawPageFrame();
            drawTableHeader(55);
            rowY = 87;
            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }

        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 251);
            doc.rect(45, rowY, 510, rowHeight, 'F');
        }

        const centerY = rowY + rowHeight / 2 + 3;

        doc.text(String(index + 1), col1, centerY);

        if (visibleName.length === 1) {
            doc.text(visibleName[0], col2, centerY);
        } else {
            const totalTextHeight = (visibleName.length - 1) * lineHeight;
            const nameStartY = centerY - totalTextHeight / 2;
            visibleName.forEach((line, lineIndex) => {
                doc.text(line, col2, nameStartY + lineIndex * lineHeight);
            });
        }

        doc.text(String(qty), col3, centerY);
        doc.text(formatAmount(rate), col4, centerY, { align: 'right' });
        doc.text(`${discount.toFixed(2)}%`, col5, centerY, { align: 'right' });
        doc.text(formatAmount(amount), col7, centerY, { align: 'right' });

        doc.setDrawColor(218, 226, 234);
        doc.line(45, rowY + rowHeight, 555, rowY + rowHeight);

        rowY += rowHeight + 2;
    });

    // ===== SUMMARY SECTION =====
    let summaryY = Math.max(rowY + 35, 540);
    if (summaryY + 260 > pageHeight - 30) {
        doc.addPage();
        drawPageFrame();
        summaryY = 55;
    }

    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(355, summaryY, 200, 120, 6, 6, 'F');
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(355, summaryY, 200, 120, 6, 6, 'S');

    // Summary content
    let sumY = summaryY + 18;

    // Sub Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text('Sub Total', 370, sumY);
    doc.setTextColor(17, 24, 39);
    doc.text(currency + ' ' + formatAmount(subtotalValue), 540, sumY, { align: 'right' });
    sumY += 20;

    // Discount
    doc.setTextColor(80, 90, 105);
    doc.text('Discount', 370, sumY);
    doc.setTextColor(17, 24, 39);
    doc.text(currency + ' ' + formatAmount(discountAmountValue), 540, sumY, { align: 'right' });
    sumY += 20;

    // GST
    doc.setTextColor(80, 90, 105);
    doc.text(`GST (${gstRateValue}%)`, 370, sumY);
    doc.setTextColor(17, 24, 39);
    doc.text(currency + ' ' + formatAmount(taxAmountValue), 540, sumY, { align: 'right' });
    sumY += 20;

    // Divider line
    doc.setDrawColor(218, 226, 234);
    doc.line(370, sumY, 540, sumY);
    sumY += 16;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Total', 370, sumY);
    doc.text(currency + ' ' + formatAmount(grandTotalValue), 540, sumY, { align: 'right' });

    // ===== FOOTER SECTION =====
    const footerY = Math.max(summaryY + 130, 610);

    // Footer divider
    doc.setDrawColor(218, 226, 234);
    doc.line(45, footerY, 555, footerY);

    // Thank you message
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.text('Thanks for your business!', 58, footerY + 28);

    // Terms & Conditions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text('Terms & Conditions', 58, footerY + 52);

    const termsText = sanitizeText(invoice.terms || 'Full payment is due upon receipt of this invoice. Late payments may incur additional charges.');
    const wrappedTerms = splitLines(doc, termsText, 450);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 110, 125);
    addTextBlock(doc, 58, footerY + 68, wrappedTerms.slice(0, 3), 11);

    // Save PDF
    doc.save(`${invoiceNumber || 'invoice'}.pdf`);
}