import { jsPDF } from 'jspdf';

const safeText = (value) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
const dateText = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '-';
const statusLabels = {
    UNPAID: 'Unpaid',
    OVERDUE: 'Overdue',
    PAID: 'Paid',
    PARTIALLY_PAID: 'Partially Paid',
    VOID: 'Void',
};
const methodLabels = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    UPI: 'UPI',
    CARD: 'Card',
    CHEQUE: 'Cheque',
    OTHER: 'Other',
};
const amountText = (value, currency = 'INR') => {
    const formattedValue = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
    return `${currency} ${formattedValue}`;
};

export function downloadReceivablePdf(invoice, payments = []) {
    if (!invoice) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const currency = invoice.currency || invoice.company_info?.currency || 'INR';
    const paidPayments = payments.filter((payment) => payment.payment_status === 'ACTIVE');
    const paidAmount = paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const total = Number(invoice.grand_total || 0);
    const balance = Math.max(total - paidAmount, 0);
    let y = 48;

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 842, 'F');
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(32, 32, pageWidth - 64, 778, 12, 12, 'F');
    doc.setDrawColor(220, 226, 234);
    doc.roundedRect(32, 32, pageWidth - 64, 778, 12, 12, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('RECEIVABLE STATEMENT', 52, y + 18);
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment and outstanding balance report', 52, y + 38);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(invoice.invoice_number), pageWidth - 52, y + 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${dateText(new Date())}`, pageWidth - 52, y + 38, { align: 'right' });

    y += 78;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(52, y, pageWidth - 104, 82, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Customer', 68, y + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(invoice.customer_name || 'Customer'), 68, y + 44);
    doc.setTextColor(71, 85, 105);
    doc.text(`Invoice date: ${dateText(invoice.created_at)}`, 68, y + 63);
    doc.text(`Due date: ${dateText(invoice.due_date)}`, 265, y + 63);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Status', pageWidth - 100, y + 25);
    doc.setTextColor(invoice.payment_status === 'OVERDUE' ? 185 : 5, invoice.payment_status === 'OVERDUE' ? 28 : 150, invoice.payment_status === 'OVERDUE' ? 28 : 105);
    doc.text(statusLabels[invoice.payment_status] || safeText(invoice.payment_status || 'Unpaid'), pageWidth - 68, y + 45, { align: 'right' });

    y += 112;
    const summary = [
        ['Invoice total', amountText(total, currency)],
        ['Total paid', amountText(paidAmount, currency)],
        ['Balance due', amountText(balance, currency)],
    ];
    summary.forEach(([label, value], index) => {
        const x = 52 + index * 170;
        doc.setFillColor(index === 2 ? 255 : 248, index === 2 ? 247 : 250, index === 2 ? 237 : 252);
        doc.roundedRect(x, y, 155, 68, 8, 8, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(label, x + 12, y + 23);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(value, x + 12, y + 47);
    });

    y += 105;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Payment history', 52, y);
    y += 14;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(52, y, pageWidth - 104, 28, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Payment number', 64, y + 18);
    doc.text('Date', 180, y + 18);
    doc.text('Method', 270, y + 18);
    doc.text('Reference', 360, y + 18);
    doc.text('Amount', pageWidth - 64, y + 18, { align: 'right' });

    y += 28;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (!paidPayments.length) {
        doc.setTextColor(100, 116, 139);
        doc.text('No payments recorded.', 64, y + 20);
        y += 38;
    } else {
        paidPayments.forEach((payment, index) => {
            if (y > 750) {
                doc.addPage();
                y = 55;
            }
            if (index % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(52, y, pageWidth - 104, 28, 'F');
            }
            doc.setTextColor(30, 41, 59);
            doc.text(safeText(payment.payment_number), 64, y + 18);
            doc.text(dateText(payment.payment_date), 180, y + 18);
            doc.text(methodLabels[payment.payment_method] || safeText(payment.payment_method), 270, y + 18);
            doc.text(safeText(payment.reference_number || '-').slice(0, 22), 360, y + 18);
            doc.text(amountText(payment.amount, currency), pageWidth - 64, y + 18, { align: 'right' });
            y += 28;
        });
    }

    doc.setDrawColor(220, 226, 234);
    doc.line(52, y + 25, pageWidth - 52, y + 25);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('This statement is generated from the payment ledger.', 52, y + 45);
    doc.save(`${safeText(invoice.invoice_number || 'receivable')}-payment.pdf`);
}
