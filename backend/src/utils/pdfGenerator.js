const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const CERT_DIR = path.join(__dirname, '../../uploads/certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

/**
 * Generate a professional certificate PDF.
 * Returns the relative path: certificates/<certificateId>.pdf
 */
const generateCertificatePDF = async (certData, settings) => {
  const {
    certificateId,
    certificateNumber,
    studentName,
    courseName,
    completionDate,
    verificationUrl,
  } = certData;

  const {
    instituteName = 'LMS Platform',
    certHeaderText = 'Certificate of Completion',
    certSubHeaderText = 'This is to certify that',
    certBodyText = 'has successfully completed the course',
    certFooterText = 'Issued with pride by',
    certSignatoryName = 'Director',
    certSignatoryTitle = 'Institute Director',
    certBorderColor = '#4f46e5',
    certAccentColor = '#7c3aed',
    logo,
    certSignature,
    certBackground,
  } = settings;

  const filename = `${certificateId}.pdf`;
  const outputPath = path.join(CERT_DIR, filename);

  // A4 landscape
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
  });

  const W = doc.page.width;   // 841.89
  const H = doc.page.height;  // 595.28

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // ── Background ──────────────────────────────────────
  if (certBackground) {
    const bgPath = path.join(__dirname, '../../uploads', certBackground);
    if (fs.existsSync(bgPath)) {
      doc.image(bgPath, 0, 0, { width: W, height: H });
    }
  } else {
    // Default gradient-like background using rectangles
    doc.rect(0, 0, W, H).fill('#fafaf9');
    doc.rect(0, 0, W, 6).fill(certBorderColor);
    doc.rect(0, H - 6, W, 6).fill(certBorderColor);
    doc.rect(0, 0, 6, H).fill(certBorderColor);
    doc.rect(W - 6, 0, 6, H).fill(certBorderColor);

    // Inner border
    doc.rect(20, 20, W - 40, H - 40)
      .lineWidth(1.5)
      .strokeColor(certBorderColor)
      .stroke();

    // Decorative corner accents
    const corners = [[20, 20], [W - 20, 20], [20, H - 20], [W - 20, H - 20]];
    corners.forEach(([x, y]) => {
      doc.circle(x, y, 4).fill(certAccentColor);
    });

    // Subtle pattern lines
    doc.opacity(0.04);
    for (let i = 0; i < W; i += 20) {
      doc.moveTo(i, 0).lineTo(i, H).stroke('#000');
    }
    doc.opacity(1);
  }

  // ── Logo ────────────────────────────────────────────
  let logoHeight = 0;
  if (logo) {
    const logoPath = path.join(__dirname, '../../uploads', logo);
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, W / 2 - 40, 50, { width: 80, height: 80, fit: [80, 80] });
        logoHeight = 90;
      } catch {}
    }
  }

  // ── Header text ─────────────────────────────────────
  const topY = 50 + logoHeight;

  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor(certBorderColor)
    .text(certHeaderText, 0, topY, { align: 'center', width: W });

  // Decorative line under header
  const lineY = topY + 44;
  doc
    .moveTo(W / 2 - 140, lineY)
    .lineTo(W / 2 + 140, lineY)
    .lineWidth(1.5)
    .strokeColor(certAccentColor)
    .stroke();

  // ── Sub-header ───────────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(13)
    .fillColor('#6b7280')
    .text(certSubHeaderText, 0, lineY + 20, { align: 'center', width: W });

  // ── Student Name ─────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(36)
    .fillColor('#111827')
    .text(studentName, 0, lineY + 50, { align: 'center', width: W });

  // Name underline
  const nameY = lineY + 100;
  doc
    .moveTo(W / 2 - 160, nameY)
    .lineTo(W / 2 + 160, nameY)
    .lineWidth(1)
    .strokeColor('#d1d5db')
    .stroke();

  // ── Body text ────────────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(13)
    .fillColor('#6b7280')
    .text(certBodyText, 0, nameY + 16, { align: 'center', width: W });

  // ── Course Name ──────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(certBorderColor)
    .text(`"${courseName}"`, 0, nameY + 38, { align: 'center', width: W });

  // ── Completion Date ───────────────────────────────────
  const dateStr = new Date(completionDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#9ca3af')
    .text(`Completed on ${dateStr}`, 0, nameY + 76, { align: 'center', width: W });

  // ── Bottom section ───────────────────────────────────
  const bottomY = H - 110;

  // Certificate number
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#9ca3af')
    .text(`Certificate No: ${certificateNumber}`, 60, bottomY, { align: 'left' });

  // Signature section
  const sigX = W / 2 - 80;

  if (certSignature) {
    const sigPath = path.join(__dirname, '../../uploads', certSignature);
    if (fs.existsSync(sigPath)) {
      try {
        doc.image(sigPath, sigX, bottomY - 30, { width: 120, height: 40, fit: [120, 40] });
      } catch {}
    }
  } else {
    // Signature placeholder line
    doc
      .moveTo(sigX, bottomY + 10)
      .lineTo(sigX + 130, bottomY + 10)
      .lineWidth(1)
      .strokeColor('#d1d5db')
      .stroke();
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#374151')
    .text(certSignatoryName, sigX - 20, bottomY + 16, { width: 170, align: 'center' });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#6b7280')
    .text(certSignatoryTitle, sigX - 20, bottomY + 30, { width: 170, align: 'center' });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#9ca3af')
    .text(certFooterText, sigX - 20, bottomY + 46, { width: 170, align: 'center' });

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(certBorderColor)
    .text(instituteName, sigX - 20, bottomY + 60, { width: 170, align: 'center' });

  // ── QR Code ──────────────────────────────────────────
  try {
    const qrBuffer = await QRCode.toBuffer(verificationUrl, {
      type: 'png',
      width: 80,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
    });
    doc.image(qrBuffer, W - 110, H - 110, { width: 70, height: 70 });
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#9ca3af')
      .text('Scan to verify', W - 115, H - 38, { width: 80, align: 'center' });
  } catch (err) {
    logger.warn(`QR code generation failed: ${err.message}`);
  }

  // ── Verification URL ──────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#9ca3af')
    .text(`Verify at: ${verificationUrl}`, 60, H - 38, { align: 'left' });

  doc.end();

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  logger.info(`Certificate PDF generated: ${filename}`);
  return `certificates/${filename}`;
};

/**
 * Generate a simple table-based report PDF.
 * @param {object} options - { title, headers, rows, filename }
 * @returns {Buffer}
 */
const generateReportPDF = async ({ title, subtitle, headers, rows, filename }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#1e293b')
      .text(title, { align: 'center' });

    if (subtitle) {
      doc.font('Helvetica').fontSize(10).fillColor('#64748b')
        .text(subtitle, { align: 'center' });
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#94a3b8')
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(1.5);

    // Table
    const colWidth = (doc.page.width - 80) / headers.length;
    const rowH = 24;
    let y = doc.y;

    // Header row
    doc.rect(40, y, doc.page.width - 80, rowH).fill('#4f46e5');
    headers.forEach((h, i) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
        .text(h, 40 + i * colWidth + 4, y + 7, { width: colWidth - 8, lineBreak: false });
    });

    y += rowH;
    rows.forEach((row, ridx) => {
      if (y + rowH > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      const bg = ridx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(40, y, doc.page.width - 80, rowH).fill(bg);
      doc.rect(40, y, doc.page.width - 80, rowH).lineWidth(0.5).strokeColor('#e2e8f0').stroke();

      row.forEach((cell, ci) => {
        doc.font('Helvetica').fontSize(9).fillColor('#334155')
          .text(String(cell ?? '—'), 40 + ci * colWidth + 4, y + 7, { width: colWidth - 8, lineBreak: false });
      });
      y += rowH;
    });

    doc.end();
  });
};

module.exports = { generateCertificatePDF, generateReportPDF };
