/************************************************************
 * 100% DESIGN STUDIO — LEAVE & VENDOR MANAGEMENT SYSTEM
 * GOOGLE APPS SCRIPT COMPLETE TWO-WAY WEBHOOK (Code.gs)
 *
 * SHEET STRUCTURE (Columns A - P):
 * A  Timestamp                          (Col 1)
 * B  Employee Name                      (Col 2)
 * C  Department                         (Col 3)
 * D  Leave Type                         (Col 4)
 * E  Reason for Leave (Regular Leave)   (Col 5)
 * F  From Date                          (Col 6)
 * G  To Date                            (Col 7)
 * H  Medical Certificate if Applicable  (Col 8)
 * I  Email Address                      (Col 9)
 * J  Reason for Leave (Few Hours Leave) (Col 10)
 * K  Leave Date (Few Hours Leave)       (Col 11)
 * L  From Time (Few Hours Leave)        (Col 12)
 * M  To Time (Few Hours Leave)          (Col 13)
 * N  Status                             (Col 14)
 * O  Processed By                       (Col 15)
 * P  Action Date                        (Col 16)
 ************************************************************/

const ADMIN_EMAIL = "designadmin08@gmail.com";
const SHEET_NAME = "Form Responses 1";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw28LoETUSD3jbnDIxMZqBSPoggKLw_iHen4cFkUMm6Ayq6VukjcPwij5YoJRPRS198RA/exec";


// ==========================================================
// 1. RUNS AUTOMATICALLY WHEN GOOGLE FORM IS SUBMITTED
// ==========================================================

