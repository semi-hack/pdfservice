require("dotenv").config();
const express = require("express");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");
const nodemailer = require("nodemailer");
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client.html"));
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Field Coordinates Mapping
const FIELD_POSITIONS = {
  // Page 1
  clientName: { page: 0, x: 105, y: 687 },
  clientDOB: { page: 0, x: 320, y: 687 },
  partnerName: { page: 0, x: 105, y: 660 },
  partnerDOB: { page: 0, x: 320, y: 660 },
  
  // Reproductive Materials Checkboxes
  embryo: { page: 0, x: 100, y: 620 },
  sperm: { page: 0, x: 180, y: 620 },
  oocytes: { page: 0, x: 240, y: 620 },
  ovarianTissue: { page: 0, x: 320, y: 620 },
  endometrialTissue: { page: 0, x: 430, y: 620 },
  donorEmbryo: { page: 0, x: 100, y: 600 },
  donorSemen: { page: 0, x: 180, y: 600 },
  donorEggs: { page: 0, x: 240, y: 600 },
  otherMaterial: { page: 0, x: 480, y: 600 },
  
  // Patient of
  patientOf: { page: 0, x: 150, y: 550 },
  
  // Last Page (Signatures)
  clientSignature: { page: 6, x: 120, y: 500, width: 150, height: 40 },
  clientNamePrint: { page: 6, x: 120, y: 480 },
  clientDate: { page: 6, x: 300, y: 480 },
  partnerSignature: { page: 6, x: 120, y: 430, width: 150, height: 40 },
  partnerNamePrint: { page: 6, x: 120, y: 410 },
  witnessName: { page: 6, x: 350, y: 350 },
  witnessDate: { page: 6, x: 500, y: 350 },
  
  // Add more field positions as needed
};

async function fillPDFWithData(pdfBytes, formData) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);
  
  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pages = pdfDoc.getPages();
  const defaultSize = 11;

  // ===== BASIC INFORMATION =====
  // Client Information
  const { page: clientPage, x: clientX, y: clientY } = FIELD_POSITIONS.clientName;
  pages[clientPage].drawText(formData.clientName, {
    x: clientX, y: clientY,
    size: defaultSize,
    font: helveticaFont
  });

  pages[FIELD_POSITIONS.clientDOB.page].drawText(formData.clientDOB, {
    x: FIELD_POSITIONS.clientDOB.x,
    y: FIELD_POSITIONS.clientDOB.y,
    size: defaultSize,
    font: helveticaFont
  });

  // Partner Information (if exists)
  if (formData.partnerName) {
    pages[FIELD_POSITIONS.partnerName.page].drawText(formData.partnerName, {
      x: FIELD_POSITIONS.partnerName.x,
      y: FIELD_POSITIONS.partnerName.y,
      size: defaultSize,
      font: helveticaFont
    });

    pages[FIELD_POSITIONS.partnerDOB.page].drawText(formData.partnerDOB, {
      x: FIELD_POSITIONS.partnerDOB.x,
      y: FIELD_POSITIONS.partnerDOB.y,
      size: defaultSize,
      font: helveticaFont
    });
  }

  // ===== REPRODUCTIVE MATERIALS =====
  formData.reproductiveMaterials.forEach(material => {
    const fieldName = material.toLowerCase().replace(/\s+/g, '');
    if (FIELD_POSITIONS[fieldName]) {
      pages[FIELD_POSITIONS[fieldName].page].drawText('☑', {
        x: FIELD_POSITIONS[fieldName].x,
        y: FIELD_POSITIONS[fieldName].y,
        size: defaultSize + 2,
        font: helveticaFont
      });
    }
  });

  if (formData.otherMaterial) {
    pages[FIELD_POSITIONS.otherMaterial.page].drawText(formData.otherMaterial, {
      x: FIELD_POSITIONS.otherMaterial.x,
      y: FIELD_POSITIONS.otherMaterial.y,
      size: defaultSize,
      font: helveticaFont
    });
  }

  // ===== SIGNATURES =====
  // Client Signature
  if (formData.clientSignature) {
    const signatureImage = await pdfDoc.embedPng(formData.clientSignature);
    pages[FIELD_POSITIONS.clientSignature.page].drawImage(signatureImage, {
      x: FIELD_POSITIONS.clientSignature.x,
      y: FIELD_POSITIONS.clientSignature.y,
      width: FIELD_POSITIONS.clientSignature.width,
      height: FIELD_POSITIONS.clientSignature.height
    });
  }

  // Printed Name
  pages[FIELD_POSITIONS.clientNamePrint.page].drawText(formData.clientName, {
    x: FIELD_POSITIONS.clientNamePrint.x,
    y: FIELD_POSITIONS.clientNamePrint.y,
    size: defaultSize,
    font: helveticaFont
  });

  // Date
  // pages[FIELD_POSITIONS.clientDate.page].drawText(formData.clientSignature, {
  //   x: FIELD_POSITIONS.clientDate.x,
  //   y: FIELD_POSITIONS.clientDate.y,
  //   size: defaultSize,
  //   font: helveticaFont
  // });

  // Add more field fillings as needed...

  return await pdfDoc.save();
}

