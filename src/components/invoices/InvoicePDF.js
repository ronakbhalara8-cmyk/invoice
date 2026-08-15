import {jsPDF} from 'jspdf';

const sanitizeText = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/[^\p{L}\p{N}\s\-.,/@():#_]/gu, '')
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

    const doc = new jsPDF({unit: 'pt', format: 'a4'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const company = invoice.company_info || {};
    const billing = invoice.billing_to || {};
    const shipping = invoice.shipping_to || {};
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const invoiceNumber = sanitizeText(invoice.invoice_number || 'INV-0000');
    const invoiceDate = new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB');
    const subtotalValue = Number(invoice.subtotal || 0);
    const gstRateValue = Number(invoice.gst_rate || 0);
    const grandTotalValue = Number(invoice.grand_total || 0);

    // Page background
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Main white card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(30, 30, 540, 780, 12, 12, 'F');
    doc.setDrawColor(200, 208, 218);
    doc.setLineWidth(1);
    doc.roundedRect(30, 30, 540, 780, 12, 12, 'S');

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
    doc.text('INVOICE', 492, currentY + 27, {align: 'center'});

    // Invoice details - Right side
    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Invoice', 430, currentY + 62);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(invoiceNumber), 555, currentY + 62, {align: 'right'});

    doc.setTextColor(80, 90, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Date', 430, currentY + 80);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizeText(invoiceDate), 555, currentY + 80, {align: 'right'});

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

    // Table header background
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(45, currentY, 510, 28, 4, 4, 'F');

    // Table header text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    // Column positions
    const col1 = 58;    // # 
    const col2 = 95;    // Item & Description
    const col3 = 340;   // Qty
    const col4 = 430;   // Rate
    const col5 = 520;   // Amount

    doc.text('#', col1, currentY + 19);
    doc.text('Item & Description', col2, currentY + 19);
    doc.text('Qty', col3, currentY + 19);
    doc.text('Rate', col4, currentY + 19, {align: 'right'});
    doc.text('Amount', col5, currentY + 19, {align: 'right'});

    // Table rows
    let rowY = currentY + 32;
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    items.forEach((item, index) => {
        const name = sanitizeText(item.name || 'Item');
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const amount = qty * rate;

        // Calculate row height based on item name
        const nameLines = splitLines(doc, name, 230);
        const visibleName = nameLines.slice(0, 2);

        const lineHeight = 10;
        const textHeight = visibleName.length * lineHeight;

        // Minimum row height
        const rowHeight = Math.max(32, textHeight + 14);

        // Row background - alternate
        if (index % 2 === 0) {
            doc.setFillColor(248, 249, 251);
            doc.rect(45, rowY, 510, rowHeight, 'F');
        }

        // Exact vertical center of the row
        const centerY = rowY + rowHeight / 2 + 3;

        // # - vertically centered
        doc.text(
            String(index + 1),
            col1,
            centerY
        );

        // ==========================================
        // Item & Description - vertically centered
        // ==========================================

        if (visibleName.length === 1) {
            // Single line item
            doc.text(
                visibleName[0],
                col2,
                centerY
            );
        } else {
            // Multiple lines - center entire text block vertically
            const totalTextHeight = (visibleName.length - 1) * lineHeight;

            const nameStartY =
                centerY - totalTextHeight / 2;

            visibleName.forEach((line, lineIndex) => {
                doc.text(
                    line,
                    col2,
                    nameStartY + lineIndex * lineHeight
                );
            });
        }

        // Qty - vertically centered
        doc.text(
            String(qty),
            col3,
            centerY
        );

        // Rate - vertically centered + right aligned
        doc.text(
            formatAmount(rate),
            col4,
            centerY,
            {
                align: 'right',
            }
        );

        // Amount - vertically centered + right aligned
        doc.text(
            formatAmount(amount),
            col5,
            centerY,
            {
                align: 'right',
            }
        );

        // Row divider
        doc.setDrawColor(218, 226, 234);
        doc.line(
            45,
            rowY + rowHeight,
            555,
            rowY + rowHeight
        );

        // Next row
        rowY += rowHeight + 2;
    });

    // ===== SUMMARY SECTION =====
    const summaryY = Math.max(rowY + 35, 540);

    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(355, summaryY, 200, 100, 6, 6, 'F');
    doc.setDrawColor(218, 226, 234);
    doc.roundedRect(355, summaryY, 200, 100, 6, 6, 'S');

    // Summary content
    let sumY = summaryY + 18;

    // Sub Total
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 90, 105);
    doc.text('Sub Total', 370, sumY);
    doc.setTextColor(17, 24, 39);
    doc.text(formatAmount(subtotalValue), 540, sumY, {align: 'right'});
    sumY += 24;

    // Tax
    doc.setTextColor(80, 90, 105);
    doc.text(`Tax (${gstRateValue}%)`, 370, sumY);
    const taxAmount = (subtotalValue * gstRateValue) / 100;
    doc.setTextColor(17, 24, 39);
    doc.text(formatAmount(taxAmount), 540, sumY, {align: 'right'});
    sumY += 24;

    // Divider line
    doc.setDrawColor(218, 226, 234);
    doc.line(370, sumY, 540, sumY);
    sumY += 18;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Total', 370, sumY);
    doc.text(formatAmount(grandTotalValue), 540, sumY, {align: 'right'});

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