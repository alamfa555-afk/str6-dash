import JSZip from 'jszip';

const FILES_TO_ZIP = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'index.html',
  'vercel.json',
  '.npmrc',
  '.gitignore',
  'src/main.tsx',
  'src/index.css',
  'src/types.ts',
  'src/data.ts',
  'src/App.tsx',
  'src/components/IssueFormModal.tsx',
  'src/components/ItemFormModal.tsx',
  'src/components/PDFReportHubModal.tsx',
  'src/components/ReceiveFormModal.tsx',
  'src/components/StatsGrid.tsx',
  'src/utils/pdfGenerator.ts',
  'src/utils/zipper.ts'
];

export async function downloadSourceCodeZip() {
  try {
    const zip = new JSZip();

    // Fetch and add each file to the zip
    const promises = FILES_TO_ZIP.map(async (filePath) => {
      try {
        const response = await fetch(`/${filePath}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}`);
        }
        const text = await response.text();
        zip.file(filePath, text);
      } catch (error) {
        console.warn(`Could not add ${filePath} to ZIP:`, error);
      }
    });

    await Promise.all(promises);

    // Generate zip blob
    const content = await zip.generateAsync({ type: 'blob' });

    // Download the ZIP
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = 'Ajanta_Store_Inventory_Dashboard_Project.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to generate ZIP:', error);
    alert('Failed to generate ZIP file. Please try downloading again.');
  }
}
