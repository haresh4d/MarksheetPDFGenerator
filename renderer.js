// Removed btnFile
const btnFolder = document.getElementById("btn-folder");
const btnGenerate = document.getElementById("btn-generate");
const txtFile = document.getElementById("file-path");
const txtFolder = document.getElementById("folder-path");
const statusDiv = document.getElementById("status");
const dropZone = document.getElementById("drop-zone");

document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  dropZone.classList.remove("dragover");

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      txtFile.value = window.electronAPI.getFilePath(file);
    } else {
      updateStatus("Please drop a valid Excel file (.xlsx or .xls)", "error");
    }
  }
});

dropZone.addEventListener("click", async () => {
  const path = await window.electronAPI.selectFile();
  if (path) txtFile.value = path;
});

btnFolder.addEventListener("click", async () => {
  const path = await window.electronAPI.selectFolder();
  if (path) txtFolder.value = path;
});

btnGenerate.addEventListener("click", async () => {
  if (!txtFile.value || !txtFolder.value) {
    updateStatus(
      "Please choose both the Excel file and an output folder direction.",
      "error",
    );
    return;
  }

  updateStatus(
    "Analyzing Excel records and drafting PDFs... Please wait.",
    "success",
  );
  btnGenerate.disabled = true;

  const docType = document.querySelector('input[name="docType"]:checked').value;

  const result = await window.electronAPI.generatePDFs({
    filePath: txtFile.value,
    outputDir: txtFolder.value,
    docType: docType
  });

  btnGenerate.disabled = false;
  if (result.success) {
    updateStatus(result.message, "success");
  } else {
    updateStatus("Execution Error: " + result.message, "error");
  }
});

function updateStatus(msg, statusStyle) {
  statusDiv.style.display = "block";
  statusDiv.innerText = msg;
  statusDiv.className = statusStyle;
}
