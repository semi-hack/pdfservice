require("dotenv").config();

const express = require("express");
const puppeteer = require("puppeteer");
const nodemailer = require("nodemailer");
const { v2: cloudinary } = require("cloudinary");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files
app.use(express.static("."));

// Serve the client form
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client.html"));
});

// Serve the test client form
app.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "test-client.html"));
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// HTML Template Generator
function generateHTMLTemplate(formData) {
  const {
    clientName = "",
    clientDOB = "",
    partnerName = "",
    partnerDOB = "",
    reproductiveMaterials = [],
    clientAddress = "",
    clientCity = "",
    clientState = "",
    clientZIP = "",
    clientTel = "",
    clientCell = "",
    clientFax = "",
    clientEmail = "",
    signatureUrl = "",
    partnerSignatureUrl = "",
    parentGuardianSignatureUrl = "",
    staffSignature = "",
    witnessSignature = "",
    witnessName = "",
    deathOptions = {},
    divorceOptions = {},
    unableToDecideOptions = {},
    failToPayOptions = {},
    storageTimeOptions = {},
    noLongerReceivingOptions = {},
    isMinor = false,
  } = formData;

  const formatDate = (dateStr) => {
    if (!dateStr) return "____/____/______";
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
      date.getDate()
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const renderCheckbox = (isChecked) => (isChecked ? "☑" : "☐");

  const renderMaterialCheckboxes = () => {
    const materials = [
      "Embryo",
      "Sperm",
      "Oocytes",
      "Ovarian Tissue",
      "Endometrial Tissue",
      "Donor Embryo",
      "Donor Semen",
      "Donor Eggs",
    ];
    return materials
      .map(
        (material) =>
          `${renderCheckbox(
            reproductiveMaterials.includes(material)
          )} ${material}`
      )
      .join("&nbsp;&nbsp;&nbsp;");
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reproductive Material Storage Agreement</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 20px;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo {
            margin-bottom: 15px;
        }
        
        .clinic-info {
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .agreement-title {
            font-size: 16px;
            font-weight: bold;
            font-style: italic;
            margin: 20px 0;
        }
        
        .form-section {
            margin-bottom: 20px;
        }
        
        .checkbox-group {
            margin: 10px 0;
        }
        
        .signature-section {
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 20px;
        }
        
        .signature-line {
            display: inline-block;
            width: 300px;
            border-bottom: 1px solid #000;
            margin: 0 10px;
            text-align: center;
            position: relative;
        }
        
        .signature-image {
            max-width: 250px;
            max-height: 50px;
            margin: 5px 0;
        }
        
        .date-line {
            display: inline-block;
            width: 120px;
            border-bottom: 1px solid #000;
            margin: 0 5px;
            text-align: center;
        }
        
        .checkbox {
            margin-right: 8px;
        }
        
        .section-header {
            font-weight: bold;
            margin: 15px 0 10px 0;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        .indent {
            margin-left: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        
        .contact-info {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
        }
        
        .contact-column {
            flex: 1;
        }
        
        .underline {
            border-bottom: 1px solid #000;
            display: inline-block;
            min-width: 200px;
            padding-bottom: 2px;
        }
    </style>
</head>
<body>
    <!-- Page 1 -->
    <div class="header">
        <div class="logo">
            <span style="color: #DAA520; font-size: 24px;">🤝</span>
            <div style="font-size: 18px; color: #228B22; font-weight: bold;">Fertility & <span style="color: #4169E1;">Cryogenics</span></div>
            <div style="font-size: 18px; font-weight: bold;">Lab</div>
        </div>
        
        <div class="clinic-info">
            Fertility & Cryogenics Lab<br>
            8635 Lemont Rd, Downers Grove IL 60516<br>
            Tel (630) 427 0300 Fax (630) 427 0302
        </div>
        
        <div class="agreement-title">REPRODUCTIVE MATERIAL(s) STORAGE AGREEMENT</div>
    </div>

    <div class="form-section">
        I (we), <span class="underline">${clientName}</span> DOB <span class="underline">${formatDate(
    clientDOB
  )}</span> (the "Client")
        <br><br>
        and, <span class="underline">${partnerName}</span> DOB <span class="underline">${formatDate(
    partnerDOB
  )}</span> (the "Partner," if applicable)
        <br><br>
        (The Client and Partner (if applicable) shall be referred to collectively as the "Client(s)") wish to transfer the following "Reproductive Material(s)" to FCLAB for continued storage:
    </div>

    <div class="checkbox-group">
        ${renderMaterialCheckboxes()}
        <br>
        Other: <span class="underline">${formData.otherMaterial || ""}</span>
    </div>

    <div class="form-section">
        <strong>1. FCLAB collects, tests, stores and freezes human sperm, embryos, eggs and other reproductive materials in connection with assisted reproductive technology treatment.</strong>
    </div>

    <div class="form-section">
        <strong>2.</strong> Client is a patient of <span class="underline">${
          formData.patientOf || ""
        }</span> (if applicable) and has frozen or intends to freeze the Reproductive Material(s) indicated above in assisted reproductive technologies or artificial insemination. Client(s) desire to deposit Reproductive Material(s) with FCLAB.
    </div>

    <div class="form-section">
        <strong>3.</strong> Client(s) and FCLAB acknowledge that FCLAB will freeze and/or store Reproductive Material(s) according to the terms and conditions set forth below.
    </div>

    <div class="form-section">
        <strong>4. REPRODUCTIVE MATERIAL(S) STORAGE</strong>
        <br><br>
        Concurrently with the execution of this Agreement and thereafter, Client(s) will deposit Reproductive Material(s) for storage by FCLAB. In the event that Client(s) cannot provide a current laboratory evaluation of the Reproductive Material(s) as required by FCLAB, FCLAB will obtain such an evaluation at Client(s)' sole cost and expense, which Client(s) will pay in advance.
    </div>

    <div class="form-section">
        <strong>5. LENGTH OF STORAGE</strong>
        <br><br>
        This Agreement shall commence on the date of receipt of Reproductive Material(s) and shall continue for a period of one (1) year ("Storage Period"), subject to earlier termination as hereinafter provided. Thereafter this Agreement shall be automatically renewed for successive Storage Periods, unless either party provides written notice to the other of his/her or its intent not to renew at least thirty (30) days prior to the anniversary date of a Storage Period.
    </div>

    <!-- Page 2 -->
    <div class="page-break">
        <div class="form-section">
            <strong>6. STORAGE FEES</strong>
            <br><br>
            Client(s) agree(s) to pay FCLAB, as compensation for its storage services hereunder, in the amount of $500.00 for Embryos or $250.00 for Sperm ("Storage Fee") per Storage Period, payable upon signing this Agreement. Storage Fees are nonrefundable and will not be prorated in the event this Agreement is terminated during a Storage Period. FCLAB may increase the Storage Fee for subsequent Storage Periods only upon written notice to Client(s) prior to expiration of the current Storage Period. In addition to the Storage Fees, Client(s) agree(s) to pay any laboratory fees and related charges, including, without limitation for blood analysis and other laboratory tests and evaluations.
        </div>

        <div class="form-section">
            <strong>7. RELEASE OF REPRODUCTIVE MATERIAL(S)</strong>
            <br><br>
            FCLAB shall release Reproductive Material(s) only to Client(s) or to others upon receipt of the form titled Release of Frozen Semen Specimens or Release of Frozen Embryo Authorization Form or Release of Frozen Oocytes signed by Client(s). Prior to the release of Reproductive Material(s) which have not been subject to laboratory evaluation, Client(s) (a) acknowledge that the Reproductive Material(s) have not been evaluated or screened for sexually transmitted disease or other diseases which would be disclosed or discovered by an evaluation or screening and (b) shall indemnify FCLAB from any lawsuit, cause of action, claim, liability, damage, judgment, settlement, including court costs and attorneys' which fees and expenses arising out of, associated with or pertaining to transmission of any diseases which would be disclosed or discovered through a laboratory evaluation or screening of Reproductive Material(s).
        </div>

        <div class="form-section">
            <strong>8. TERMINATION</strong>
            <br><br>
            This Agreement shall be terminated upon the happening of any one of the following events ("Terminating Events"):
            <br><br>
            a) Release of all Client(s)' Reproductive Material(s) in accordance with the terms of Section 7;
            <br><br>
            b) Written direction of Client(s) to FCLAB authorizing destruction of all Reproductive Material(s);
            <br><br>
            c) Failure of Client(s) to pay any Storage Fees for a period of thirty (30) days after written notice from FCLAB to Client(s);
            <br><br>
            d) Sixty (60) days after written notice given by either Client(s) or FCLAB to the other party terminating this Agreement.
            <br><br>
            e) Thirty (30) days after written notice given by FCLAB to Client(s) that FCLAB has determined, in its sole judgment and discretion that the Client(s)' Reproductive Material(s) are inappropriate for storage based on a laboratory evaluation, which evaluation may include, without limitation, the risk of transmitting disease. <em>In the event of the termination of this Agreement pursuant to paragraph 8(e), FCLAB will refund the Storage Fee paid by the Client(s), however, any laboratory fees or related charges paid by Client will be nonrefundable.</em>
            <br><br>
            Upon the occurrence of any Terminating Event, all obligations of FCLAB for storage of Client(s)' Reproductive Material(s) shall cease, and Client(s) shall make arrangement for release, use or other disposition of the Reproductive Material(s) within seven (7) days. <strong>Notwithstanding the foregoing, in the event of termination of this Agreement by reason of failure of Client to pay a Storage Fee pursuant to Section 8(c), FCLAB may, at its option, destroy all Client(s) Reproductive Material(s) in accordance with FCLAB's current policies and procedures.</strong>
        </div>
    </div>

    <!-- Page 3 -->
    <div class="page-break">
        <div class="form-section">
            <strong>9. LIMITATION OF LIABILITY</strong>
            <br><br>
            Client(s) and FCLAB acknowledge and agree that in the event of loss, damage or destruction of the Reproductive Material(s) for any reason whatsoever, Client(s) actual damages as a result thereof would be difficult to determine. Therefore, Client and FCLAB agree that the liability of FCLAB shall be limited to the amount paid by Client to FCLAB for the Storage Fee for the Storage Period within which the loss, damage or destruction occurred. However, FCLAB shall not be liable for any loss, damage or destruction of Reproductive Material(s) caused by occurrences beyond its control, including, without limitation, to acts of God, weather conditions, strikes or acts of any public authority.
        </div>

        <div class="form-section">
            <strong>10. RELEASE AND INDEMNIFICATION</strong>
            <br><br>
            <strong>a) RELEASE.</strong> Client(s) has/have been advised and understand(s) that there are inherent risks in the process of freezing and thawing Reproductive Material(s), including, without limitation, damage to the Reproductive Material(s), reduced capacity for fertilization and reduced lifespan of the Reproductive Material(s) after thawing. In consideration of the foregoing and except for the payment set forth in Section 6 hereof, Client(s) for herself/himself/themselves and his/her/their heirs, descendants, spouses, executors, administrators, agents, representatives, successors and assigns, hereby releases and forever discharges FCLAB &/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span>, its officers, members, employees, agents and representatives, successors and assigns, from all actions, causes of action, obligations, costs, expenses, attorneys' fees, damages, losses, claims, liabilities, defenses, offsets or demands whatsoever arising out of or relating to, directly or indirectly, the collection, testing, freezing, storage release, loss, damage or destruction of Reproductive Material(s). FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span>, its officers, members, agents, employees, representatives, successors and assigns shall not be liable for any damages incurred with respect to the transfer of the frozen Reproductive Material(s) and the handling or supervision of the Reproductive Material(s) after they have left FCLAB's possession. It is the intention of the Client(s) and FCLAB that the foregoing shall be effective as a general release and as a bar to all lawsuits, actions, causes of actions obligations, costs, expenses, attorneys' fees, damages, losses, claims, liabilities, defenses, offsets, claims or demands whether known or unknown.
            <br><br>
            <strong>b) INDEMNIFICATION.</strong> Client(s) shall indemnify, defend and hold harmlessly FCLAB &/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span>, its shareholders, members, officers, directors, employees, agents, representatives, successors and assigns from lawsuits, actions, causes of action, liabilities, obligations, costs, expenses, attorneys' fees, damages, tosses, claims, defenses, offsets or demands arising out of or relating to the collection, freezing, storage, release, loss damage or destruction of the Reproductive Material(s).
            <br><br>
            <strong>c) INDEMNIFICATION OF THIRD PARTY ACTIONS OR CLAIMS.</strong> Client(s) shall indemnify, defend and hold harmless FCLAB & Alpha Fertility, its shareholders, members, officers, directors, employees, agents, representatives, successors and assignees from any lawsuit, action, cause of action, liability, obligation, cost, expense, attorneys' fees, damage, loss, claim, defense, offset or demand from a third party claim arising out of or relating to the collection, freezing, storage, release, loss, damage or destruction of Reproductive Material(s) ("Claim"). FCLAB will provide prompt written notice to Client(s) of any such Claim, upon receipt of written notice of such Claim and copies of any pleadings or documents received in connection therewith. Client(s) shall, at his/her/their own cost and expense, promptly defend, contest and otherwise protect FCLAB & Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span> against any such Claim with respect to which Client(s) has/have agreed to indemnify, defend and hold harmless FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span> through counsel which shall be
        </div>
    </div>

    <!-- Page 4 -->
    <div class="page-break">
        <div class="form-section">
            reasonably acceptable to FCLAB &/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span>. Client(s) will have the right to compromise and settle, at his/her/their sole cost and expense, the Claim asserted seeking monetary damages, but shall not compromise or settle any Claim which seeks equitable or injunctive relief against FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span> without the express written consent of FCLAB, which consent may be granted or withheld in its sole and absolute discretion. Nonetheless, without affecting Client(s) obligation under this paragraph (c), FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span> may retain additional counsel at its sole expense. Client(s) will receive from FCLAB reasonable cooperation in said defense. In the event, Client(s), after written notice from FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span>, fails to take timely action to defend the Claim, FCLAB shall have the right to defend the Claim by counsel of its own choosing, but at the cost and expense of Client(s). In such event, FCLAB &/or Alpha Fertility or <span class="underline">${
    formData.facilityName || ""
  }</span> shall have the right to settle and compromise any such asserted liability at the cost and expense of the Client.
        </div>

        <div class="form-section">
            <strong>11. NOTICES</strong>
            <br><br>
            Any notices required or permitted to be provided to a party hereunder shall be in writing and shall be effective as of the date personally delivered or sent by electronic facsimile or three (3) days after deposit in the United States mail, postage prepaid, certified or registered, addressed to the party at the address set forth beneath such party's signature, or at such other address as a party may request in writing be used for that purpose. Client(s) acknowledge(s) that it is Client(s) obligation to provide a correct updated mailing address for Client(s) at all times during the term hereof.
            <br><br>
            To FCLAB:
            <div class="indent">
                Fertility & Cryogenics Lab<br>
                8635 Lemont Rd.<br>
                Downers Grove, IL 60516<br>
                Phone Number: 630 427 0300
            </div>
            <br>
            To Client:
            <div class="indent">
                Name: <span class="underline">${clientName}</span><br>
                Address: <span class="underline">${clientAddress}</span><br>
                Address: <span class="underline"></span><br>
                City: <span class="underline">${clientCity}</span> State: <span class="underline">${clientState}</span> ZIP: <span class="underline">${clientZIP}</span><br>
                Tel: <span class="underline">${clientTel}</span> Cell: <span class="underline">${clientCell}</span><br>
                Fax: <span class="underline">${clientFax}</span> email: <span class="underline">${clientEmail}</span>
            </div>
        </div>

        <div class="form-section">
            <strong>12. DEATH OF CLIENT OR PARTNER OR DIVORCE</strong>
            <br><br>
            a) In the event of the death of the Client, I/we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  deathOptions.client?.transferToPartner
                )} i. Transferred to the sole responsibility for the Partner (if applicable), to do with as he/she wishes <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  deathOptions.client?.donateToInfertile
                )} ii. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  deathOptions.client?.donateToResearch
                )} iii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  deathOptions.client?.discard
                )} iv. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
            <br>
            b) In the event of the death of the Partner, we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  deathOptions.partner?.transferToClient
                )} i. Transferred to the sole responsibility for the Client, to do with as he/she wishes <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>
    </div>

    <!-- Page 5 -->
    <div class="page-break">
        <div class="checkbox-group indent">
            ${renderCheckbox(
              deathOptions.partner?.donateToInfertile
            )} ii. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
            ${renderCheckbox(
              deathOptions.partner?.donateToResearch
            )} iii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
            ${renderCheckbox(
              deathOptions.partner?.discard
            )} iv. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
        </div>

        <div class="form-section">
            c) If applicable, in the event of both the deaths of the Client and Partner, we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  deathOptions.both?.donateToInfertile
                )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  deathOptions.both?.donateToResearch
                )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  deathOptions.both?.discard
                )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>

        <div class="form-section">
            d) If applicable, in the event of the Client and Partner's divorce or separation, we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  divorceOptions.donateToInfertile
                )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  divorceOptions.donateToResearch
                )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  divorceOptions.discard
                )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  divorceOptions.placeAtDisposal
                )} iv. Placed at the disposal of the Client or Partner in accordance with the provisions of the decree for divorce <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>

        <div class="form-section">
            e) In the event I/we notify FCLAB &/or Alpha Fertility in writing that I/we are unable to decide/agree on the future disposition of Reproductive Material(s) we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  unableToDecideOptions.donateToInfertile
                )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  unableToDecideOptions.donateToResearch
                )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  unableToDecideOptions.discard
                )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>

        <div class="form-section">
            f) I/We agree that in the event I/we fail to make one annual payment for storage, the Reproductive Material(s) will be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  failToPayOptions.donateToInfertile
                )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  failToPayOptions.donateToResearch
                )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  failToPayOptions.discard
                )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>

        <div class="form-section">
            g) I/We understand that the Reproductive Material(s) will be stored for a time not to exceed the normal reproductive life of the Client (age 50 for females; age 65 for males). At that time I/we wish the Reproductive Material(s) to be:
        </div>
    </div>

    <!-- Page 6 -->
    <div class="page-break">
        <div class="checkbox-group indent">
            ${renderCheckbox(
              storageTimeOptions.donateToInfertile
            )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
            ${renderCheckbox(
              storageTimeOptions.donateToResearch
            )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
            ${renderCheckbox(
              storageTimeOptions.discard
            )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
        </div>

        <div class="form-section">
            h) In the event I/we are no longer receiving assisted reproductive technology treatment and we have failed to inform FCLAB &/or Alpha Fertility of our current address and telephone number for a period of one (1) year I/we wish the Reproductive Material(s) to be:
            <div class="checkbox-group indent">
                ${renderCheckbox(
                  noLongerReceivingOptions.donateToInfertile
                )} i. Donated to infertile couples <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  noLongerReceivingOptions.donateToResearch
                )} ii. Donated for medical research <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span><br>
                ${renderCheckbox(
                  noLongerReceivingOptions.discard
                )} iii. Discarded <span class="underline">_____ Client initials / _____ Partner initials (if applicable)</span>
            </div>
        </div>

        <div class="form-section">
            <strong>13. MISCELLANEOUS PROVISIONS</strong>
            <br><br>
            a) Client(s) understand(s) and agree(s) that FCLAB &/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span> cannot and does not assume responsibility or liability for the safety or quality of Reproductive Material(s) that were not originally processed by FCLAB or have left FCLAB's control and have thereafter been returned. Client(s) understand(s) and agree(s) that in the above mentioned situations, the sole responsibility of FCLAB is limited to the storage of Reproductive Material(s), upon receipt, provided that Reproductive Material(s) are returned in proper frozen condition.
            <br><br>
            b) This Agreement represents the entire agreement between parties concerning the subject matter hereof and there are no other understandings, agreements, or representations other than as herein set forth. This Agreement shall be binding upon the parties and their respective, spouses, executors, administrators, agents, representatives, successors and assigns. This Agreement shall be construed in accordance with the laws of the State of Illinois without regard to principles of its conflict of laws rule. If any provision of the Agreement is determined to be unenforceable, the remaining provisions hereof shall nevertheless be fully enforceable in accordance with their terms.
            <br><br>
            c) The covenants and agreement contained in this Agreement shall survive its termination and shall remain in full force and effect.
            <br><br>
            d) If any provision of this Agreement, or any portion of any provision shall be deemed invalid or unenforceable pursuant to a final determination of any court of competent jurisdiction or as a result of future legislative action, such determination or action shall be construed so as not to affect the validity or enforceability of any other portion hereof.
            <br><br>
            e) Client(s) and FCLAB&/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span> agree to submit to personal jurisdiction and to waive an objection regarding venue in the County of DuPage and State of Illinois. Further, the parties agree that the prosecution or defense of any litigation or dispute arising out of this Agreement shall be litigated in the Circuit Court of DuPage County, Illinois which court the parties agree shall have sole and exclusive jurisdiction of the subject matter and parties. The undersigned, one of the member of the assisted reproductive medical staff of FCLAB
        </div>
    </div>

    <!-- Page 7 - Signature Page -->
    <div class="page-break">
        <div class="signature-section">
            <p>&/or Alpha Fertility or <span class="underline">${
              formData.facilityName || ""
            }</span>, by my signature, states that the foregoing agreement was read, discussed and signed in my presence.</p>
            
            <div style="margin: 30px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                    <div style="flex: 2;">
                        <div>Signature of Client</div>
                        <div style="margin-top: 10px;">
                            ${
                              signatureUrl
                                ? `<img src="${signatureUrl}" class="signature-image" alt="Client Signature">`
                                : ""
                            }
                        </div>
                        <div class="signature-line"></div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div>Date</div>
                        <div class="date-line">${formatDate(
                          formData.clientSignatureDate
                        )}</div>
                    </div>
                </div>
                
                <div style="margin: 10px 0;">
                    Print Name <span class="underline">${clientName}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 20px 0;">
                    <div style="flex: 2;">
                        <div>Signature of Partner (if applicable)</div>
                        <div style="margin-top: 10px;">
                            ${
                              partnerSignatureUrl
                                ? `<img src="${partnerSignatureUrl}" class="signature-image" alt="Partner Signature">`
                                : ""
                            }
                        </div>
                        <div class="signature-line"></div>
                    </div>
                    <div style="flex: 1; text-align: center;">
                        <div>Date</div>
                        <div class="date-line">${formatDate(
                          formData.partnerSignatureDate
                        )}</div>
                    </div>
                </div>
                
                <div style="margin: 10px 0;">
                    Print Name <span class="underline">${partnerName}</span>
                </div>
            </div>
            
            ${
              isMinor
                ? `
            <div style="margin: 30px 0; border-top: 1px solid #ccc; padding-top: 20px;">
                <div style="font-weight: bold; text-decoration: underline; margin-bottom: 15px;">
                    If the Client above is a minor, a parent or guardian of the minor must sign below:
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px;">
                    <div style="flex: 2;">
                        <div>Signature of Parent or Guardian (if applicable)</div>
                        <div style="margin-top: 10px;">
                            ${
                              parentGuardianSignatureUrl
                                ? `<img src="${parentGuardianSignatureUrl}" class="signature-image" alt="Parent/Guardian Signature">`
                                : ""
                            }
                        </div>
                        <div class="signature-line"></div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 10px 0;">
                    <div style="flex: 1;">
                        <div>Date</div>
                        <div class="date-line">${formatDate(
                          formData.parentGuardianSignatureDate
                        )}</div>
                    </div>
                </div>
                
                <div style="margin: 10px 0;">
                    Print Name <span class="underline">${
                      formData.parentGuardianName || ""
                    }</span>
                </div>
            </div>
            `
                : ""
            }
            
            <div style="margin: 40px 0; border-top: 1px solid #ccc; padding-top: 20px;">
                <p>The undersigned, one of the members of the assisted reproductive medical staff of ALPHA FERTILITY or FCLAB or <span class="underline">${
                  formData.facilityName || ""
                }</span>, by my signature states that the foregoing consent was read, discussed, and signed in my presence. In the case of a Notarized Consent Form, the members of the assisted reproductive medical staff of ALPHA FERTILITY or <span class="underline">${
    formData.facilityName || ""
  }</span>, by my signature states that the foregoing consent was read and discussed.</p>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 20px 0;">
                    <div style="flex: 2;">
                        <div>Signature of FCLAB/Alpha Fertility or <span class="underline">${
                          formData.facilityName || ""
                        }</span> staff</div>
                        <div style="margin-top: 10px;">
                            <div class="signature-line">${staffSignature}</div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 20px 0;">
                    <div style="flex: 1;">
                        <div>Signature</div>
                        <div class="signature-line"></div>
                    </div>
                    <div style="flex: 1; margin: 0 20px;">
                        <div>Print Name</div>
                        <div class="underline">${formData.staffName || ""}</div>
                    </div>
                    <div style="flex: 1;">
                        <div>Date</div>
                        <div class="date-line">${formatDate(
                          formData.staffSignatureDate
                        )}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin: 40px 0; border-top: 1px solid #ccc; padding-top: 20px;">
                <div style="font-weight: bold; margin-bottom: 15px;">WITNESS:</div>
                
                <p>By signing below, the Witness affirms that he/she knows the Client(s) and parent or guardian, if applicable, and that he/she was present and witnessed the Client(s) signatures and the parent's or guardian's signature, if applicable, on this document.</p>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin: 30px 0;">
                    <div style="flex: 1; margin-right: 20px;">
                        <div class="signature-line">${witnessSignature}</div>
                        <div style="text-align: center; margin-top: 5px;">Signature</div>
                    </div>
                    <div style="flex: 1; margin: 0 20px;">
                        <div class="underline">${witnessName}</div>
                        <div style="text-align: center; margin-top: 5px;">Print Name</div>
                    </div>
                    <div style="flex: 1; margin-left: 20px;">
                        <div class="date-line">${formatDate(
                          formData.witnessSignatureDate
                        )}</div>
                        <div style="text-align: center; margin-top: 5px;">Date</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 50px; font-size: 14px; font-weight: bold;">
            7
        </div>
    </div>

