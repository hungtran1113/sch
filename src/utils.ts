import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, eachDayOfInterval, startOfYear, getISOWeeksInYear, getISOWeek, setISOWeek, setISOWeekYear } from 'date-fns';

// Options to make Monday the first day of the week
const weekOptions = { weekStartsOn: 1 as const };

export function getCurrentWeek(date: Date = new Date()): Date {
    return startOfWeek(date, weekOptions);
}

export function getNextWeek(date: Date): Date {
    return addWeeks(startOfWeek(date, weekOptions), 1);
}

export function getPrevWeek(date: Date): Date {
    return subWeeks(startOfWeek(date, weekOptions), 1);
}

export function getDaysOfWeek(startDate: Date): Date[] {
    const end = endOfWeek(startDate, weekOptions);
    return eachDayOfInterval({ start: startDate, end });
}

export function getWeekId(date: Date): string {
    const w = getISOWeek(date);
    const y = format(date, 'yyyy');
    return `${y}-W${w.toString().padStart(2, '0')}`;
}

export function parseWeekId(weekId: string): Date {
    const [y, w] = weekId.split('-W');
    const d = setISOWeekYear(new Date(), parseInt(y));
    const result = setISOWeek(d, parseInt(w));
    return startOfWeek(result, weekOptions);
}

export function generateWeekOptions(): { value: string; label: string }[] {
    const options = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear < 2026 ? currentYear : 2026;
    for (let year = startYear; year <= 2030; year++) {
        const d = startOfYear(new Date(year, 0, 1));
        const totalWeeks = getISOWeeksInYear(d);
        for (let w = 1; w <= totalWeeks; w++) {
            const tempDate = setISOWeek(setISOWeekYear(new Date(), year), w);
            const start = startOfWeek(tempDate, weekOptions);
            const end = endOfWeek(tempDate, weekOptions);
            options.push({
                value: `${year}-W${w.toString().padStart(2, '0')}`,
                label: `Tuần ${w} năm ${year} (${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')})`
            });
        }
    }
    return options;
}
