/**
 * المنطق المالي الأساسي لتطبيق الجمعية
 * كل الدوال هنا Pure Functions قابلة للاختبار بدون قاعدة بيانات
 * القاعدة: لا يمر مال عبر التطبيق إطلاقاً — هذه حسابات تتبع فقط
 */

export type CycleType = 'weekly' | 'monthly' | 'custom';

export interface GameyaConfig {
  installment: number; // القسط الثابت بالجنيه
  memberCount: number; // عدد الأعضاء = عدد الدورات
  cycleType: CycleType;
  customDays?: number; // للمدة المخصصة مثل كل 15 يوم
  startDate: Date;
}

export interface ScheduleItem {
  cycleIndex: number; // 1-based
  dueDate: Date;
  payoutAmount: number; // مبلغ القبض لهذه الدورة
}

/**
 * مبلغ القبض = القسط × عدد الأعضاء
 * مثال: 500 × 12 = 6000
 */
export function calcPayout(installment: number, memberCount: number): number {
  if (!Number.isFinite(installment) || installment <= 0) {
    throw new Error('القسط يجب أن يكون رقماً موجباً');
  }
  if (!Number.isInteger(memberCount) || memberCount < 2) {
    throw new Error('عدد الأعضاء يجب أن يكون 2 على الأقل');
  }
  return installment * memberCount;
}

/**
 * الرسوم النسبية = مبلغ القبض × النسبة
 * مثال: 6000 × 0.5% = 30
 * النسبة تُمرر ككسر عشري: 0.005 تعني 0.5%
 */
export function calcFee(payout: number, rate: number): number {
  if (payout < 0) throw new Error('مبلغ القبض لا يمكن أن يكون سالباً');
  if (rate < 0 || rate > 1) throw new Error('النسبة يجب أن تكون بين 0 و 1');
  // تقريب لأقرب قرش (رقمين عشريين)
  return Math.round(payout * rate * 100) / 100;
}

/**
 * عدد الدورات = عدد الأعضاء
 */
export function calcCycleCount(memberCount: number): number {
  return memberCount;
}

/**
 * إضافة أيام لتاريخ
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * إضافة أشهر لتاريخ مع الحفاظ على يوم الشهر قدر الإمكان
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // إذا تجاوزنا نهاية الشهر (مثل 31 يناير + شهر)، نرجع لآخر يوم
  if (d.getDate() < day) {
    d.setDate(0);
  }
  return d;
}

/**
 * توليد جدول الأقساط والقبض
 * الدورة 1 تستحق في startDate، الدورة 2 بعد فترة واحدة، إلخ
 */
export function buildSchedule(config: GameyaConfig): ScheduleItem[] {
  const payout = calcPayout(config.installment, config.memberCount);
  const count = calcCycleCount(config.memberCount);
  const items: ScheduleItem[] = [];

  for (let i = 0; i < count; i++) {
    let dueDate: Date;
    switch (config.cycleType) {
      case 'weekly':
        dueDate = addDays(config.startDate, i * 7);
        break;
      case 'monthly':
        dueDate = addMonths(config.startDate, i);
        break;
      case 'custom': {
        const days = config.customDays ?? 15;
        if (!Number.isInteger(days) || days <= 0) {
          throw new Error('عدد الأيام المخصصة يجب أن يكون رقماً صحيحاً موجباً');
        }
        dueDate = addDays(config.startDate, i * days);
        break;
      }
      default:
        throw new Error('نوع الدورة غير معروف');
    }
    items.push({ cycleIndex: i + 1, dueDate, payoutAmount: payout });
  }
  return items;
}

/**
 * خلط Fisher-Yates لقرعة ترتيب القبض
 * يقبل مولد عشوائي اختيارياً لسهولة الاختبار
 */
export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * توزيع الأدوار بالقرعة: يعيد ترتيب أ IDs الأعضاء عشوائياً
 */
export function drawOrder(memberIds: string[], random?: () => number): string[] {
  return shuffle(memberIds, random);
}

/**
 * حالة القسط بالنسبة لتاريخ اليوم وفترة السماح
 */
export type LateStatus = 'on_time' | 'grace' | 'late';

export function getLateStatus(dueDate: Date, graceDays: number, now: Date = new Date()): LateStatus {
  const diffMs = now.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'on_time';
  if (diffDays <= graceDays) return 'grace';
  return 'late';
}

/**
 * تنسيق مبلغ بالجنيه
 */
export function formatEGP(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} جنيه`;
}
