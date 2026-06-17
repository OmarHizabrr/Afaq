let exportModule;

export async function loadSchoolReportExport() {
  if (!exportModule) {
    exportModule = await import('./schoolReportExport');
  }
  return exportModule;
}