function onFormSubmit(e) {
  try {
    if (!e || !e.range) {
      throw new Error("This function must be executed by the spreadsheet form-submit trigger.");
    }

    const sheet = e.range.getSheet();
    const row = e.range.getRow();

    // ------------------------------------------------------
    // READ DATA DIRECTLY FROM YOUR A-P SHEET
    // ------------------------------------------------------
    const timestamp = sheet.getRange(row, 1).getValue();                 // A
    const employeeName = sheet.getRange(row, 2).getDisplayValue().trim(); // B
    const department = sheet.getRange(row, 3).getDisplayValue().trim();   // C
    const leaveType = sheet.getRange(row, 4).getDisplayValue().trim();    // D
    const regularReason = sheet.getRange(row, 5).getDisplayValue().trim(); // E
    const fromDate = sheet.getRange(row, 6).getValue();                   // F
    const toDate = sheet.getRange(row, 7).getValue();                     // G
    const medicalCertificate = sheet.getRange(row, 8).getDisplayValue().trim(); // H
    const employeeEmail = sheet.getRange(row, 9).getDisplayValue().trim(); // I
    const fewHoursReason = sheet.getRange(row, 10).getDisplayValue().trim(); // J
    const leaveDate = sheet.getRange(row, 11).getValue();                 // K
    const fromTime = sheet.getRange(row, 12).getValue();                 // L
    const toTime = sheet.getRange(row, 13).getValue();                   // M

    // ------------------------------------------------------
    // VALIDATE EMPLOYEE EMAIL
    // ------------------------------------------------------
    if (!employeeEmail || !isValidEmail(employeeEmail)) {
      sheet.getRange(row, 14).setValue("Error - Invalid Email");
      sheet.getRange(row, 15).setValue("System");
      sheet.getRange(row, 16).setValue(new Date());
      throw new Error("Invalid employee email: " + employeeEmail);
    }

    // ------------------------------------------------------
    // NORMALIZE LEAVE TYPE
    // ------------------------------------------------------
    const type = leaveType.toLowerCase().trim();
    const isSickLeave = type.indexOf("sick") !== -1;
    const isEmergencyLeave = type.indexOf("emergency") !== -1;
    const isFewHoursLeave = type.indexOf("few hours") !== -1 || type.indexOf("hourly") !== -1;

    // ------------------------------------------------------
    // FEW HOURS LEAVE VALIDATION (EXEMPT FROM 24-HOUR RULE)
    // ------------------------------------------------------
    if (isFewHoursLeave) {
      if (!leaveDate || !fromTime || !toTime) {
        sheet.getRange(row, 14).setValue("Error - Missing Few Hours Details");
        sheet.getRange(row, 15).setValue("System");
        sheet.getRange(row, 16).setValue(new Date());

        sendEmployeeErrorEmail(
          employeeEmail,
          employeeName,
          "Your Few Hours Leave request could not be processed because the date or time details were incomplete."
        );
        return;
      }

      const startMinutes = getMinutesFromTime(fromTime);
      const endMinutes = getMinutesFromTime(toTime);

      if (startMinutes >= endMinutes) {
        sheet.getRange(row, 14).setValue("Auto Rejected - Invalid Time");
        sheet.getRange(row, 15).setValue("System");
        sheet.getRange(row, 16).setValue(new Date());

        sendAutoRejectedEmail(
          employeeEmail,
          employeeName,
          leaveType,
          "The selected From Time must be earlier than the To Time."
        );
        return;
      }

      sheet.getRange(row, 14).setValue("Pending");
      sheet.getRange(row, 15).clearContent();
      sheet.getRange(row, 16).clearContent();

      sendAdminApprovalEmail({
        row: row,
        employeeName: employeeName,
        department: department,
        leaveType: leaveType,
        employeeEmail: employeeEmail,
        reason: fewHoursReason,
        leaveDate: leaveDate,
        fromTime: fromTime,
        toTime: toTime,
        isFewHours: true
      });

      sendEmployeePendingEmail(employeeEmail, employeeName, leaveType);
      return;
    }

    // ------------------------------------------------------
    // REGULAR LEAVE VALIDATION
    // ------------------------------------------------------
    if (!fromDate || !toDate) {
      sheet.getRange(row, 14).setValue("Error - Missing Leave Date");
      sheet.getRange(row, 15).setValue("System");
      sheet.getRange(row, 16).setValue(new Date());

      sendEmployeeErrorEmail(
        employeeEmail,
        employeeName,
        "Your leave request could not be processed because the leave dates were incomplete."
      );
      return;
    }

    const startDate = parseSmartDate(fromDate);
    const endDate = parseSmartDate(toDate);

    if (!startDate || !endDate || endDate < startDate) {
      sheet.getRange(row, 14).setValue("Auto Rejected - Invalid Date");
      sheet.getRange(row, 15).setValue("System");
      sheet.getRange(row, 16).setValue(new Date());

      sendAutoRejectedEmail(
        employeeEmail,
        employeeName,
        leaveType,
        "The To Date cannot be earlier than the From Date."
      );
      return;
    }

    // ------------------------------------------------------
    // 24-HOUR RULE VALIDATION
    // Sick Leave & Emergency Leave = EXEMPT
    // Casual & Half-Day Leave = 24-Hour advance notice required
    // ------------------------------------------------------
    const exemptFrom24HourRule = isSickLeave || isEmergencyLeave;

    if (!exemptFrom24HourRule) {
      const leaveStart = new Date(startDate.getTime());
      leaveStart.setHours(10, 30, 0, 0); // Studio workday begins at 10:30 AM IST

      const submittedAt = parseSmartDate(timestamp) || new Date();
      const differenceHours = (leaveStart.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

      if (differenceHours < 24) {
        sheet.getRange(row, 14).setValue("Auto Rejected - 24 Hour Rule");
        sheet.getRange(row, 15).setValue("System - 24 Hour Rule");
        sheet.getRange(row, 16).setValue(new Date());

        sendAutoRejectedEmail(
          employeeEmail,
          employeeName,
          leaveType,
          "Leave applications for " + leaveType + " must be submitted at least 24 hours in advance (before 10:30 AM on the start date)."
        );
        return;
      }
    }

    // ------------------------------------------------------
    // VALID REQUEST → MARK PENDING & NOTIFY
    // ------------------------------------------------------
    sheet.getRange(row, 14).setValue("Pending");
    sheet.getRange(row, 15).clearContent();
    sheet.getRange(row, 16).clearContent();

    sendAdminApprovalEmail({
      row: row,
      employeeName: employeeName,
      department: department,
      leaveType: leaveType,
      employeeEmail: employeeEmail,
      reason: regularReason,
      fromDate: fromDate,
      toDate: toDate,
      medicalCertificate: medicalCertificate,
      isFewHours: false
    });

    sendEmployeePendingEmail(employeeEmail, employeeName, leaveType);

  } catch (error) {
    console.error("onFormSubmit error:", error);
  }
}


// ==========================================================
// 1.1 SECURITY & TOKEN AUTHORIZATION HELPERS
// ==========================================================

function getDecisionSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty("STUDIO_DECISION_SECRET");
  if (!secret) {
    secret = "d100_gas_decision_secret_prod_2026_secure";
  }
  return secret;
}

