require('dotenv').config();

const express = require("express");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");
const https = require("https");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3001; 

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-client.html'));
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to download image from URL
async function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      const fileStream = require('fs').createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(filePath);
      });

      fileStream.on('error', (err) => {
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// Generate PDF using PDFKit
async function generatePDFWithPDFKit(formData) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `agreement_${formData.clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, 'generated', fileName);

      const generatedDir = path.dirname(filePath);
      try {
        await fs.access(generatedDir);
      } catch {
        await fs.mkdir(generatedDir, { recursive: true });
      }

      const writeStream = require('fs').createWriteStream(filePath);
      doc.pipe(writeStream);

      // Helper function to format date
      const formatDate = (dateStr) => {
        if (!dateStr) return "____/____/______";
        const date = new Date(dateStr);
        return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
      };

      const renderCheckbox = (isChecked) => (isChecked ? "☑" : "☐");

      // Header
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Fertility & Cryogenics Lab', 50, 50);
      doc.fontSize(10).font('Helvetica');
      doc.text('8635 Lemont Rd, Downers Grove IL 60516', 50, 70);
      doc.text('Tel (630) 427 0300 Fax (630) 427 0302', 50, 85);

      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('REPRODUCTIVE MATERIAL(s) STORAGE AGREEMENT', 50, 120, { align: 'center' });

      // Add uploaded ID document image if available
      if (formData.signatureUrl) {
        try {
          const imageUrl = formData.signatureUrl.replace('/upload/', '/upload/w_200,h_150,c_fill/');
          const tempImagePath = path.join(__dirname, 'temp_image.jpg');
          
          // Download the image first
          await downloadImage(imageUrl, tempImagePath);

          // Add image with proper positioning and sizing
          doc.image(tempImagePath, 400, 50, {
            width: 150,
            height: 100,
            fit: [150, 100]
          });

          doc.fontSize(8).font('Helvetica');
          doc.text('ID Document', 400, 160, { align: 'center' });

          // Clean up temporary image file
          try {
            await fs.unlink(tempImagePath);
          } catch (cleanupError) {
            console.warn('Could not delete temporary image file:', cleanupError.message);
          }

        } catch (imageError) {
          console.warn('Failed to add image to PDF:', imageError.message);
        }
      }

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica');

      // Client Information
      const dobString = formatDate(formData.clientDOB);
      doc.text(`I (we), ${formData.clientName}`, 50, 160);
      doc.text('___________________________', 50, 175);
      doc.text(`DOB ${dobString} (the "Client")`, 50, 190);

      if (formData.partnerName) {
        const partnerDobString = formatDate(formData.partnerDOB);
        doc.text(`and, ${formData.partnerName}`, 50, 205);
        doc.text('___________________________', 50, 220);
        doc.text(`DOB ${partnerDobString} (the "Partner," if applicable)`, 50, 235);
      }

      doc.moveDown(1);
      doc.text('(The Client and Partner (if applicable) shall be referred to collectively as the "Client(s)") wish to transfer', 50, doc.y);
      doc.text('the following "Reproductive Material(s)" to FCLAB for continued storage:', 50, doc.y + 15);

      // Reproductive Materials Checkboxes
      const materials = ['Embryo', 'Sperm', 'Oocytes', 'Ovarian Tissue', 'Endometrial Tissue', 'Donor Embryo', 'Donor Semen', 'Donor Eggs'];
      let currentY = doc.y + 30;

      materials.forEach((material, index) => {
        const isChecked = formData.reproductiveMaterials && formData.reproductiveMaterials.includes(material);
        const checkbox = renderCheckbox(isChecked);

        if (index % 4 === 0 && index > 0) {
          currentY += 20;
        }

        const xPos = 50 + (index % 4) * 120;
        doc.text(`${checkbox} ${material}`, xPos, currentY);
      });

      doc.text('☐ Other: _____________________', 50, currentY + 20);

      // Agreement Terms
      doc.moveDown(2);
      doc.fontSize(9);

      const terms = [
        '1. FCLAB collects, tests, stores and freezes human sperm, embryos, eggs and other reproductive materials in connection with assisted reproductive technology treatment.',

        '2. Client is a patient of _________________ (if applicable) and has frozen or intends to freeze the Reproductive Material(s) indicated above in assisted reproductive technologies or artificial insemination. Client(s) desire to deposit Reproductive Material(s) with FCLAB.',

        '3. Client(s) and FCLAB acknowledge that FCLAB will freeze and/or store Reproductive Material(s) according to the terms and conditions set forth below.',

        '4. REPRODUCTIVE MATERIAL(S) STORAGE\nConcurrently with the execution of this Agreement and thereafter, Client(s) will deposit Reproductive Material(s) for storage by FCLAB. In the event that Client(s) cannot provide a current laboratory evaluation of the Reproductive Material(s) as required by FCLAB, FCLAB will obtain such an evaluation at Client(s)\' sole cost and expense, which Client(s) will pay in advance.',

        '5. LENGTH OF STORAGE\nThis Agreement shall commence on the date of receipt of Reproductive Material(s) and shall continue for a period of one (1) year ("Storage Period"), subject to earlier termination as hereinafter provided. Thereafter this Agreement shall be automatically renewed for successive Storage Periods, unless either party provides written notice to the other of his/her or its intent not to renew at least thirty (30) days prior to the anniversary date of a Storage Period.',

        '6. STORAGE FEES\nClient(s) agree(s) to pay FCLAB, as compensation for its storage services hereunder, in the amount of $500.00 for Embryos or $250.00 for Sperm ("Storage Fee") per Storage Period, payable upon signing this Agreement. Storage Fees are nonrefundable and will not be prorated in the event this Agreement is terminated during a Storage Period. FCLAB reserves the right to increase Storage Fees for subsequent periods with prior written notice. Client(s) shall also be responsible for any additional laboratory fees and related charges, including but not limited to blood analysis and other tests.',

        '7. RELEASE OF REPRODUCTIVE MATERIAL(S)\nFCLAB will release Reproductive Material(s) only upon receipt of the appropriate signed forms (e.g., Release of Frozen Semen Specimens, Release of Frozen Embryo Authorization Form, or Release of Frozen Oocytes). If Reproductive Material(s) have not undergone laboratory evaluation prior to release, Client(s) acknowledge that such material has not been screened for sexually transmitted or other diseases. Client(s) agree to indemnify FCLAB from any legal claims, lawsuits, damages, or other legal actions arising from the transmission of diseases that would have been disclosed by a laboratory evaluation.',

        '8. TERMINATION\nThe following events shall constitute "Terminating Events" and shall result in the termination of this Agreement: (a) All Client(s)\' Reproductive Material(s) are released as provided in Section 7; (b) Client(s) provide written direction to FCLAB to destroy their Reproductive Material(s); (c) Client(s) fail to pay Storage Fees for thirty (30) days after written notice from FCLAB; (d) Either Client(s) or FCLAB gives sixty (60) days\' written notice to terminate; (e) FCLAB determines, based on laboratory evaluation (including disease transmission risk), that Reproductive Material(s) are inappropriate for storage, with thirty (30) days\' written notice to Client(s). In the case of Section 8(e), FCLAB will refund the Storage Fee, but laboratory fees and related charges are nonrefundable. Upon termination, FCLAB\'s storage obligations shall cease, and Client(s) must arrange for the disposition of their Reproductive Material(s) within seven (7) days. If this Agreement is terminated due to Client(s)\' failure to pay Storage Fees (Section 8(c)), FCLAB may destroy all Client(s)\' Reproductive Material(s) according to its policies.',

        '9. LIMITATION OF LIABILITY\nIn the event of loss, damage, or destruction of Reproductive Material(s), Client(s)\' actual damages are difficult to determine. Therefore, FCLAB\'s liability shall be limited to the Storage Fee paid by Client(s) for the Storage Period during which such loss occurred. FCLAB shall not be liable for losses caused by events beyond its control, including but not limited to acts of God, weather conditions, strikes, or acts of public authority.',

        '10. RELEASE AND INDEMNIFICATION\n(a) RELEASE: Client(s) acknowledge the inherent risks in freezing and thawing Reproductive Material(s), including damage, reduced fertilization capacity, and reduced lifespan. Client(s), their heirs and assigns, release and discharge FCLAB &/or Alpha Fertility or ______ its officers, members, employees, agents and representatives, successors and assigns from all claims, liabilities, and demands arising from the collection, testing, freezing, storage, release, loss, damage, or destruction of Reproductive Material(s). FCLAB &/or Alpha Fertility or ______ its officers, members, agents, employees, representatives, successors and assigns shall not be liable for damages incurred after Reproductive Material(s) have left FCLAB\'s possession.\n\n(b) INDEMNIFICATION: Client(s) shall indemnify, defend, and hold harmless FCLAB &/or Alpha Fertility or ______ its shareholders, members, officers, directors, employees, agents, representatives, successors and assigns from any lawsuits, claims, and demands related to the collection, freezing, storage, release, loss, damage, or destruction of Reproductive Material(s).\n\n(c) INDEMNIFICATION OF THIRD PARTY ACTIONS OR CLAIMS: Client(s) shall indemnify, defend, and hold harmless FCLAB & Alpha Fertility, its shareholders, members, officers, directors, employees, agents, representatives, successors and assignees from any third-party claims arising from the collection, freezing, storage, release, loss, damage, or destruction of Reproductive Material(s). FCLAB will provide written notice of such claims, and Client(s) shall, at their own cost, defend and protect FCLAB & Alpha Fertility or ______ against any such Claim with respect to which Client(s) has/have agreed to indemnify, defend and hold harmless FCLAB &/or Alpha Fertility or ______ through counsel which shall be reasonably acceptable to FCLAB &/or Alpha Fertility or ______. Client(s) will have the right to compromise and settle any such Claim without the express written consent of FCLAB &/or Alpha Fertility or ______. In the event Client(s), after written notice from FCLAB &/or Alpha Fertility or ______, fails to take timely action to defend the Claim, FCLAB shall have the right to defend the Claim and FCLAB &/or Alpha Fertility or ______ shall have the right to settle and compromise any such asserted liability at the cost and expense of the Client.'
      ];

      let yPos = doc.y + 30;
      terms.forEach(term => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        doc.text(term, 50, yPos, {
          width: 500,
          align: 'justify',
          lineGap: 3
        });
        yPos = doc.y + 15;
      });

      if (doc.y > 600) {
        doc.addPage();
      }

      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('11. NOTICES', 50, doc.y);
      doc.font('Helvetica').fontSize(9);
      doc.text('All notices required or permitted under this Agreement shall be in writing and shall be effective upon personal delivery, electronic facsimile, or three (3) days after mailing via certified or registered mail to the address provided. Client(s) shall be responsible for providing updated mailing addresses.', 50, doc.y + 15, { width: 500, align: 'justify' });

      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('To FCLAB:', 50, doc.y);
      doc.font('Helvetica').fontSize(9);
      doc.text('Fertility & Cryogenics Lab', 50, doc.y + 15);
      doc.text('8635 Lemont Rd., Downers Grove, IL 60516', 50, doc.y + 15);
      doc.text('630 427 0300', 50, doc.y + 15);

      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('To Client:', 50, doc.y);
      doc.font('Helvetica').fontSize(9);
      doc.text(`Name: ${formData.clientName}`, 50, doc.y + 15);
      doc.text('___________________________', 50, doc.y + 15);
      doc.text(`Address: ${formData.clientAddress}`, 50, doc.y + 15);
      doc.text('___________________________', 50, doc.y + 15);
      doc.text(`Tel: ${formData.clientTel || '_________________'}`, 50, doc.y + 15);
      doc.text('___________________________', 50, doc.y + 15);
      doc.text(`Email: ${formData.clientEmail}`, 50, doc.y + 15);
      doc.text('___________________________', 50, doc.y + 15);

      // Section 12: DEATH OF CLIENT OR PARTNER OR DIVORCE
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('12. DEATH OF CLIENT OR PARTNER OR DIVORCE', 50, doc.y);
      doc.font('Helvetica').fontSize(9);

      doc.text('a) In the event of the death of the Client, I/we wish the Reproductive Material(s) to be:', 50, doc.y + 15);
      doc.text('○ Transferred to the sole responsibility for the Partner (if applicable), to do with as he/she wishes', 70, doc.y + 30);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated to infertile couples', 70, doc.y + 30);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 30);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 30);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      if (formData.partnerName) {
        doc.text('b) In the event of the death of the Partner, we wish the Reproductive Material(s) to be:', 50, doc.y + 30);
        doc.text('○ Transferred to the sole responsibility for the Client, to do with as he/she wishes', 70, doc.y + 15);
        doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      }

      // Add page for remaining sections
      if (doc.y > 600) {
        doc.addPage();
      }

      // Continue with remaining disposition options
      doc.text('c) In the event of both the deaths of the Client and Partner:', 50, doc.y + 30);
      doc.text('○ Donated to infertile couples', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      if (formData.partnerName) {
        doc.text('d) In the event of the Client and Partner\'s divorce or separation:', 50, doc.y + 30);
        doc.text('○ Donated to infertile couples', 70, doc.y + 15);
        doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
        doc.text('○ Donated for medical research', 70, doc.y + 15);
        doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
        doc.text('○ Discarded', 70, doc.y + 15);
        doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
        doc.text('○ Placed at the disposal of the Client or Partner in accordance with the provisions of the decree for divorce', 70, doc.y + 15);
        doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      }

      doc.text('e) In the event I/we notify FCLAB &/or Alpha Fertility in writing that I/we are unable to decide/agree on the future disposition of Reproductive Material(s):', 50, doc.y + 30);
      doc.text('○ Donated to infertile couples', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      doc.text('f) In the event I/we fail to make one annual payment for storage:', 50, doc.y + 30);
      doc.text('○ Donated to infertile couples', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      // Add page for final sections
      if (doc.y > 600) {
        doc.addPage();
      }

      doc.text('g) I/We understand that the Reproductive Material(s) will be stored for a time not to exceed the normal reproductive life of the Client (age 50 for females; age 65 for males). At that time I/we wish the Reproductive Material(s) to be:', 50, doc.y + 30);
      doc.text('○ Donated to infertile couples', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      doc.text('h) In the event I/we are no longer receiving assisted reproductive technology treatment and we have failed to inform FCLAB &/or Alpha Fertility of our current address and telephone number for a period of one (1) year I/we wish the Reproductive Material(s) to be:', 50, doc.y + 30);
      doc.text('○ Donated to infertile couples', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Donated for medical research', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);
      doc.text('○ Discarded', 70, doc.y + 15);
      doc.text('   Client initials / ____ Partner initials (if applicable)', 90, doc.y + 15);

      // Section 13: MISCELLANEOUS PROVISIONS
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('13. MISCELLANEOUS PROVISIONS', 50, doc.y);
      doc.font('Helvetica').fontSize(9);

      const miscProvisions = [
        'a) Client(s) understand(s) and agree(s) that FCLAB &/or Alpha Fertility or ______ cannot and does not assume responsibility or liability for the safety or quality of Reproductive Material(s) that were not originally processed by FCLAB or have left FCLAB\'s control and have thereafter been returned. FCLAB\'s sole responsibility is limited to storage upon receipt, provided the materials are returned in proper frozen condition.',

        'b) This Agreement constitutes the entire agreement between the parties, binding upon them and their respective spouses, executors, administrators, agents, representatives, successors, and assigns. This Agreement shall be construed in accordance with the laws of the State of Illinois. If any provision of this Agreement is deemed unenforceable, the remaining provisions shall remain fully enforceable.',

        'c) The covenants and agreement contained within this Agreement shall survive its termination and remain in full force and effect.',

        'd) If any provision of this Agreement is deemed invalid or unenforceable by a court or due to future legislative action, such determination shall not affect the validity or enforceability of any other portion of this Agreement.',

        'e) Client(s) and FCLAB&/or Alpha Fertility or ______ agree to submit to personal jurisdiction and to waive an objection regarding venue in the County of DuPage and State of Illinois. Any litigation or dispute arising from this Agreement shall be litigated in the Circuit Court of DuPage County, Illinois, which the parties agree shall have sole and exclusive jurisdiction. The undersigned, one of the members of the assisted reproductive medical staff of FCLAB.'
      ];

      miscProvisions.forEach(provision => {
        if (doc.y > 700) {
          doc.addPage();
        }
        doc.text(provision, 50, doc.y + 15, { width: 500, align: 'justify', lineGap: 3 });
      });

      // Add final page for signatures
      if (doc.y > 600) {
        doc.addPage();
      }

      // Signature Section
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('SIGNATURES', 50, doc.y);
      doc.font('Helvetica');

      doc.moveDown(1);
      doc.text('&/or Alpha Fertility or ______, by my signature, states that the foregoing agreement was read, discussed and signed in my presence.', 50, doc.y + 15, { width: 500, align: 'justify' });

      doc.moveDown(2);
      doc.text(`Print Name: ${formData.clientName}`, 50, doc.y);
      doc.text('Signature of Client: ___________________________ Date: ____/____/______', 50, doc.y + 20);

      if (formData.partnerName) {
        doc.text(`Print Name: ${formData.partnerName}`, 50, doc.y + 40);
        doc.text('Signature of Partner (if applicable): ___________________________ Date: ____/____/______', 50, doc.y + 20);
      }

      doc.text('Signature of Parent or Guardian (if applicable): ___________________________ Date: ____/____/______', 50, doc.y + 40);
      doc.text('Print Name: ___________________________', 50, doc.y + 20);

      doc.moveDown(2);
      doc.text('The undersigned, one of the members of the assisted reproductive medical staff of ALPHA FERTILITY or FCLAB or ______, by my signature states that the foregoing consent was read, discussed, and signed in my presence. In the case of a Notarized Consent Form, the members of the assisted reproductive medical staff of ALPHA FERTILITY or ______ by my signature states that the foregoing consent was read and discussed.', 50, doc.y + 15, { width: 500, align: 'justify' });

      doc.moveDown(2);
      doc.text('Signature of FCLAB/Alpha Fertility or ______ staff', 50, doc.y);
      doc.text('Signature: ___________________________', 50, doc.y + 20);
      doc.text('Print Name: ___________________________', 50, doc.y + 20);
      doc.text('Date: ____/____/______', 50, doc.y + 20);

      doc.moveDown(2);
      doc.text('Witness:', 50, doc.y);
      doc.text('Signature: ___________________________', 50, doc.y + 20);
      doc.text('Print Name: ___________________________', 50, doc.y + 20);
      doc.text('Date: ____/____/______', 50, doc.y + 20);

      doc.end();

      writeStream.on('finish', async () => {
        try {
          // Read the generated PDF file
          const pdfBuffer = await fs.readFile(filePath);
          
          // Clean up the file
          await fs.unlink(filePath);
          
          resolve(pdfBuffer);
        } catch (error) {
          reject(error);
        }
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Send email with PDF attachment
async function sendEmailWithPDF(email, pdfBuffer, clientName) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Fertility Clinic - Reproductive Material Storage Agreement",
    text: `Dear ${clientName},

Please find attached your completed Reproductive Material Storage Agreement.

If you have any questions, please don't hesitate to contact us.

Best regards,
Fertility & Cryogenics Lab
Phone: (630) 427-0300`,
    attachments: [
      {
        filename: `${clientName.replace(/\s+/g, "_")}_Storage_Agreement.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  return await transporter.sendMail(mailOptions);
}

// Main API endpoint for form submission
app.post("/api/submit-registration", async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.address || !formData.email) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, dateOfBirth, address, email",
      });
    }

    // Upload ID document to Cloudinary if provided
    let idDocumentUrl = "";
    if (formData.idDocument) {
      try {
        const result = await cloudinary.uploader.upload(formData.idDocument, {
          folder: "fclab-documents",
          public_id: `${formData.firstName}_${formData.lastName}_id_${Date.now()}`,
          resource_type: "image",
        });
        idDocumentUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Error uploading ID document:", uploadError);
        // Continue without ID document
      }
    }

    // Prepare data for PDF generation
    const clientName = `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.trim();
    
    const pdfFormData = {
      clientName: clientName,
      clientDOB: formData.dateOfBirth,
      clientAddress: formData.address,
      clientTel: formData.phone || "",
      clientEmail: formData.email,
      signatureUrl: idDocumentUrl, 
      partnerName: "",
      partnerDOB: "",
      reproductiveMaterials: [],
      clientCity: "",
      clientState: "",
      clientZIP: "",
      clientCell: "",
      clientFax: "",
      partnerSignatureUrl: "",
      parentGuardianSignatureUrl: "",
      staffSignature: "",
      witnessSignature: "",
      witnessName: "",
      deathOptions: {},
      divorceOptions: {},
      unableToDecideOptions: {},
      failToPayOptions: {},
      storageTimeOptions: {},
      noLongerReceivingOptions: {},
      isMinor: false,
      // Add dates for signatures
      clientSignatureDate: new Date().toISOString(),
      partnerSignatureDate: "",
      parentGuardianSignatureDate: "",
      staffSignatureDate: new Date().toISOString(),
      witnessSignatureDate: new Date().toISOString(),
      // Add other required fields with defaults
      patientOf: "",
      facilityName: "",
      otherMaterial: "",
      staffName: "",
      parentGuardianName: ""
    };

    // Generate PDF using PDFKit
    const pdfBuffer = await generatePDFWithPDFKit(pdfFormData);

    // Send email with PDF
    await sendEmailWithPDF(
      formData.email,
      pdfBuffer,
      clientName
    );

    res.json({
      success: true,
      message: "Registration submitted successfully. Agreement sent to your email.",
      clientName: clientName,
      email: formData.email,
      idDocumentUrl: idDocumentUrl
    });
  } catch (error) {
    console.error("Error processing registration:", error);
    res.status(500).json({
      error: "Failed to process registration",
      details: error.message,
    });
  }
});

// Test endpoint without PDF generation
app.post("/api/test-registration", async (req, res) => {
  try {
    const formData = req.body;
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.address || !formData.email) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, dateOfBirth, address, email",
      });
    }

    const clientName = `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.trim();
    
    res.json({
      success: true,
      message: "Registration test successful (no PDF generated)",
      clientName: clientName,
      email: formData.email,
      receivedData: formData
    });
  } catch (error) {
    console.error("Error in test registration:", error);
    res.status(500).json({
      error: "Test failed",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Fertility PDF Generator (PDFKit)" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fertility PDF Service (PDFKit) running on port ${PORT}`);
  console.log("Required environment variables:");
  console.log("- CLOUDINARY_CLOUD_NAME");
  console.log("- CLOUDINARY_API_KEY");
  console.log("- CLOUDINARY_API_SECRET");
  console.log("- EMAIL_USER");
  console.log("- EMAIL_PASS");
});

module.exports = app; 