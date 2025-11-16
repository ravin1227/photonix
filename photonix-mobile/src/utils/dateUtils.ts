/**
 * Date utility functions for photo filtering and matching
 */

export const parseDateString = (dateString: string): Date => {
  // Parse date strings like "Nov 16, 2025"
  const months: {[key: string]: number} = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const parts = dateString.toLowerCase().replace(',', '').split(' ');
  if (parts.length === 3) {
    const month = months[parts[0].substring(0, 3)];
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  // Fallback to current date
  return new Date();
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const getDayStart = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getDayEnd = (date: Date): Date => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

