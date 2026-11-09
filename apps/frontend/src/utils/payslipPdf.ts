export interface PayslipEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  phone?: string | null;
  joiningDate?: string | null;
  department?: { name: string } | null;
  designation?: { title: string } | null;
  branch?: { name: string; city?: string | null } | null;
}

export interface PayslipOrg {
  name: string;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  currency?: string | null;
}

export interface PayslipExpense {
  id: string;
  title: string;
  category: string;
  amount: number | string;
  currency: string;
  expenseDate: string;
}

export interface PayslipData {
  id: string;
  monthDays: number;
  payableDays: number | string;
  lopDays: number | string;
  basicSalary: number | string;
  hra: number | string;
  specialAllowance: number | string;
  conveyance: number | string;
  medicalAllowance: number | string;
  reimbursements: number | string;
  grossSalary: number | string;
  pfDeduction: number | string;
  professionalTax: number | string;
  tdsDeduction: number | string;
  lopDeduction: number | string;
  totalDeductions: number | string;
  netSalary: number | string;
  isPaid: boolean;
  paymentMode?: string | null;
  paymentRef?: string | null;
  paidAt?: string | null;
  payrollRun: {
    month: number;
    year: number;
    status: string;
    disbursedAt?: string | null;
    organization?: PayslipOrg | null;
  };
  employee: PayslipEmployee;
  expenseClaims?: PayslipExpense[];
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function numberToIndianWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '',
    'One ',
    'Two ',
    'Three ',
    'Four ',
    'Five ',
    'Six ',
    'Seven ',
    'Eight ',
    'Nine ',
    'Ten ',
    'Eleven ',
    'Twelve ',
    'Thirteen ',
    'Fourteen ',
    'Fifteen ',
    'Sixteen ',
    'Seventeen ',
    'Eighteen ',
    'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';

  let str = '';
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str +=
    Number(n[4]) !== 0
      ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred '
      : '';
  str +=
    Number(n[5]) !== 0
      ? (str !== '' ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])])
      : '';

  return str.trim() + ' Rupees Only';
}

