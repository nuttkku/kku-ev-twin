/**
 * KST EV Contract Data — Real service records from KKU
 * Source: สรุปช้อมูลการบริหารสัญญา KST EV.xlsx (extracted 2026-02-26)
 * Contract: 25 EV buses, 60 months (FY2564-2569 / Jun 2022 - May 2027)
 * Monthly payment: 2,416,500 THB | Total: 144,990,000 THB
 * TOR budget: 165,600,000 THB | Savings vs TOR: ~12.5%
 */

// Contract metadata
const CONTRACT = {
  buses: 25,
  monthlyTHB: 2416500,
  totalTHB: 144990000,
  torBudgetTHB: 165600000,
  months: 60,
  startDate: '2022-06-01',
  endDate: '2027-05-31',
  dailyCostTHB: 80550, // 2,416,500 / 30 days
  vendor: 'KST EV (Lotte Rent-A-Car Thailand)',
};

// Monthly service records (งวด 1-39, Jun 2022 - Aug 2025)
const MONTHLY_RECORDS = [
  { period:1,  date:'2022-06-01', paxPerDay:8465.63,  defects:29, maintenance:0,  specialBuses:26, specialKm:1288.0,  specialPax:3380,  complaints:'ขับขี่รถประมาทหวาดเสียว',                       lostFound:1,  accidentCount:1, suggestions:'ป้ายหน้ารถมองเห็นสีไม่ชัดเจน, แสดงเบอร์รถควรเรียงตามตัวเลข' },
  { period:2,  date:'2022-07-01', paxPerDay:9605.72,  defects:2,  maintenance:0,  specialBuses:37, specialKm:286.0,   specialPax:847,   complaints:'-',                                              lostFound:0,  accidentCount:1, suggestions:'-' },
  { period:3,  date:'2022-08-01', paxPerDay:8006.20,  defects:2,  maintenance:0,  specialBuses:6,  specialKm:28.0,    specialPax:185,   complaints:'-',                                              lostFound:5,  accidentCount:1, suggestions:'-' },
  { period:4,  date:'2022-09-01', paxPerDay:8791.86,  defects:0,  maintenance:0,  specialBuses:2,  specialKm:6.0,     specialPax:50,    complaints:'-',                                              lostFound:4,  accidentCount:2, suggestions:'' },
  { period:5,  date:'2022-10-01', paxPerDay:8653.00,  defects:0,  maintenance:0,  specialBuses:10, specialKm:220.0,   specialPax:200,   complaints:'-',                                              lostFound:7,  accidentCount:0, suggestions:'-' },
  { period:6,  date:'2022-11-01', paxPerDay:8045.00,  defects:0,  maintenance:0,  specialBuses:10, specialKm:120.8,   specialPax:190,   complaints:'-',                                              lostFound:9,  accidentCount:0, suggestions:'รถสายสีแดงมีผู้ใช้บริการมาก ขอเพิ่มเส้นทาง' },
  { period:7,  date:'2022-12-01', paxPerDay:8250.00,  defects:0,  maintenance:3,  specialBuses:61, specialKm:1406.2,  specialPax:4675,  complaints:'-',                                              lostFound:3,  accidentCount:0, suggestions:'-' },
  { period:8,  date:'2023-01-01', paxPerDay:8465.63,  defects:0,  maintenance:5,  specialBuses:66, specialKm:1593.0,  specialPax:3780,  complaints:'-',                                              lostFound:9,  accidentCount:0, suggestions:'-' },
  { period:9,  date:'2023-02-01', paxPerDay:9605.72,  defects:0,  maintenance:6,  specialBuses:8,  specialKm:42.0,    specialPax:280,   complaints:'พนักงานขับรถใช้อารมณ์ ไม่จอดตรงป้าย',            lostFound:7,  accidentCount:1, suggestions:'-' },
  { period:10, date:'2023-03-01', paxPerDay:9665.27,  defects:0,  maintenance:4,  specialBuses:73, specialKm:682.5,   specialPax:2749,  complaints:'-',                                              lostFound:10, accidentCount:0, suggestions:'-' },
  { period:11, date:'2023-04-01', paxPerDay:10816.67, defects:2,  maintenance:0,  specialBuses:17, specialKm:111.9,   specialPax:600,   complaints:'-',                                              lostFound:11, accidentCount:0, suggestions:'-' },
  { period:12, date:'2023-05-01', paxPerDay:8054.00,  defects:0,  maintenance:0,  specialBuses:18, specialKm:152.0,   specialPax:510,   complaints:'-',                                              lostFound:5,  accidentCount:0, suggestions:'-' },
  { period:13, date:'2023-06-01', paxPerDay:7654.23,  defects:1,  maintenance:4,  specialBuses:48, specialKm:882.1,   specialPax:3300,  complaints:'พนักงานพูดจารุนแรง ปิดประตูก่อนผู้โดยสารขึ้น',   lostFound:6,  accidentCount:0, suggestions:'-' },
  { period:14, date:'2023-07-01', paxPerDay:9687.65,  defects:0,  maintenance:5,  specialBuses:54, specialKm:799.4,   specialPax:1410,  complaints:'-',                                              lostFound:14, accidentCount:1, suggestions:'-' },
  { period:15, date:'2023-08-01', paxPerDay:16654.32, defects:0,  maintenance:12, specialBuses:9,  specialKm:109.0,   specialPax:200,   complaints:'-',                                              lostFound:10, accidentCount:2, suggestions:'-' },
  { period:16, date:'2023-09-01', paxPerDay:18453.23, defects:0,  maintenance:0,  specialBuses:9,  specialKm:59.7,    specialPax:140,   complaints:'ขับรถเร็ว ไม่รอผู้โดยสารนั่งก่อนออกรถ',           lostFound:10, accidentCount:0, suggestions:'-' },
  { period:17, date:'2023-10-01', paxPerDay:15654.33, defects:0,  maintenance:0,  specialBuses:10, specialKm:61.6,    specialPax:160,   complaints:'-',                                              lostFound:3,  accidentCount:0, suggestions:'-' },
  { period:18, date:'2023-11-01', paxPerDay:9695.56,  defects:0,  maintenance:5,  specialBuses:8,  specialKm:240.52,  specialPax:125,   complaints:'พนักงานพูดจาคุกคามผู้โดยสารหญิง',                lostFound:6,  accidentCount:0, suggestions:'-' },
  { period:19, date:'2023-12-01', paxPerDay:12560.66, defects:0,  maintenance:0,  specialBuses:59, specialKm:318.0,   specialPax:345,   complaints:'-',                                              lostFound:7,  accidentCount:0, suggestions:'-' },
  { period:20, date:'2024-01-01', paxPerDay:11620.03, defects:0,  maintenance:0,  specialBuses:86, specialKm:1059.1,  specialPax:4026,  complaints:'ขับรถเร็ว คุยโทรศัพท์ขณะขับรถ',                  lostFound:9,  accidentCount:0, suggestions:'-' },
  { period:21, date:'2024-02-01', paxPerDay:12345.45, defects:0,  maintenance:0,  specialBuses:29, specialKm:359.3,   specialPax:823,   complaints:'-',                                              lostFound:5,  accidentCount:0, suggestions:'-' },
  { period:22, date:'2024-03-01', paxPerDay:13482.55, defects:1,  maintenance:0,  specialBuses:17, specialKm:388.5,   specialPax:530,   complaints:'พูดจาไม่สุภาพ ขับไม่เบรกสัญญาณไฟเหลือง',          lostFound:5,  accidentCount:1, suggestions:'' },
  { period:23, date:'2024-04-01', paxPerDay:9852.46,  defects:0,  maintenance:0,  specialBuses:31, specialKm:238.4,   specialPax:580,   complaints:'-',                                              lostFound:6,  accidentCount:0, suggestions:'-' },
  { period:24, date:'2024-05-01', paxPerDay:9800.00,  defects:0,  maintenance:0,  specialBuses:20, specialKm:201.0,   specialPax:920,   complaints:'-',                                              lostFound:5,  accidentCount:0, suggestions:'-' },
  { period:25, date:'2024-06-01', paxPerDay:15000.00, defects:0,  maintenance:0,  specialBuses:65, specialKm:753.4,   specialPax:5895,  complaints:'ออกรถขณะผู้โดยสารนั่งไม่เรียบร้อย',               lostFound:14, accidentCount:0, suggestions:'-' },
  { period:26, date:'2024-07-01', paxPerDay:16000.00, defects:0,  maintenance:9,  specialBuses:22, specialKm:619.3,   specialPax:1596,  complaints:'รถแซงเส้นทึบที่สี่แยกไฟแดง',                     lostFound:16, accidentCount:0, suggestions:'-' },
  { period:27, date:'2024-08-01', paxPerDay:18000.00, defects:0,  maintenance:16, specialBuses:30, specialKm:314.8,   specialPax:789,   complaints:'-',                                              lostFound:11, accidentCount:2, suggestions:'-' },
  { period:28, date:'2024-09-01', paxPerDay:19000.00, defects:0,  maintenance:0,  specialBuses:15, specialKm:77.2,    specialPax:440,   complaints:'-',                                              lostFound:12, accidentCount:0, suggestions:'-' },
  { period:29, date:'2024-10-01', paxPerDay:17000.00, defects:0,  maintenance:0,  specialBuses:19, specialKm:108.3,   specialPax:3952,  complaints:'-',                                              lostFound:5,  accidentCount:0, suggestions:'-' },
  { period:30, date:'2024-11-01', paxPerDay:19000.00, defects:0,  maintenance:0,  specialBuses:34, specialKm:1224.7,  specialPax:1466,  complaints:'-',                                              lostFound:8,  accidentCount:0, suggestions:'-' },
  { period:31, date:'2024-12-01', paxPerDay:18000.00, defects:0,  maintenance:0,  specialBuses:61, specialKm:199.5,   specialPax:272,   complaints:'พนักงานสายสีแดงไม่จอดรับผู้โดยสาร',               lostFound:4,  accidentCount:0, suggestions:'-' },
  { period:32, date:'2025-01-01', paxPerDay:18600.00, defects:0,  maintenance:0,  specialBuses:45, specialKm:439.0,   specialPax:1890,  complaints:'-',                                              lostFound:3,  accidentCount:1, suggestions:'-' },
  { period:33, date:'2025-02-01', paxPerDay:19000.00, defects:0,  maintenance:3,  specialBuses:15, specialKm:235.0,   specialPax:1064,  complaints:'ร้องเรียนขับรถเร็ว แซงในที่คับขัน (สายสีน้ำเงิน)', lostFound:6, accidentCount:0, suggestions:'-' },
  { period:34, date:'2025-03-01', paxPerDay:19600.00, defects:0,  maintenance:7,  specialBuses:25, specialKm:1615.0,  specialPax:165,   complaints:'-',                                              lostFound:7,  accidentCount:1, suggestions:'-' },
  { period:35, date:'2025-04-01', paxPerDay:15900.00, defects:0,  maintenance:9,  specialBuses:43, specialKm:923.8,   specialPax:689,   complaints:'พนักงานสายสีน้ำเงินไม่จอดรับผู้โดยสาร',            lostFound:2,  accidentCount:2, suggestions:'-' },
  { period:36, date:'2025-05-01', paxPerDay:15000.00, defects:0,  maintenance:0,  specialBuses:4,  specialKm:26.5,    specialPax:30,    complaints:'รถสายสีเหลืองขับออกจากหอพักด้วยความเร็วสูง',       lostFound:2,  accidentCount:0, suggestions:'-' },
  { period:37, date:'2025-06-01', paxPerDay:15000.00, defects:0,  maintenance:0,  specialBuses:45, specialKm:717.8,   specialPax:3011,  complaints:'-',                                              lostFound:13, accidentCount:0, suggestions:'-' },
  { period:38, date:'2025-07-01', paxPerDay:16200.00, defects:0,  maintenance:6,  specialBuses:19, specialKm:464.0,   specialPax:2880,  complaints:'-',                                              lostFound:6,  accidentCount:0, suggestions:'-' },
  { period:39, date:'2025-08-01', paxPerDay:16000.00, defects:0,  maintenance:0,  specialBuses:7,  specialKm:328.0,   specialPax:590,   complaints:'-',                                              lostFound:9,  accidentCount:0, suggestions:'' },
];