function generateDecisionToken(row, action, timestamp) {
  const secret = getDecisionSecret();
  const payload = String(row) + ":" + String(action) + ":" + String(timestamp);
  const signature = Utilities.computeHmacSha256Signature(payload, secret);
  return Utilities.base64EncodeWebSafe(signature);
}

function verifyDecisionToken(row, action, timestamp, token) {
  if (!row || !action || !timestamp || !token) return false;
  const now = Date.now();
  const ts = parseInt(timestamp, 10);
  // Expire after 7 days (604,800,000 ms)
  if (isNaN(ts) || now - ts > 7 * 24 * 60 * 60 * 1000) {
    return false;
  }
  const expected = generateDecisionToken(row, action, timestamp);
  return expected === token;
}


// ==========================================================
// 2. ADMIN APPROVAL EMAIL DISPATCHER (WITH SIGNED CONFIRMATION)
// ==========================================================

function sendAdminApprovalEmail(data) {
  const now = Date.now();
  const approveToken = generateDecisionToken(data.row, "approve", now);
  const rejectToken = generateDecisionToken(data.row, "reject", now);

  const approveUrl = WEB_APP_URL + "?row=" + encodeURIComponent(data.row) + "&action=approve&token=" + encodeURIComponent(approveToken) + "&ts=" + now;
  const rejectUrl = WEB_APP_URL + "?row=" + encodeURIComponent(data.row) + "&action=reject&token=" + encodeURIComponent(rejectToken) + "&ts=" + now;

  let leaveDetails = "";
  if (data.isFewHours) {
    leaveDetails = `
      <tr>
        <td style="padding:8px 0;color:#64748B;">Leave Date</td>
        <td style="padding:8px 0;font-weight:600;color:#0F172A;">${formatDate(data.leaveDate)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748B;">From Time</td>
        <td style="padding:8px 0;font-weight:600;color:#0F172A;">${formatTime(data.fromTime)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748B;">To Time</td>
        <td style="padding:8px 0;font-weight:600;color:#0F172A;">${formatTime(data.toTime)}</td>
      </tr>
    `;
  } else {
    leaveDetails = `
      <tr>
        <td style="padding:8px 0;color:#64748B;">From Date</td>
        <td style="padding:8px 0;font-weight:600;color:#0F172A;">${formatDate(data.fromDate)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748B;">To Date</td>
        <td style="padding:8px 0;font-weight:600;color:#0F172A;">${formatDate(data.toDate)}</td>
      </tr>
    `;
  }

  const htmlBody = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F1F5F9;padding:30px;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
      <div style="border-bottom:2px solid #E2E8F0;padding-bottom:16px;margin-bottom:20px;">
        <span style="background:#EEF2FF;color:#4F46E5;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">100% DESIGN STUDIO OS</span>
        <h2 style="margin:10px 0 0;color:#0F172A;font-size:22px;">New Leave Application</h2>
      </div>

      <p style="color:#475569;font-size:14px;line-height:1.5;">An employee leave request requires your decision:</p>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#64748B;width:130px;">Employee</td>
          <td style="padding:8px 0;font-weight:600;color:#0F172A;">${escapeHtml(data.employeeName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Email</td>
          <td style="padding:8px 0;font-weight:600;color:#0F172A;">${escapeHtml(data.employeeEmail)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Department</td>
          <td style="padding:8px 0;font-weight:600;color:#0F172A;">${escapeHtml(data.department || "General")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Leave Type</td>
          <td style="padding:8px 0;font-weight:700;color:#4F46E5;">${escapeHtml(data.leaveType)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748B;">Reason</td>
          <td style="padding:8px 0;color:#334155;">${escapeHtml(data.reason || "Not specified")}</td>
        </tr>
        ${leaveDetails}
      </table>

      <div style="margin:28px 0 16px;text-align:center;">
        <a href="${approveUrl}" style="display:inline-block;background:#16A34A;color:#ffffff;text-decoration:none;padding:12px 28px;margin:6px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(22,163,74,0.3);">
          ✓ REVIEW & APPROVE
        </a>
        <a href="${rejectUrl}" style="display:inline-block;background:#DC2626;color:#ffffff;text-decoration:none;padding:12px 28px;margin:6px;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(220,38,38,0.3);">
          ✕ REVIEW & REJECT
        </a>
      </div>

      <p style="margin-top:20px;color:#94A3B8;font-size:11px;text-align:center;">
        Protected by single-use expiring token. Clicking opens a secure confirmation gateway before recording the decision.
      </p>
    </div>
  </div>
  `;

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: "Leave Request: " + data.employeeName + " (" + data.leaveType + ")",
    htmlBody: htmlBody
  });
}


// ==========================================================
// 3. WEB APP GET REQUEST (SECURE CONFIRMATION GATEWAY)
// ==========================================================

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return createResultPage("Invalid Request", "No request parameters received.", "#DC2626");
    }

    const row = parseInt(e.parameter.row, 10);
    const action = String(e.parameter.action || "").toLowerCase().trim();
    const token = String(e.parameter.token || "").trim();
    const ts = String(e.parameter.ts || "").trim();

    if (!row || row < 2) {
      return createResultPage("Invalid Request", "Invalid spreadsheet row identifier.", "#DC2626");
    }

    if (action !== "approve" && action !== "reject") {
      return createResultPage("Invalid Action", "Action must be 'approve' or 'reject'.", "#DC2626");
    }

    // Cryptographic Token Verification (Replay & Tampering Protection)
    if (!verifyDecisionToken(row, action, ts, token)) {
      return createResultPage(
        "Invalid or Expired Link",
        "This decision link has expired or the security token is invalid. Please review this request via the studio dashboard.",
        "#DC2626"
      );
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();

    if (!sheet) {
      return createResultPage("Sheet Error", 'Sheet "' + SHEET_NAME + '" not found.', "#DC2626");
    }

    if (row > sheet.getLastRow()) {
      return createResultPage("Not Found", "This leave request row no longer exists.", "#DC2626");
    }

    const currentStatus = sheet.getRange(row, 14).getDisplayValue().trim();
    const employeeName = sheet.getRange(row, 2).getDisplayValue().trim();
    const leaveType = sheet.getRange(row, 4).getDisplayValue().trim();
    const startDate = sheet.getRange(row, 6).getDisplayValue().trim();
    const endDate = sheet.getRange(row, 7).getDisplayValue().trim();

    if (
      currentStatus.toLowerCase() === "approved" ||
      currentStatus.toLowerCase() === "rejected" ||
      currentStatus.toLowerCase().indexOf("auto rejected") === 0 ||
      currentStatus.toLowerCase() === "cancelled"
    ) {
      return createResultPage("Already Processed", "This request was already marked as: " + currentStatus + " on the studio ledger.", "#64748B");
    }

    // SAFE CONFIRMATION SCREEN (LEAVE-01 Requirement):
    // HTTP GET NEVER commits decisions! Link scanners & antivirus crawlers are safely blocked.
    // Decision requires explicit user click submitting a signed POST request.
    const isApprove = action === "approve";
    const btnColor = isApprove ? "#16A34A" : "#DC2626";
    const actionLabel = isApprove ? "Confirm Approval" : "Confirm Rejection";

    const reasonFieldHtml = !isApprove
      ? `<div style="text-align:left;margin-bottom:16px;">
           <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:6px;">Rejection Reason (Optional):</label>
           <textarea name="rejectionReason" rows="2" style="width:100%;border:1px solid #CBD5E1;border-radius:8px;padding:8px;font-family:inherit;font-size:13px;box-sizing:border-box;" placeholder="Reason for staff records..."></textarea>
         </div>`
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Confirm Decision — 100% DESIGN Studio OS</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 480px; width: 100%; padding: 32px; text-align: center; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #EEF2F6; color: #334155; margin-bottom: 16px; letter-spacing: 0.5px; }
          h2 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #0F172A; }
          p { margin: 0 0 20px 0; font-size: 14px; color: #64748B; line-height: 1.5; }
          .details { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; margin-bottom: 24px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .row:last-child { margin-bottom: 0; }
          .label { color: #64748B; font-weight: 500; }
          .val { font-weight: 600; color: #0F172A; }
          button { background: ${btnColor}; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; transition: opacity 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          button:hover { opacity: 0.9; }
          .note { font-size: 11px; color: #94A3B8; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">SECURE DECISION GATEWAY</div>
          <h2>Confirm Leave Decision</h2>
          <p>Please confirm your decision below. Link pre-fetchers and scanners cannot trigger actions.</p>
          <div class="details">
            <div class="row"><span class="label">Employee:</span><span class="val">${employeeName}</span></div>
            <div class="row"><span class="label">Leave Type:</span><span class="val">${leaveType}</span></div>
            <div class="row"><span class="label">Duration:</span><span class="val">${startDate} to ${endDate}</span></div>
            <div class="row"><span class="label">Current Status:</span><span class="val">${currentStatus || "Pending"}</span></div>
          </div>
          <form method="POST" action="${ScriptApp.getService().getUrl()}">
            <input type="hidden" name="action" value="${action}">
            <input type="hidden" name="row" value="${row}">
            <input type="hidden" name="token" value="${token}">
            <input type="hidden" name="ts" value="${ts}">
            ${reasonFieldHtml}
            <button type="submit">${actionLabel}</button>
          </form>
          <div class="note">100% DESIGN Studio OS • Single-Use Cryptographic Decision Gateway</div>
        </div>
      </body>
      </html>
    `;

    return HtmlService.createHtmlOutput(htmlContent).setTitle("Confirm Leave Decision");
  } catch (error) {
    console.error("doGet error:", error);
    return createResultPage("Processing Error", error.message || String(error), "#DC2626");
  }
}


// ==========================================================
// 4. WEB APP POST REQUEST (DECISION MUTATION & STUDIO OS SYNC)
// ==========================================================

function doPost(e) {
  try {
    // --------------------------------------------------------
    // CASE A: FORM POST FROM CONFIRMATION GATEWAY (EMAIL DECISION)
    // --------------------------------------------------------
    if (e && e.parameter && e.parameter.token && e.parameter.row) {
      const row = parseInt(e.parameter.row, 10);
      const action = String(e.parameter.action || "").toLowerCase().trim();
      const token = String(e.parameter.token || "").trim();
      const ts = String(e.parameter.ts || "").trim();
      const rejectionReason = String(e.parameter.rejectionReason || "").trim();

      if (!verifyDecisionToken(row, action, ts, token)) {
        return createResultPage("Unauthorized", "Invalid or expired decision token.", "#DC2626");
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
      if (!sheet || row > sheet.getLastRow()) {
        return createResultPage("Error", "Spreadsheet row no longer exists.", "#DC2626");
      }

      const currentStatus = sheet.getRange(row, 14).getDisplayValue().trim();
      if (
        currentStatus.toLowerCase() === "approved" ||
        currentStatus.toLowerCase() === "rejected" ||
        currentStatus.toLowerCase() === "cancelled"
      ) {
        return createResultPage("Already Processed", "This request was already marked as " + currentStatus + ".", "#64748B");
      }

      const isApprove = action === "approve";
      const newStatus = isApprove ? "Approved" : "Rejected";
      const employeeName = sheet.getRange(row, 2).getDisplayValue().trim();
      const leaveType = sheet.getRange(row, 4).getDisplayValue().trim();
      const employeeEmail = sheet.getRange(row, 9).getDisplayValue().trim();
      const actionDate = new Date();

      sheet.getRange(row, 14).setValue(newStatus);
      sheet.getRange(row, 15).setValue(ADMIN_EMAIL + " (Confirmed via Gateway)");
      sheet.getRange(row, 16).setValue(actionDate).setNumberFormat("dd/MM/yyyy hh:mm:ss AM/PM");

      if (rejectionReason) {
        sheet.getRange(row, 14).setNote("Rejection Reason: " + rejectionReason);
      }

      SpreadsheetApp.flush();

      // Send decision email to employee
      sendDecisionEmail(employeeEmail, employeeName, leaveType, newStatus, rejectionReason);

      return createResultPage(
        isApprove ? "Leave Approved" : "Leave Rejected",
        "The leave application for " + employeeName + " has been marked as " + newStatus + ". A notification has been sent.",
        isApprove ? "#16A34A" : "#DC2626"
      );
    }

    // --------------------------------------------------------
    // CASE B: JSON POST FROM 100% DESIGN STUDIO OS (TWO-WAY SYNC)
    // --------------------------------------------------------
    let contents: any = {};
    try {
      contents = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Malformed request payload"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Webhook Secret Verification
    const configuredWebhookSecret = PropertiesService.getScriptProperties().getProperty("STUDIO_WEBHOOK_SECRET");
    if (configuredWebhookSecret) {
      const incomingSecret = contents.webhookSecret || (e.parameter && e.parameter.secret);
      if (incomingSecret !== configuredWebhookSecret) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Unauthorized: Invalid webhook secret token"
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const action = String(contents.action || "").toUpperCase().trim();
    const targetEmail = (contents.employeeEmail || "").toLowerCase().trim();
    const targetStatus = contents.status || (action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : action === "CANCEL" ? "Cancelled" : "[DELETED]");
    const processedBy = contents.processedBy || "Studio Leadership";
    const rejectionReason = contents.rejectionReason || "";
    const actionDate = new Date();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();
    let matchedRow = -1;

    // 1. Precise Match: Email AND Date (Smart Date Comparison)
    const targetDate = parseSmartDate(contents.startDate);
    const targetDateFormatted = String(contents.startDateFormatted || "").trim();
    const targetDateIso = String(contents.startDate || "").trim();

    if (targetEmail) {
      for (let r = data.length - 1; r >= 1; r--) {
        const row = data[r];
        const rowEmail = (row[8] || "").toString().toLowerCase().trim(); // Column I
        if (rowEmail !== targetEmail) continue;

        const rowFromRaw = row[5];  // Column F
        const rowHourlyRaw = row[10]; // Column K
        const rowDate = parseSmartDate(rowFromRaw) || parseSmartDate(rowHourlyRaw);

        if (targetDate && rowDate) {
          if (
            targetDate.getFullYear() === rowDate.getFullYear() &&
            targetDate.getMonth() === rowDate.getMonth() &&
            targetDate.getDate() === rowDate.getDate()
          ) {
            matchedRow = r + 1;
            break;
          }
        }

        const rowFromStr = String(rowFromRaw || "");
        const rowHourlyStr = String(rowHourlyRaw || "");
        if (
          (targetDateFormatted && (rowFromStr.indexOf(targetDateFormatted) !== -1 || rowHourlyStr.indexOf(targetDateFormatted) !== -1)) ||
          (targetDateIso && (rowFromStr.indexOf(targetDateIso) !== -1 || rowHourlyStr.indexOf(targetDateIso) !== -1))
        ) {
          matchedRow = r + 1;
          break;
        }
      }
    }

    // 2. Pending Row Match for this Employee
    if (matchedRow === -1 && targetEmail) {
      for (let r = data.length - 1; r >= 1; r--) {
        const row = data[r];
        const rowEmail = (row[8] || "").toString().toLowerCase().trim();
        const rowStatus = (row[13] || "").toString().toLowerCase().trim();
        if (rowEmail === targetEmail && (rowStatus === "pending" || rowStatus === "")) {
          matchedRow = r + 1;
          break;
        }
      }
    }

    // 3. Fallback: Latest Row for this Employee Email
    if (matchedRow === -1 && targetEmail) {
      for (let r = data.length - 1; r >= 1; r--) {
        const row = data[r];
        const rowEmail = (row[8] || "").toString().toLowerCase().trim();
        if (rowEmail === targetEmail) {
          matchedRow = r + 1;
          break;
        }
      }
    }

    // 4. Fallback: Match by Employee Name (Column B)
    if (matchedRow === -1 && contents.employeeName) {
      const targetName = String(contents.employeeName).toLowerCase().trim();
      for (let r = data.length - 1; r >= 1; r--) {
        const row = data[r];
        const rowName = (row[1] || "").toString().toLowerCase().trim();
        if (rowName && (rowName === targetName || rowName.indexOf(targetName) !== -1 || targetName.indexOf(rowName) !== -1)) {
          matchedRow = r + 1;
          break;
        }
      }
    }

    if (matchedRow > 0) {
      const employeeName = sheet.getRange(matchedRow, 2).getDisplayValue().trim() || contents.employeeName || "Employee";
      const leaveType = sheet.getRange(matchedRow, 4).getDisplayValue().trim() || "Leave";
      const resolvedEmail = sheet.getRange(matchedRow, 9).getDisplayValue().trim() || targetEmail;

      if (action === "DELETE") {
        sheet.getRange(matchedRow, 14).setValue("[DELETED IN STUDIO]");
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate).setNumberFormat("dd/MM/yyyy hh:mm:ss AM/PM");
        sheet.getRange(matchedRow, 1, 1, sheet.getLastColumn()).setFontLine("line-through");
      } else if (action === "CANCEL") {
        sheet.getRange(matchedRow, 14).setValue("Cancelled");
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate).setNumberFormat("dd/MM/yyyy hh:mm:ss AM/PM");
        sendDecisionEmail(resolvedEmail, employeeName, leaveType, "Cancelled");
      } else {
        sheet.getRange(matchedRow, 14).setValue(targetStatus);
        sheet.getRange(matchedRow, 15).setValue(processedBy);
        sheet.getRange(matchedRow, 16).setValue(actionDate).setNumberFormat("dd/MM/yyyy hh:mm:ss AM/PM");
        if (rejectionReason) {
          sheet.getRange(matchedRow, 14).setNote("Rejection Reason: " + rejectionReason);
        }
        // Send decision email to employee
        sendDecisionEmail(resolvedEmail, employeeName, leaveType, targetStatus, rejectionReason);
      }

      SpreadsheetApp.flush();

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        rowUpdated: matchedRow,
        action: action,
        status: targetStatus
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      warning: "No matching row found for " + targetEmail
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


// ==========================================================
// 5. EMPLOYEE EMAIL: PENDING SUBMISSION CONFIRMATION
// ==========================================================

function sendEmployeePendingEmail(email, employeeName, leaveType) {
  if (!isValidEmail(email)) return;

  const htmlBody = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F8FAFC;padding:30px;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <h2 style="color:#0F172A;margin-top:0;font-size:20px;">Leave Application Received</h2>
      <p style="color:#475569;font-size:14px;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.5;">
        Your request for <strong>${escapeHtml(leaveType)}</strong> has been recorded and submitted for leadership review.
      </p>
      <div style="background:#FEF3C7;border-left:4px solid:#F59E0B;padding:12px 16px;border-radius:6px;margin:20px 0;">
        <span style="font-size:12px;color:#92400E;font-weight:700;">CURRENT STATUS:</span>
        <div style="font-size:16px;color:#B45309;font-weight:700;margin-top:2px;">Pending Approval</div>
      </div>
      <p style="color:#64748B;font-size:13px;line-height:1.5;">
        You will receive another notification once studio leadership reviews your request.
      </p>
      <p style="color:#94A3B8;font-size:12px;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:16px;">
        100% DESIGN Studio • Automated Leave System
      </p>
    </div>
  </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: "Leave Request Received (Pending Review) — " + leaveType,
    htmlBody: htmlBody
  });
}


// ==========================================================
// 6. EMPLOYEE EMAIL: FINAL DECISION (APPROVED / REJECTED)
// ==========================================================

function sendDecisionEmail(email, employeeName, leaveType, status, reason) {
  if (!isValidEmail(email)) return;

  const isApproved = status.toLowerCase() === "approved";
  const headerColor = isApproved ? "#16A34A" : "#DC2626";
  const badgeBg = isApproved ? "#DCFCE7" : "#FEE2E2";
  const badgeText = isApproved ? "#15803D" : "#B91C1C";

  let reasonBlock = "";
  if (!isApproved && reason) {
    reasonBlock = `
      <div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:6px;margin:18px 0;">
        <span style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;">Reason Provided:</span>
        <div style="font-size:14px;color:#7F1D1D;margin-top:4px;">${escapeHtml(reason)}</div>
      </div>
    `;
  }

  const htmlBody = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F8FAFC;padding:30px;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <h2 style="color:${headerColor};margin-top:0;font-size:22px;">
        ${isApproved ? "✓ Leave Request Approved" : "✕ Leave Request Update"}
      </h2>
      <p style="color:#475569;font-size:14px;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.5;">
        ${isApproved
          ? "Your leave request for <strong>" + escapeHtml(leaveType) + "</strong> has been approved by studio leadership."
          : "Your leave request for <strong>" + escapeHtml(leaveType) + "</strong> could not be approved at this time."}
      </p>

      <div style="background:${badgeBg};color:${badgeText};padding:12px 16px;border-radius:8px;font-weight:700;font-size:14px;margin:16px 0;display:inline-block;">
        Status: ${status}
      </div>

      ${reasonBlock}

      <p style="color:#94A3B8;font-size:12px;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:16px;">
        100% DESIGN Studio • Automated Leave System
      </p>
    </div>
  </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: "Leave Request " + status + " — " + leaveType,
    htmlBody: htmlBody
  });
}


// ==========================================================
// 7. EMPLOYEE EMAIL: AUTO REJECTED (24-HOUR ADVANCE NOTICE)
// ==========================================================

function sendAutoRejectedEmail(email, employeeName, leaveType, reason) {
  if (!isValidEmail(email)) return;

  const htmlBody = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F8FAFC;padding:30px;">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 2px 14px rgba(0,0,0,0.06);">
      <h2 style="color:#DC2626;margin-top:0;font-size:22px;">Leave Request Not Accepted</h2>
      <p style="color:#475569;font-size:14px;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
      <p style="color:#475569;font-size:14px;line-height:1.5;">
        Your application for <strong>${escapeHtml(leaveType)}</strong> could not be accepted due to policy requirements.
      </p>

      <div style="background:#FEE2E2;border-left:4px solid #DC2626;padding:12px 16px;border-radius:6px;margin:18px 0;">
        <span style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;">Policy Rule:</span>
        <div style="font-size:14px;color:#7F1D1D;margin-top:4px;">${escapeHtml(reason)}</div>
      </div>

      <p style="color:#64748B;font-size:12px;line-height:1.5;">
        <strong>Exemption Notice:</strong> Sick Leave, Emergency Leave, and Few Hours Leave are exempt from the 24-hour advance requirement.
      </p>

      <p style="color:#94A3B8;font-size:12px;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:16px;">
        100% DESIGN Studio • Automated Leave System
      </p>
    </div>
  </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: "Leave Request Auto Rejected (24-Hour Notice Policy) — " + leaveType,
    htmlBody: htmlBody
  });
}


// ==========================================================
// 8. EMPLOYEE EMAIL: FORM ERROR NOTIFICATION
// ==========================================================

function sendEmployeeErrorEmail(email, employeeName, message) {
  if (!isValidEmail(email)) return;

  MailApp.sendEmail({
    to: email,
    subject: "Leave Application Issue — Incomplete Information",
    htmlBody: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:auto;padding:30px;background:#ffffff;border-radius:12px;border:1px solid #E2E8F0;">
        <h2 style="color:#DC2626;margin-top:0;">Leave Application Could Not Be Processed</h2>
        <p style="color:#475569;font-size:14px;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.5;">${escapeHtml(message)}</p>
        <p style="color:#64748B;font-size:13px;">Please review your dates/times and submit the form again.</p>
      </div>
    `
  });
}


// ==========================================================
// 9. RESULT CONFIRMATION WEBPAGE (FOR 1-CLICK EMAIL CLICKS)
// ==========================================================

function createResultPage(title, message, color) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  return HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${safeTitle} — 100% DESIGN Studio</title>
      <style>
        body { margin:0; background:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
        .card { background:#ffffff; max-width:480px; width:100%; border-radius:16px; padding:40px 32px; box-shadow:0 10px 30px rgba(0,0,0,0.08); text-align:center; }
        .icon { width:64px; height:64px; border-radius:50%; background:${color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 20px; }
        h1 { font-size:24px; color:#0F172A; margin:0 0 12px; }
        p { color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px; }
        .footer { font-size:12px; color:#94A3B8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h1>${safeTitle}</h1>
        <p>${safeMessage}</p>
        <div class="footer">100% DESIGN Studio OS • You may close this window.</div>
      </div>
    </body>
    </html>
  `).setTitle(title);
}


// ==========================================================
// 10. ROBUST HELPER FUNCTIONS (IST TIMEZONE & SMART DATE PARSER)
// ==========================================================

function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function parseSmartDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (!str) return null;

  // Handle ISO formatted dates
  if (str.indexOf("T") !== -1) {
    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) return isoDate;
  }

  // DD/MM/YYYY or DD-MM-YYYY (Standard Indian Formats) with optional HH:mm:ss
  const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = match[4] ? parseInt(match[4], 10) : 0;
    const mins = match[5] ? parseInt(match[5], 10) : 0;
    const secs = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hours, mins, secs);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(val) {
  if (!val) return "-";
  const date = parseSmartDate(val);
  if (!date) return String(val);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function formatTime(val) {
  if (!val) return "-";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "hh:mm a");
  }
  return String(val);
}

function getMinutesFromTime(val) {
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes();
  }
  const date = new Date(val);
  if (!isNaN(date.getTime())) {
    return date.getHours() * 60 + date.getMinutes();
  }
  const str = String(val).trim();
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = (match[3] || "").toUpperCase();
    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  throw new Error("Invalid time format: " + val);
}

function escapeHtml(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