export function generatePayslipHtml(payslip: PayslipData): string {
  const org = payslip.payrollRun.organization || {
    name: 'CodeOrbit Technologies',
    legalName: 'CodeOrbit Technologies Pvt Ltd',
    email: 'payroll@codeorbit.io',
    phone: '+91 98765 43210',
    city: 'Mohali',
    state: 'Punjab',
    country: 'India',
    currency: 'INR',
  };

  const monthName = MONTH_NAMES[payslip.payrollRun.month - 1] || `Month ${payslip.payrollRun.month}`;
  const periodText = `${monthName.toUpperCase()} ${payslip.payrollRun.year}`;
  const currencySymbol = org.currency === 'USD' ? '$' : '₹';

  const basic = Number(payslip.basicSalary || 0);
  const hra = Number(payslip.hra || 0);
  const special = Number(payslip.specialAllowance || 0);
  const conveyance = Number(payslip.conveyance || 0);
  const medical = Number(payslip.medicalAllowance || 0);
  const reimbursements = Number(payslip.reimbursements || 0);
  const gross = Number(payslip.grossSalary || 0) + reimbursements;

  const pf = Number(payslip.pfDeduction || 0);
  const pt = Number(payslip.professionalTax || 0);
  const tds = Number(payslip.tdsDeduction || 0);
  const lop = Number(payslip.lopDeduction || 0);
  const deductions = Number(payslip.totalDeductions || 0);
  const net = Number(payslip.netSalary || 0);

  const amountInWords = numberToIndianWords(Math.round(net));

  const expensesRows =
    payslip.expenseClaims && payslip.expenseClaims.length > 0
      ? `
      <div style="margin-top: 24px;">
        <h4 style="font-size: 13px; font-weight: 700; text-transform: uppercase; color: #1e293b; letter-spacing: 0.05em; margin-bottom: 8px;">Reimbursed Expense Claims</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="text-align: left; padding: 6px 10px; color: #475569;">Title</th>
              <th style="text-align: left; padding: 6px 10px; color: #475569;">Category</th>
              <th style="text-align: left; padding: 6px 10px; color: #475569;">Date</th>
              <th style="text-align: right; padding: 6px 10px; color: #475569;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payslip.expenseClaims
              .map(
                (c) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 10px; font-weight: 500; color: #0f172a;">${c.title}</td>
                <td style="padding: 6px 10px; color: #64748b;">${c.category}</td>
                <td style="padding: 6px 10px; color: #64748b;">${new Date(c.expenseDate).toLocaleDateString()}</td>
                <td style="padding: 6px 10px; text-align: right; font-weight: 600; color: #059669;">${currencySymbol} ${Number(c.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Payslip - ${payslip.employee.employeeCode} - ${periodText}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm 16mm 14mm 16mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 20px;
          background: #ffffff;
          line-height: 1.45;
        }
        .payslip-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 28px 32px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .logo-section h1 {
          margin: 0 0 4px 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .logo-section p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }
        .payslip-badge {
          text-align: right;
        }
        .payslip-badge h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .payslip-badge span {
          display: inline-block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          background-color: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px 24px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 14px 18px;
          font-size: 12.5px;
          margin-bottom: 22px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed #e2e8f0;
          padding-bottom: 4px;
        }
        .meta-row:last-child {
          border-bottom: none;
        }
        .meta-label {
          color: #64748b;
          font-weight: 500;
        }
        .meta-val {
          color: #0f172a;
          font-weight: 600;
        }
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12.5px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
        }
        .breakdown-table th {
          background-color: #f1f5f9;
          padding: 8px 12px;
          font-weight: 700;
          color: #1e293b;
          text-transform: uppercase;
          font-size: 11.5px;
          letter-spacing: 0.04em;
        }
        .breakdown-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
        }
        .breakdown-table tr:hover td {
          background-color: #fcfcfc;
        }
        .col-left-border {
          border-left: 1px solid #e2e8f0;
        }
        .net-pay-banner {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #86efac;
          border-radius: 8px;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 22px;
        }
        .net-title {
          font-size: 13px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .net-words {
          font-size: 11.5px;
          color: #15803d;
          margin-top: 2px;
          font-weight: 500;
        }
        .net-amount {
          font-size: 24px;
          font-weight: 800;
          color: #14532d;
        }
        .footer-note {
          border-top: 1px solid #e2e8f0;
          padding-top: 14px;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          line-height: 1.5;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 30px;
          padding-top: 20px;
        }
        .stamp-box {
          border: 2px dashed #94a3b8;
          border-radius: 6px;
          padding: 12px 18px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          display: inline-block;
        }
        @media print {
          body {
            padding: 0;
            background: #ffffff;
          }
          .payslip-container {
            border: none;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="payslip-container">
        <!-- Action Bar (hidden on print) -->
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="background-color: #0284c7; color: white; border: none; padding: 8px 16px; font-weight: 600; font-size: 13px; border-radius: 6px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <h1>${org.name}</h1>
            <p>${org.legalName || org.name} &bull; ${org.city || ''}, ${org.country || 'India'}</p>
            <p style="font-size: 11px; margin-top: 2px;">Email: ${org.email || 'support@codeorbit.io'} | Phone: ${org.phone || '+91 98765 43210'}</p>
          </div>
          <div class="payslip-badge">
            <h2>Salary Payslip</h2>
            <span>Period: ${periodText}</span>
          </div>
        </div>

        <!-- Employee & Run Metadata Grid -->
        <div class="meta-grid">
          <div>
            <div class="meta-row">
              <span class="meta-label">Employee ID:</span>
              <span class="meta-val">${payslip.employee.employeeCode}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Employee Name:</span>
              <span class="meta-val">${payslip.employee.firstName} ${payslip.employee.lastName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Department:</span>
              <span class="meta-val">${payslip.employee.department?.name || 'General'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Designation:</span>
              <span class="meta-val">${payslip.employee.designation?.title || 'Staff'}</span>
            </div>
          </div>
          <div>
            <div class="meta-row">
              <span class="meta-label">Calendar Days:</span>
              <span class="meta-val">${payslip.monthDays} Days</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Payable Days:</span>
              <span class="meta-val">${payslip.payableDays} Days</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Loss of Pay (LOP):</span>
              <span class="meta-val">${payslip.lopDays} Days</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Payment Mode:</span>
              <span class="meta-val">${payslip.paymentMode || 'Direct Bank Transfer'}</span>
            </div>
          </div>
        </div>

        <!-- Salary Earnings & Deductions Breakdown -->
        <table class="breakdown-table">
          <thead>
            <tr>
              <th style="width: 32%;">Earnings</th>
              <th style="width: 18%; text-align: right;">Amount (${currencySymbol})</th>
              <th style="width: 32%;" class="col-left-border">Deductions</th>
              <th style="width: 18%; text-align: right;">Amount (${currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td style="text-align: right; font-weight: 600;">${basic.toFixed(2)}</td>
              <td class="col-left-border">Provident Fund (PF)</td>
              <td style="text-align: right; font-weight: 600;">${pf.toFixed(2)}</td>
            </tr>
            <tr>
              <td>House Rent Allowance (HRA)</td>
              <td style="text-align: right; font-weight: 600;">${hra.toFixed(2)}</td>
              <td class="col-left-border">Professional Tax (PT)</td>
              <td style="text-align: right; font-weight: 600;">${pt.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td style="text-align: right; font-weight: 600;">${special.toFixed(2)}</td>
              <td class="col-left-border">Income Tax (TDS)</td>
              <td style="text-align: right; font-weight: 600;">${tds.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Conveyance Allowance</td>
              <td style="text-align: right; font-weight: 600;">${conveyance.toFixed(2)}</td>
              <td class="col-left-border">Loss of Pay (LOP) Deduction</td>
              <td style="text-align: right; font-weight: 600;">${lop.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Medical Allowance</td>
              <td style="text-align: right; font-weight: 600;">${medical.toFixed(2)}</td>
              <td class="col-left-border">-</td>
              <td style="text-align: right; font-weight: 600;">-</td>
            </tr>
            <tr>
              <td style="color: #059669; font-weight: 600;">Expense Reimbursements</td>
              <td style="text-align: right; font-weight: 600; color: #059669;">${reimbursements.toFixed(2)}</td>
              <td class="col-left-border">-</td>
              <td style="text-align: right; font-weight: 600;">-</td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: 700; border-top: 2px solid #cbd5e1;">
              <td style="color: #0f172a;">Total Gross Earnings</td>
              <td style="text-align: right; color: #0f172a;">${currencySymbol} ${gross.toFixed(2)}</td>
              <td class="col-left-border" style="color: #0f172a;">Total Deductions</td>
              <td style="text-align: right; color: #e11d48;">${currencySymbol} ${deductions.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Reimbursed claims table if present -->
        ${expensesRows}

        <!-- Net Pay Highlight Banner -->
        <div class="net-pay-banner">
          <div>
            <div class="net-title">Net Take-Home Salary</div>
            <div class="net-words">${amountInWords}</div>
          </div>
          <div class="net-amount">
            ${currencySymbol} ${net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <!-- Signature & Stamp -->
        <div class="signature-section">
          <div>
            <div class="stamp-box">
              ✓ CODEORBIT VERIFIED PAYROLL<br>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">DISBURSED & AUDITED</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="width: 180px; border-bottom: 1px solid #475569; margin-bottom: 6px;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">Authorized Signatory</div>
            <div style="font-size: 10.5px; color: #64748b;">CodeOrbit Finance & HR Operations</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-note" style="margin-top: 24px;">
          This is a computer-generated document and requires no physical signature under the Information Technology Act. Confidential document intended solely for ${payslip.employee.firstName} ${payslip.employee.lastName}.
        </div>
      </div>
    </body>
    </html>
  `;
}

export function openPayslipPrintWindow(payslip: PayslipData): void {
  const htmlContent = generatePayslipHtml(payslip);
  const printWindow = window.open('', '_blank', 'width=900,height=800,scrollbars=yes,resizable=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  } else {
    // If popups are blocked, create a temporary iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
  }
}
