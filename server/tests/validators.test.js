import { describe, it, expect } from 'vitest';
import {
    validateReadingInput,
    getReportDateRanges,
    getTodayDateString,
} from '../src/utils/validators.js';

describe('Reading Input Validation (validateReadingInput)', () => {
    const validBase = {
        reading_date: '2026-10-15',
        slot: 'Morning (fasting)',
        value: 110,
    };

    it('accepts a valid reading and boundary values (40 and 600)', () => {
        expect(validateReadingInput(validBase)).toBeNull();
        expect(validateReadingInput({ ...validBase, value: 40 })).toBeNull();
        expect(validateReadingInput({ ...validBase, value: 600 })).toBeNull();
    });

    it('Rule 1: rejects missing or empty glucose values', () => {
        expect(validateReadingInput({ ...validBase, value: '' })).toBe(
            'Please enter a glucose value.'
        );
        expect(validateReadingInput({ ...validBase, value: null })).toBe(
            'Please enter a glucose value.'
        );
        expect(validateReadingInput({ ...validBase, value: undefined })).toBe(
            'Please enter a glucose value.'
        );
    });

    it('Rule 2: rejects values outside 40-600 or non-integers', () => {
        expect(validateReadingInput({ ...validBase, value: 39 })).toBe(
            'Value must be between 40 and 600 mg/dl.'
        );
        expect(validateReadingInput({ ...validBase, value: 601 })).toBe(
            'Value must be between 40 and 600 mg/dl.'
        );
        expect(validateReadingInput({ ...validBase, value: 120.5 })).toBe(
            'Value must be between 40 and 600 mg/dl.'
        );
        expect(validateReadingInput({ ...validBase, value: 'abc' })).toBe(
            'Value must be between 40 and 600 mg/dl.'
        );
    });

    it('Rule 5: rejects future dates', () => {
        expect(validateReadingInput({ ...validBase, reading_date: '2099-01-01' })).toBe(
            'Date cannot be in the future.'
        );
        // Today should be allowed
        expect(
            validateReadingInput({ ...validBase, reading_date: getTodayDateString() })
        ).toBeNull();
    });

    it('rejects invalid time slots', () => {
        expect(validateReadingInput({ ...validBase, slot: 'Midnight snack' })).toBe(
            'Please select a valid time slot.'
        );
    });
});

describe('Report Date Ranges (getReportDateRanges)', () => {
    it('computes Daily, MTD, and Previous Month ranges for 15 Oct 2026', () => {
        const ranges = getReportDateRanges('2026-10-15');

        expect(ranges.daily).toEqual({
            startDate: '2026-10-15',
            endDate: '2026-10-15',
        });
        expect(ranges.monthToDate).toEqual({
            startDate: '2026-10-01',
            endDate: '2026-10-15',
        });
        expect(ranges.previousMonth).toEqual({
            startDate: '2026-09-01',
            endDate: '2026-09-30',
        });
    });

    it('handles January rollover to December of the previous year', () => {
        const ranges = getReportDateRanges('2026-01-10');

        expect(ranges.monthToDate).toEqual({
            startDate: '2026-01-01',
            endDate: '2026-01-10',
        });
        expect(ranges.previousMonth).toEqual({
            startDate: '2025-12-01',
            endDate: '2025-12-31',
        });
    });
});