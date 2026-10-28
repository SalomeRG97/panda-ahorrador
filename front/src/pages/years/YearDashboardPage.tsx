import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api.service';
import { useToast } from '../../context/ToastContext';
import { Year, AnnualSummary, CategoryChartData } from '../../types';
import { formatCurrency } from '../../utils/formatters';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const YearDashboardPage: React.FC = () => {
  const { yearId } = useParams<{ yearId: string }>();
  const idNum = parseInt(yearId || '0', 10);

  const [yearData, setYearData] = useState<Year | null>(null);
  const [summary, setSummary] = useState<AnnualSummary | null>(null);
  const [categoryChartData, setCategoryChartData] = useState<CategoryChartData[]>([]);

  const { error } = useToast();

  useEffect(() => {
    if (!idNum) return;

    ApiService.getYearById(idNum)
      .then(setYearData)
      .catch((err) => error(err.response?.data?.message || 'Error al cargar datos del año'));

    ApiService.getAnnualSummary(idNum)
      .then(setSummary)
      .catch((err) => error(err.response?.data?.message || 'Error al cargar resumen anual'));

    ApiService.getAnnualCategoryCharts(idNum)
      .then(setCategoryChartData)
      .catch((err) => console.error('Error al cargar gráficos por categoría:', err));
  }, [idNum]);

  if (!yearData) {
    return (
      <div className="dashboard-container animate-fade-in-up" style={{ textAlign: 'center', paddingTop: '50px' }}>
        <p><i className="fa-solid fa-spinner fa-spin"></i> Cargando dashboard anual...</p>
      </div>
    );
  }

  // Data for main Bar Chart (Evolution)
  const barChartLabels = summary?.months.map((m) => m.monthName) || [];
  const barChartData = {
    labels: barChartLabels,
    datasets: [
      {
        label: 'Ingresos',
        data: summary?.months.map((m) => m.income) || [],
        backgroundColor: '#4E9F76',
      },
      {
        label: 'Gastos Total',
        data: summary?.months.map((m) => m.expenses) || [],
        backgroundColor: '#D4566A',
      },
      {
        label: 'Ahorros',
        data: summary?.months.map((m) => m.savings) || [],
        backgroundColor: '#F4C430',
      },
      {
        label: 'Gastos Fijos',
        data: summary?.months.map((m) => m.fixed) || [],
        backgroundColor: '#5A82E6',
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
  };

  // Data for Doughnut Chart (Categories)
  const doughnutLabels = categoryChartData.map((c) => c.categoryName);
  const doughnutValues = categoryChartData.map((c) => (c.monthlyData || []).reduce((sum, val) => sum + val, 0));
  const doughnutBgColors = categoryChartData.map((c) => c.categoryColor);

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutValues,
        backgroundColor: doughnutBgColors,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const },
    },
  };

  return (
    <div className="dashboard-container animate-fade-in-up">
      {/* ENCABEZADO */}
      <div className="dashboard-header card-pastel">
        <div>
          <span className="chinese-title">年度仪表板</span>
          <h1>Dashboard Anual {yearData.year}</h1>
          <p className="subtitle">Resumen consolidado, gráficos de evolución y accesos directos a cada mes.</p>
        </div>
        <Link to="/years" className="btn-pastel btn-secondary-pastel">
          <i className="fa-solid fa-arrow-left"></i> Volver a Años
        </Link>
      </div>

      {/* CARDS METRICAS GENERALES */}
      {summary && (
        <div className="metrics-grid">
          <div className="metric-card card-pastel bg-ingresos">
            <span className="metric-icon">💰</span>
            <div className="metric-info">
              <span className="metric-label">Total Ingresos</span>
              <span className="metric-value">{formatCurrency(summary.totals.income)}</span>
            </div>
          </div>
          <div className="metric-card card-pastel bg-gastos">
            <span className="metric-icon">💸</span>
            <div className="metric-info">
              <span className="metric-label">Total Gastos</span>
              <span className="metric-value">{formatCurrency(summary.totals.expenses)}</span>
            </div>
          </div>
          <div className="metric-card card-pastel bg-ahorros">
            <span className="metric-icon">🪙</span>
            <div className="metric-info">
              <span className="metric-label">Total Ahorros</span>
              <span className="metric-value">{formatCurrency(summary.totals.savings)}</span>
            </div>
          </div>
          <div className="metric-card card-pastel bg-fijos">
            <span className="metric-icon">📌</span>
            <div className="metric-info">
              <span className="metric-label">Total Fijos</span>
              <span className="metric-value">{formatCurrency(summary.totals.fixed)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TABLA RESUMEN ANUAL */}
      <section className="summary-table-section card-pastel">
        <div className="chinese-title-wrapper">
          <h2>Tabla Resumen Anual</h2>
        </div>
        <div className="table-responsive">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Concepto</th>
                {summary?.months.map((m) => (
                  <th key={m.monthId}>{m.monthName}</th>
                ))}
                <th className="total-col">TOTAL ANUAL</th>
              </tr>
            </thead>
            <tbody>
              {/* INGRESOS */}
              <tr className="row-ingresos">
                <td className="concept-cell">
                  <span className="badge-concept-ingreso badge-category">💰 Ingresos</span>
                </td>
                {summary?.months.map((m) => (
                  <td key={m.monthId}>{formatCurrency(m.income)}</td>
                ))}
                <td className="total-col">{formatCurrency(summary?.totals?.income)}</td>
              </tr>
              {/* GASTOS */}
              <tr className="row-gastos">
                <td className="concept-cell">
                  <span className="badge-concept-gasto badge-category">💸 Gastos</span>
                </td>
                {summary?.months.map((m) => (
                  <td key={m.monthId}>{formatCurrency(m.expenses)}</td>
                ))}
                <td className="total-col">{formatCurrency(summary?.totals?.expenses)}</td>
              </tr>
              {/* AHORROS */}
              <tr className="row-ahorros">
                <td className="concept-cell">
                  <span className="badge-concept-ahorro badge-category">🪙 Ahorros</span>
                </td>
                {summary?.months.map((m) => (
                  <td key={m.monthId}>{formatCurrency(m.savings)}</td>
                ))}
                <td className="total-col">{formatCurrency(summary?.totals?.savings)}</td>
              </tr>
              {/* FIJOS */}
              <tr className="row-fijos">
                <td className="concept-cell">
                  <span className="badge-concept-fijo badge-category">📌 Gastos Fijos</span>
                </td>
                {summary?.months.map((m) => (
                  <td key={m.monthId}>{formatCurrency(m.fixed)}</td>
                ))}
                <td className="total-col">{formatCurrency(summary?.totals?.fixed)}</td>
              </tr>
              {/* RESTANTE */}
              <tr className="row-restante">
                <td className="concept-cell">
                  <span className="badge-category" style={{ background: '#A8D8EA', color: '#1E4B5E' }}>
                    ⚖️ Restante
                  </span>
                </td>
                {summary?.months.map((m) => (
                  <td key={m.monthId} className={m.remaining < 0 ? 'negative' : ''}>
                    {formatCurrency(m.remaining)}
                  </td>
                ))}
                <td className={`total-col ${(summary?.totals?.remaining || 0) < 0 ? 'negative' : ''}`}>
                  {formatCurrency(summary?.totals?.remaining)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* GRÁFICOS FINANCIEROS */}
      <section className="charts-grid">
        <div className="chart-card card-pastel">
          <h3>Evolución Anual (Ingresos vs Gastos vs Ahorros vs Fijos)</h3>
          <div className="chart-wrapper">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        <div className="chart-card card-pastel">
          <h3>Distribución de Gastos por Categoría</h3>
          <div className="chart-wrapper">
            {doughnutValues.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <p style={{ textAlign: 'center', color: '#888', marginTop: '100px' }}>No hay gastos registrados para este año.</p>
            )}
          </div>
        </div>
      </section>

      {/* ACCESOS A CADA MES */}
      <section className="months-access-section">
        <div className="chinese-title-wrapper">
          <h2>Meses de {yearData.year}</h2>
        </div>
        <div className="months-grid">
          {yearData.months?.map((m) => (
            <Link key={m.id} to={`/years/${yearData.id}/months/${m.id}`} className="month-card card-pastel">
              <div className="month-card-header">
                <span className="month-number-badge">{m.month_number}</span>
                <h3 className="month-title">{m.month_name}</h3>
              </div>
              <p className="click-text">
                <i className="fa-solid fa-folder-open"></i> Ver Agenda del Mes
              </p>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .dashboard-container { max-width: 1200px; margin: 30px auto; padding: 0 20px; display: flex; flex-direction: column; gap: 30px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .metric-card { display: flex; align-items: center; gap: 16px; padding: 20px; }
        .metric-icon { font-size: 2.2rem; }
        .metric-info { display: flex; flex-direction: column; }
        .metric-label { font-size: 0.85rem; color: #665275; font-weight: 600; }
        .metric-value { font-size: 1.4rem; font-weight: 700; color: #333; }
        .bg-ingresos { background: #EAF6F0; border-left: 6px solid #4E9F76; }
        .bg-gastos { background: #FDEEF4; border-left: 6px solid #D4566A; }
        .bg-ahorros { background: #FFF9EB; border-left: 6px solid #F4C430; }
        .bg-fijos { background: #F0F4FF; border-left: 6px solid #5A82E6; }
        .summary-table-section { display: flex; flex-direction: column; gap: 16px; }
        .summary-table { width: 100%; border-collapse: collapse; min-width: 750px; }
        .summary-table th, .summary-table td { padding: 12px; text-align: right; border-bottom: 1px solid #FFF0F4; font-size: 0.9rem; }
        .summary-table th { background: #FFF0F4; color: #4A3F55; text-align: right; }
        .summary-table th:first-child, .summary-table td:first-child { text-align: left; }
        .concept-cell { font-weight: 600; }
        .total-col { font-weight: 700; background: #FFF0F4; }
        .negative { color: #D4566A; font-weight: 700; }
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
        .chart-card { padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
        .chart-wrapper { position: relative; height: 320px; width: 100%; }
        .months-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
        .month-card { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 12px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .month-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(212, 86, 106, 0.15); }
        .month-card-header { display: flex; align-items: center; gap: 12px; }
        .month-number-badge { background: #D4566A; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; }
        .month-title { margin: 0; font-size: 1.2rem; }
        .click-text { font-size: 0.85rem; color: #D4566A; font-weight: 600; margin: 0; }

        @media (max-width: 768px) {
          .dashboard-container { margin: 16px auto; padding: 0 12px; gap: 20px; }
          .dashboard-header { flex-direction: column; text-align: center; }
          .metrics-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
          .metric-card { padding: 14px; gap: 10px; }
          .metric-icon { font-size: 1.8rem; }
          .metric-value { font-size: 1.15rem; }
          .chart-wrapper { height: 260px; }
          .months-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        }
      `}</style>
    </div>
  );
};