</body>
</html>
  `;
}

// Upload signature to Cloudinary
async function uploadSignatureToCloudinary(signatureBase64, clientName) {
  try {
    const result = await cloudinary.uploader.upload(signatureBase64, {
      folder: "fertility_signatures",
      public_id: `${clientName}_signature_${Date.now()}`,
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading signature:", error);
    throw error;
  }
}

// Generate PDF from HTML
async function generatePDF(htmlContent) {
  let browser;

  try {
    // Try different launch configurations for different environments
    const launchOptions = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    };

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    await page.waitForTimeout(1000);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
    });

    return pdf;
  } catch (error) {
    console.error("Puppeteer launch error:", error.message);

    if (!browser) {
      try {
        console.log("Trying alternative Puppeteer configuration...");
        browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          product: "chrome",
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);

        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
          },
        });

        return pdf;
      } catch (secondError) {
        console.error("Second Puppeteer attempt failed:", secondError.message);
        throw new Error(`Failed to generate PDF: ${secondError.message}`);
      }
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

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
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dateOfBirth ||
      !formData.address ||
      !formData.email
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: firstName, lastName, dateOfBirth, address, email",
      });
    }

    // Upload ID document to Cloudinary if provided
    let idDocumentUrl = "";
    if (formData.idDocument) {
      try {
        const result = await cloudinary.uploader.upload(formData.idDocument, {
          folder: "fclab-documents",
          public_id: `${formData.firstName}_${
            formData.lastName
          }_id_${Date.now()}`,
          resource_type: "image",
        });
        idDocumentUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Error uploading ID document:", uploadError);
      }
    }

    // Prepare data for PDF generation
    const clientName = `${formData.firstName} ${formData.middleName || ""} ${
      formData.lastName
    }`.trim();

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
      clientSignatureDate: new Date().toISOString(),
      partnerSignatureDate: "",
      parentGuardianSignatureDate: "",
      staffSignatureDate: new Date().toISOString(),
      witnessSignatureDate: new Date().toISOString(),
      patientOf: "",
      facilityName: "",
      otherMaterial: "",
      staffName: "",
      parentGuardianName: "",
    };

    // Generate HTML content
    const htmlContent = generateHTMLTemplate(pdfFormData);

    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent);

    // Send email with PDF
    await sendEmailWithPDF(formData.email, pdfBuffer, clientName);

    res.json({
      success: true,
      message:
        "Registration submitted successfully. Agreement sent to your email.",
      clientName: clientName,
      email: formData.email,
      idDocumentUrl: idDocumentUrl,
    });
  } catch (error) {
    console.error("Error processing registration:", error);
    res.status(500).json({
      error: "Failed to process registration",
      details: error.message,
    });
  }
});

app.post("/generate-agreement", async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (!formData.clientName || !formData.clientEmail) {
      return res.status(400).json({
        error: "Client name and email are required",
      });
    }

    // Upload signatures to Cloudinary if provided
    let signatureUrl = "";
    let partnerSignatureUrl = "";
    let parentGuardianSignatureUrl = "";

    // if (formData.clientSignature) {
    //   signatureUrl = await uploadSignatureToCloudinary(
    //     formData.clientSignature,
    //     formData.clientName
    //   );
    // }

    // if (formData.partnerSignature && formData.partnerName) {
    //   partnerSignatureUrl = await uploadSignatureToCloudinary(
    //     formData.partnerSignature,
    //     formData.partnerName
    //   );
    // }

    // if (formData.parentGuardianSignature && formData.isMinor) {
    //   parentGuardianSignatureUrl = await uploadSignatureToCloudinary(
    //     formData.parentGuardianSignature,
    //     formData.parentGuardianName || "Parent_Guardian"
    //   );
    // }

    // Add signature URLs to form data
    const updatedFormData = {
      ...formData,
      signatureUrl,
      partnerSignatureUrl,
      parentGuardianSignatureUrl,
    };

    // Generate HTML content
    const htmlContent = generateHTMLTemplate(updatedFormData);

    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent);

    // Send email with PDF
    await sendEmailWithPDF(
      formData.clientEmail,
      pdfBuffer,
      formData.clientName
    );

    // Return success response with PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${formData.clientName.replace(
        /\s+/g,
        "_"
      )}_Storage_Agreement.pdf"`
    );

    res.json({
      success: true,
      message: "Agreement generated and sent successfully",
      signatureUrls: {
        client: signatureUrl,
        partner: partnerSignatureUrl,
        parentGuardian: parentGuardianSignatureUrl,
      },
    });
  } catch (error) {
    console.error("Error generating agreement:", error);
    res.status(500).json({
      error: "Failed to generate agreement",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "Fertility PDF Generator" });
});

// Test endpoint without PDF generation
app.post("/api/test-registration", async (req, res) => {
  try {
    const formData = req.body;

    // Validate required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.dateOfBirth ||
      !formData.address ||
      !formData.email
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: firstName, lastName, dateOfBirth, address, email",
      });
    }

    const clientName = `${formData.firstName} ${formData.middleName || ""} ${
      formData.lastName
    }`.trim();

    res.json({
      success: true,
      message: "Registration test successful (no PDF generated)",
      clientName: clientName,
      email: formData.email,
      receivedData: formData,
    });
  } catch (error) {
    console.error("Error in test registration:", error);
    res.status(500).json({
      error: "Test failed",
      details: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Fertility PDF Service running on port ${PORT}`);
  console.log("Required environment variables:");
  console.log("- CLOUDINARY_CLOUD_NAME");
  console.log("- CLOUDINARY_API_KEY");
  console.log("- CLOUDINARY_API_SECRET");
  console.log("- EMAIL_USER");
  console.log("- EMAIL_PASS");
});

module.exports = app;
