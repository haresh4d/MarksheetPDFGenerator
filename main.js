const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 480,
    resizable: false,
    titleBarStyle: "hidden", // Native Mac look
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Native Window Dialog Handlers
ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Excel Files", extensions: ["xlsx", "xls"] }],
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle("dialog:openDirectory", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return canceled ? null : filePaths[0];
});

// PDF Execution Pipeline
ipcMain.handle("generate-pdfs", async (event, { filePath, outputDir }) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    const groupedData = {};
    rows.forEach((row) => {
      const exam = row["exam"] ? String(row["exam"]).trim() : "";
      let brCode = row["BR_CODE"] ? String(row["BR_CODE"]).trim() : "";
      const examNumber = row["EXAMNUMBER"]
        ? String(row["EXAMNUMBER"]).trim()
        : "";

      if (brCode === "7") brCode = "07";

      if (brCode === "07" || brCode === "43") {
        if (!groupedData[exam]) groupedData[exam] = {};
        if (!groupedData[exam][brCode]) groupedData[exam][brCode] = [];
        if (examNumber) groupedData[exam][brCode].push(examNumber);
      }
    });

    let count = 0;
    for (const exam in groupedData) {
      for (const brCode in groupedData[exam]) {
        const sortedExamNumbers = groupedData[exam][brCode].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true }),
        );

        const safeExamName = exam.replace(/[/\\?%*:|"<>]/g, "_");
        const pdfFilename = `Marksheet_Distribution_${safeExamName}_BR_${brCode}.pdf`;
        const targetFilePath = path.join(outputDir, pdfFilename);

        await generateSignaturePDF(
          exam,
          brCode,
          sortedExamNumbers,
          targetFilePath,
        );
        count++;
      }
    }

    return {
      success: true,
      message: `Successfully generated ${count} PDFs in your chosen folder!`,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

function generateSignaturePDF(exam, brCode, examNumbers, fullPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 35 });
      const stream = fs.createWriteStream(fullPath);
      doc.pipe(stream);

      const margin = 35;
      const topOffset = 90;
      const rowHeight = 20;
      const colGap = 10;
      const colWidth = 168;

      const widthSr = 30;
      const widthExam = 78;
      const widthSign = 60;

      const dataRowsPerCol = 31;
      const footerY = 765;

      let globalIndex = 0;
      const totalItems = examNumbers.length;
      let pageNum = 1;

      while (globalIndex < totalItems) {
        if (pageNum > 1) doc.addPage();

        // Header Title Layout
        doc
          .font("Helvetica-Bold")
          .fontSize(16)
          .text(`Marksheet Distribution - ${exam}`, margin, 30, {
            align: "center",
          });
        doc
          .fontSize(11)
          .text(
            `BR_CODE: ${brCode}      |      Total Students: ${totalItems}      |      Page: ${pageNum}`,
            margin,
            55,
            { align: "center" },
          );

        // Dynamic Columns Layout
        for (let col = 0; col < 3; col++) {
          if (globalIndex >= totalItems) break; // Conditional Check: Prevent empty columns

          const startX = margin + col * (colWidth + colGap);
          let startY = topOffset;

          // Headers
          doc.font("Helvetica-Bold").fontSize(8.5);
          doc.rect(startX, startY, widthSr, rowHeight).stroke();
          doc.text("Sr.", startX, startY + 5, {
            width: widthSr,
            align: "center",
          });

          doc.rect(startX + widthSr, startY, widthExam, rowHeight).stroke();
          doc.text("ENROLL_NO", startX + widthSr, startY + 5, {
            width: widthExam,
            align: "center",
          });

          doc
            .rect(startX + widthSr + widthExam, startY, widthSign, rowHeight)
            .stroke();
          doc.text("Signature", startX + widthSr + widthExam, startY + 5, {
            width: widthSign,
            align: "center",
          });

          // Student Rows
          doc.font("Helvetica").fontSize(8);
          for (let r = 0; r < dataRowsPerCol; r++) {
            if (globalIndex >= totalItems) break;

            const currentSrNo = globalIndex + 1;
            const currentExamNum = examNumbers[globalIndex];
            globalIndex++;

            const rowY = startY + (r + 1) * rowHeight;

            doc.rect(startX, rowY, widthSr, rowHeight).stroke();
            doc.text(String(currentSrNo), startX, rowY + 6, {
              width: widthSr,
              align: "center",
            });

            doc.rect(startX + widthSr, rowY, widthExam, rowHeight).stroke();
            doc.text(currentExamNum, startX + widthSr, rowY + 6, {
              width: widthExam,
              align: "center",
            });

            doc
              .rect(startX + widthSr + widthExam, rowY, widthSign, rowHeight)
              .stroke();
          }
        }

        // Fixed Dynamic Page Footer
        doc.font("Helvetica").fontSize(10);
        doc.text("Date of Receipt: __________________", margin, footerY, {
          align: "left",
        });
        doc.text(
          "Name and Sign of Faculty: _______________________",
          margin,
          footerY,
          { align: "right", width: 525 },
        );

        pageNum++;
      }

      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
