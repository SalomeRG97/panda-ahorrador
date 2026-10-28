const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonthName(monthNumber) {
  return MONTH_NAMES[monthNumber - 1] || '';
}

function getDaysInMonth(year, monthNumber) {
  return new Date(year, monthNumber, 0).getDate();
}

function calculateWeeksForMonth(year, monthNumber) {
  const daysInMonth = getDaysInMonth(year, monthNumber);
  const weeks = [];
  let currentDay = 1;
  let weekNumber = 1;

  while (currentDay <= daysInMonth) {
    const dateObj = new Date(year, monthNumber - 1, currentDay);
    const dayOfWeek = dateObj.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
    const daysUntilSaturday = 6 - dayOfWeek;
    const endDay = Math.min(currentDay + daysUntilSaturday, daysInMonth);

    const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    const endDate = `${year}-${String(monthNumber).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

    weeks.push({
      week_number: weekNumber,
      start_date: startDate,
      end_date: endDate
    });

    currentDay = endDay + 1;
    weekNumber++;
  }

  return weeks;
}

function getCurrentWeekRange(referenceDate = new Date()) {
  let d;
  try {
    const bogotaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(referenceDate);
    const [y, m, day] = bogotaStr.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } catch (e) {
    d = new Date(referenceDate);
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = d.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb

  // Fin de la semana: domingo (o sábado según el ciclo)
  const daysUntilSaturday = 6 - dayOfWeek;
  const satDate = new Date(year, month - 1, day + daysUntilSaturday);
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunDate = new Date(year, month - 1, day + daysUntilSunday);

  // Inicio de semana (lunes o domingo)
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayDate = new Date(year, month - 1, day - daysSinceMonday);

  const formatYMD = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  return {
    today: formatYMD(d),
    startOfWeek: formatYMD(mondayDate),
    endOfWeekSaturday: formatYMD(satDate),
    endOfWeekSunday: formatYMD(sunDate)
  };
}

module.exports = {
  MONTH_NAMES,
  getMonthName,
  getDaysInMonth,
  calculateWeeksForMonth,
  getCurrentWeekRange
};
