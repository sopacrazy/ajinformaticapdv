
/**
 * Utility function to format dates correctly without timezone shifts.
 * Works with YYYY-MM-DD or full ISO strings.
 */
export const formatLocalDate = (dateStr: string): string => {
  if (!dateStr) return 'N/A';
  
  // If it's just a date YYYY-MM-DD
  if (dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  
  // If it's a full ISO string YYYY-MM-DDTHH:mm:ss...
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  // Formatar especificamente para o fuso horário de Brasília
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(date);
};

/**
 * Gets the current date in YYYY-MM-DD format based on local timezone.
 */
export const getTodayStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a time string (HH:mm) from an ISO string.
 */
export const formatLocalTime = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', minute: '2-digit'
  });
};