// Derived aggregates
const totalPeriods = MONTHLY_RECORDS.length;
const totalPax = Math.round(MONTHLY_RECORDS.reduce((s, r) => s + r.paxPerDay * 30, 0));
const avgPaxPerDay = Math.round(MONTHLY_RECORDS.reduce((s, r) => s + r.paxPerDay, 0) / totalPeriods);
const peakPaxPerDay = Math.max(...MONTHLY_RECORDS.map(r => r.paxPerDay));
const totalAccidents = MONTHLY_RECORDS.reduce((s, r) => s + r.accidentCount, 0);
const totalLostFound = MONTHLY_RECORDS.reduce((s, r) => s + r.lostFound, 0);
const monthsWithComplaints = MONTHLY_RECORDS.filter(r => r.complaints && r.complaints !== '-').length;
const costPerPax = +(CONTRACT.dailyCostTHB / avgPaxPerDay).toFixed(2);
const totalSpecialKm = +MONTHLY_RECORDS.reduce((s, r) => s + r.specialKm, 0).toFixed(1);
const totalSpecialPax = MONTHLY_RECORDS.reduce((s, r) => s + (typeof r.specialPax === 'number' ? r.specialPax : 0), 0);

const SUMMARY = {
  totalPeriods,
  totalPax,
  avgPaxPerDay,
  peakPaxPerDay,
  totalAccidents,
  totalLostFound,
  monthsWithComplaints,
  costPerPaxTHB: costPerPax,
  totalSpecialKm,
  totalSpecialPax,
};

module.exports = { CONTRACT, MONTHLY_RECORDS, SUMMARY };
