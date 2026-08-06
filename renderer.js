const btnFile = document.getElementById("btn-file");
const btnFolder = document.getElementById("btn-folder");
const btnGenerate = document.getElementById("btn-generate");
const txtFile = document.getElementById("file-path");
const txtFolder = document.getElementById("folder-path");
const statusDiv = document.getElementById("status");

btnFile.addEventListener("click", async () => {
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

  const result = await window.electronAPI.generatePDFs({
    filePath: txtFile.value,
    outputDir: txtFolder.value,
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
