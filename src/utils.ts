import { 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  format, 
  eachDayOfInterval, 
  getISOWeeksInYear, 
  getISOWeek, 
  setISOWeek, 
  setISOWeekYear,
  startOfISOWeek
} from 'date-fns';

// Cấu hình bắt buộc: Tuần luôn bắt đầu từ Thứ 2
const weekOptions = { weekStartsOn: 1 as const };

/**
 * Lấy ngày Thứ 2 của tuần hiện tại
 */
export function getCurrentWeek(date: Date = new Date()): Date {
    return startOfWeek(date, weekOptions);
}

/**
 * Nhảy tới Thứ 2 của tuần kế tiếp
 */
export function getNextWeek(date: Date): Date {
    return addWeeks(startOfWeek(date, weekOptions), 1);
}

/**
 * Quay lại Thứ 2 của tuần trước đó
 */
export function getPrevWeek(date: Date): Date {
    return subWeeks(startOfWeek(date, weekOptions), 1);
}

/**
 * Lấy mảng 7 ngày trong tuần (Thứ 2 -> Chủ nhật)
 */
export function getDaysOfWeek(startDate: Date): Date[] {
    const end = endOfWeek(startDate, weekOptions);
    return eachDayOfInterval({ start: startDate, end });
}

/**
 * Tạo ID tuần theo định dạng YYYY-Www (Ví dụ: 2026-W16)
 */
export function getWeekId(date: Date): string {
    const w = getISOWeek(date);
    const y = format(date, 'yyyy');
    return `${y}-W${w.toString().padStart(2, '0')}`;
}

/**
 * Chuyển ID tuần ngược lại thành đối tượng Date (Thứ 2 của tuần đó)
 */
export function parseWeekId(weekId: string): Date {
    const [y, w] = weekId.split('-W');
    const year = parseInt(y);
    const week = parseInt(w);
    
    // Sử dụng chuẩn ISO để đảm bảo độ chính xác
    const date = setISOWeekYear(new Date(year, 0, 4), year);
    const result = setISOWeek(date, week);
    return startOfISOWeek(result);
}

/**
 * Tạo danh sách các tuần từ 2026 đến 2030 để hiển thị trong Select
 */
export function generateWeekOptions(): { value: string; label: string }[] {
    const options = [];
    const startYear = 2026;
    const endYear = 2030;

    for (let year = startYear; year <= endYear; year++) {
        // Lấy tổng số tuần ISO trong năm đó
        const referenceDate = new Date(year, 0, 4);
        const totalWeeks = getISOWeeksInYear(referenceDate);

        for (let w = 1; w <= totalWeeks; w++) {
            const dateInWeek = setISOWeek(setISOWeekYear(new Date(year, 0, 4), year), w);
            const start = startOfWeek(dateInWeek, weekOptions);
            const end = endOfWeek(dateInWeek, weekOptions);
            
            options.push({
                value: `${year}-W${w.toString().padStart(2, '0')}`,
                label: `Tuần ${w} (${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')})`
            });
        }
    }
    return options;
}