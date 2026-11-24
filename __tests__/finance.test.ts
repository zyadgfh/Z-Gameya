import {
  calcPayout,
  calcFee,
  calcCycleCount,
  buildSchedule,
  shuffle,
  drawOrder,
  getLateStatus,
} from '../src/lib/finance';

describe('calcPayout — مبلغ القبض', () => {
  it('500 × 12 = 6000 (المثال من الخارطة)', () => {
    expect(calcPayout(500, 12)).toBe(6000);
  });
  it('يرمي خطأ عند قسط صفر أو سالب', () => {
    expect(() => calcPayout(0, 12)).toThrow();
    expect(() => calcPayout(-100, 12)).toThrow();
  });
  it('يرمي خطأ عند عضو واحد فقط', () => {
    expect(() => calcPayout(500, 1)).toThrow();
  });
});

describe('calcFee — الرسوم النسبية', () => {
  it('6000 × 0.5% = 30 (المثال من الخارطة)', () => {
    expect(calcFee(6000, 0.005)).toBe(30);
  });
  it('يقرب لأقرب قرش', () => {
    expect(calcFee(333, 0.005)).toBe(1.67); // 1.665 → 1.67
  });
  it('نسبة صفر = صفر', () => {
    expect(calcFee(6000, 0)).toBe(0);
  });
  it('يرمي خطأ عند نسبة خارج 0..1', () => {
    expect(() => calcFee(6000, 1.5)).toThrow();
  });
});

describe('calcCycleCount', () => {
  it('عدد الدورات = عدد الأعضاء', () => {
    expect(calcCycleCount(12)).toBe(12);
  });
});

describe('buildSchedule — جدول الأقساط', () => {
  const start = new Date('2026-12-01T00:00:00');

  it('شهري: 12 عضواً = 12 دورة شهرية', () => {
    const s = buildSchedule({ installment: 500, memberCount: 12, cycleType: 'monthly', startDate: start });
    expect(s).toHaveLength(12);
    expect(s[0].dueDate.toISOString().slice(0, 10)).toBe('2026-12-01');
    expect(s[1].dueDate.toISOString().slice(0, 10)).toBe('2027-01-01');
    expect(s[11].dueDate.toISOString().slice(0, 10)).toBe('2027-11-01');
    expect(s.every((x) => x.payoutAmount === 6000)).toBe(true);
  });

  it('أسبوعي: كل 7 أيام', () => {
    const s = buildSchedule({ installment: 100, memberCount: 4, cycleType: 'weekly', startDate: start });
    expect(s[1].dueDate.toISOString().slice(0, 10)).toBe('2026-12-08');
    expect(s[3].dueDate.toISOString().slice(0, 10)).toBe('2026-12-22');
  });

  it('مخصص: كل 15 يوماً', () => {
    const s = buildSchedule({ installment: 200, memberCount: 3, cycleType: 'custom', customDays: 15, startDate: start });
    expect(s[1].dueDate.toISOString().slice(0, 10)).toBe('2026-12-16');
    expect(s[2].dueDate.toISOString().slice(0, 10)).toBe('2026-12-31');
  });

  it('يناير 31 + شهر لا يفيض', () => {
    const s = buildSchedule({ installment: 100, memberCount: 2, cycleType: 'monthly', startDate: new Date('2027-01-31T00:00:00') });
    expect(s[1].dueDate.getMonth()).toBe(1); // فبراير
    expect(s[1].dueDate.getDate()).toBe(28); // 2027 ليست كبيسة
  });
});

describe('shuffle / drawOrder — القرعة', () => {
  it('يحافظ على نفس العناصر', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const out = drawOrder(ids, () => 0.5);
    expect([...out].sort()).toEqual([...ids].sort());
  });
  it('لا يعدل المصفوفة الأصلية', () => {
    const ids = ['a', 'b', 'c'];
    shuffle(ids, () => 0);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('getLateStatus — التأخير', () => {
  const due = new Date('2026-12-01T12:00:00');
  it('قبل الاستحقاق = on_time', () => {
    expect(getLateStatus(due, 3, new Date('2026-11-30'))).toBe('on_time');
  });
  it('ضمن السماح = grace', () => {
    expect(getLateStatus(due, 3, new Date('2026-12-03'))).toBe('grace');
  });
  it('بعد السماح = late', () => {
    expect(getLateStatus(due, 3, new Date('2026-12-06T12:00:00'))).toBe('late');
  });
});
