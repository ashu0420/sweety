export const VALID_SLOTS = [
    'Morning (fasting)',
    'After breakfast',
    'After lunch',
    'After dinner',
];

export function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function validateReadingInput({ reading_date, slot, value }) {
    // Rule 1: Value is required
    if (value === undefined || value === null || String(value).trim() === '') {
        return 'Please enter a glucose value.';
    }

    // Rule 2: Value must be a whole number between 40 and 600
    const parsedValue = Number(value);
    if (
        typeof value === 'boolean' ||
        !Number.isInteger(parsedValue) ||
        parsedValue < 40 ||
        parsedValue > 600
    ) {
        return 'Value must be between 40 and 600 mg/dl.';
    }

    // Check date format (YYYY-MM-DD)
    if (!reading_date || !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
        return 'Please provide a valid date (YYYY-MM-DD).';
    }

    // Rule 5: Date cannot be in the future
    const today = getTodayDateString();
    if (reading_date > today) {
        return 'Date cannot be in the future.';
    }

    // Check valid slot
    if (!slot || !VALID_SLOTS.includes(slot)) {
        return 'Please select a valid time slot.';
    }

    return null; 
  }