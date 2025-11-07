/**
 * Utility functions for exporting data to CSV format
 */

export const exportToCSV = (data: any[], filename: string, headers?: Record<string, string>) => {
  if (data.length === 0) {
    throw new Error("Nenhum dado para exportar");
  }

  // Get headers from the first data item if not provided
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerLabels = headers ? Object.values(headers) : keys;

  // Create CSV content
  const csvContent = [
    // Header row
    headerLabels.join(","),
    // Data rows
    ...data.map(item => 
      keys.map(key => {
        let value = item[key];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          return "";
        }
        
        // Convert to string and escape
        value = String(value);
        
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (value.includes(",") || value.includes("\n") || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const formatDateForExport = (date: string | Date): string => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

export const formatBooleanForExport = (value: boolean): string => {
  return value ? "Sim" : "Não";
};
