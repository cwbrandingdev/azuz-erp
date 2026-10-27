"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkHoursCalculator = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const time_clock_dates_1 = require("./time-clock-dates");
const { IN, BREAK_START, BREAK_END, OUT } = client_1.TimeClockEntryType;
const WORK_STARTS = new Set([IN, BREAK_END]);
const WORK_ENDS = new Set([BREAK_START, OUT]);
let WorkHoursCalculator = class WorkHoursCalculator {
    allowedTypes(dayEntries) {
        const lastType = dayEntries.at(-1)?.type;
        if (lastType === BREAK_START)
            return [BREAK_END];
        if (lastType === BREAK_END)
            return [OUT];
        if (lastType !== IN)
            return [IN];
        const hadBreak = dayEntries.some((entry) => entry.type === BREAK_START);
        return hadBreak ? [OUT] : [BREAK_START, OUT];
    }
    summarizeByDay(entries, now = new Date()) {
        const byDay = new Map();
        const sorted = [...entries].sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
        for (const entry of sorted) {
            const dayKey = (0, time_clock_dates_1.toSaoPauloDayKey)(entry.punchedAt);
            const dayEntries = byDay.get(dayKey) ?? [];
            dayEntries.push(entry);
            byDay.set(dayKey, dayEntries);
        }
        return [...byDay.entries()]
            .map(([date, dayEntries]) => this.summarizeDay(date, dayEntries, now))
            .sort((a, b) => b.date.localeCompare(a.date));
    }
    totalMinutes(days) {
        return days.reduce((sum, day) => sum + day.workedMinutes, 0);
    }
    summarizeDay(date, entries, now) {
        let workedMs = 0;
        let breakMs = 0;
        let workingSince = null;
        let breakSince = null;
        for (const entry of entries) {
            if (entry.type === BREAK_END && breakSince) {
                breakMs += entry.punchedAt.getTime() - breakSince.getTime();
                breakSince = null;
            }
            if (WORK_STARTS.has(entry.type)) {
                workingSince ??= entry.punchedAt;
                continue;
            }
            if (WORK_ENDS.has(entry.type) && workingSince) {
                workedMs += entry.punchedAt.getTime() - workingSince.getTime();
                workingSince = null;
            }
            if (entry.type === BREAK_START) {
                breakSince = entry.punchedAt;
            }
        }
        const isOpen = workingSince !== null || breakSince !== null;
        if (date === (0, time_clock_dates_1.toSaoPauloDayKey)(now)) {
            workedMs += this.elapsedSince(workingSince, now);
            breakMs += this.elapsedSince(breakSince, now);
        }
        return {
            date,
            workedMinutes: Math.floor(workedMs / 60_000),
            breakMinutes: Math.floor(breakMs / 60_000),
            isOpen,
            entries,
        };
    }
    elapsedSince(start, now) {
        if (!start)
            return 0;
        return Math.max(0, now.getTime() - start.getTime());
    }
};
exports.WorkHoursCalculator = WorkHoursCalculator;
exports.WorkHoursCalculator = WorkHoursCalculator = __decorate([
    (0, common_1.Injectable)()
], WorkHoursCalculator);
//# sourceMappingURL=work-hours.calculator.js.map