async function sendEmailWithPDF(email, pdfBuffer, clientName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Fertility Clinic - Reproductive Material Storage Agreement",
    text: `Dear ${clientName},\n\nPlease find attached your completed agreement.`,
    attachments: [{
      filename: `${clientName}_Agreement.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf"
    }]
  };
  return await transporter.sendMail(mailOptions);
}

// Main endpoint
app.post("/generate-agreement", async (req, res) => {
  try {
    const formData = req.body;
    
    // Validate required fields
    // if (!formData.clientName || !formData.clientEmail) {
    //   return res.status(400).json({ error: "Client name and email are required" });
    // }

    // Load the template PDF
    const templatePath = path.join(__dirname, "agreement.pdf");
    const templateBytes = fs.readFileSync(templatePath);

    // Process signatures
    let clientSignature;
    if (formData.clientSignature) {
      clientSignature = await cloudinary.uploader.upload(formData.clientSignature, {
        folder: "signatures",
        public_id: `${formData.clientName}_signature_${Date.now()}`
      });
    }

    const clientName = `${formData.firstName} ${formData.middleName || ""} ${
      formData.lastName
    }`.trim();

    // Prepare form data
    const pdfFormData = {
      clientName: clientName,
      clientDOB: formData.dateOfBirth,
      clientAddress: formData.address,
      clientTel: formData.phone || "",
      clientEmail: formData.email,
      signatureUrl: formData.clientSignature, 
      partnerName: "1",
      partnerDOB: "2",
      reproductiveMaterials: [],
      clientCity: "3",
      clientState: "4",
      clientZIP: "5",
      clientCell: "6",
      clientFax: "7",
      partnerSignatureUrl: "",
      parentGuardianSignatureUrl: "",
      staffSignature: "",
      witnessSignature: "",
      witnessName: "11",
      deathOptions: {},
      divorceOptions: {},
      unableToDecideOptions: {},
      failToPayOptions: {},
      storageTimeOptions: {},
      noLongerReceivingOptions: {},
      isMinor: false,
      clientSignatureDate: new Date().toISOString(),
      partnerSignatureDate: "1",
      parentGuardianSignatureDate: "1",
      staffSignatureDate: new Date().toISOString(),
      witnessSignatureDate: new Date().toISOString(),
      patientOf: "1",
      facilityName: "1",
      otherMaterial: "1",
      staffName: "1",
      parentGuardianName: "1",
    };

    // Generate PDF
    const filledPdfBytes = await fillPDFWithData(templateBytes, pdfFormData);

    // Send email
    await sendEmailWithPDF(formData.clientEmail, filledPdfBytes, formData.clientName);

    // Return PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${formData.clientName.replace(/\s+/g, "_")}_Agreement.pdf"`
    );
    res.send(filledPdfBytes);

  } catch (error) {
    console.error("Error generating agreement:", error);
    res.status(500).json({ error: "Failed to generate agreement", details: error.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "PDF Agreement Generator" });
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Service running on port ${PORT}`);
  console.log("Required environment variables:");
  console.log("- CLOUDINARY_CLOUD_NAME");
  console.log("- CLOUDINARY_API_KEY");
  console.log("- CLOUDINARY_API_SECRET");
  console.log("- EMAIL_USER");
  console.log("- EMAIL_PASS");
});

module.exports = app;