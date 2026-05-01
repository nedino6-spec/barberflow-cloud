import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Calendar, Filter, Download, ArrowUpRight, ArrowDownRight, Briefcase, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { apiFetch } from '../api';
import toast from 'react-hot-toast';

export default function Financeiro() {
    const [stats, setStats] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [summary, setSummary] = useState({ received: 0, debt: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // Pegar estatísticas do ano para o gráfico
            const statsRes = await apiFetch(`/api/financial/stats?year=${year}`);
            const statsData = await statsRes.json();
            
            if (Array.isArray(statsData)) {
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const formattedStats = statsData
                    .filter(s => s && s.month)
                    .map(s => {
                        const mIdx = parseInt(s.month) - 1;
                        return {
                            name: monthNames[mIdx] || `Mês ${s.month}`,
                            recebido: Number(s.total_received) || 0,
                            devedor: Number(s.total_debt) || 0
                        };
                    });
                setStats(formattedStats);
            } else {
                setStats([]);
            }

            const transRes = await apiFetch(`/api/financial/transactions?month=${month}&year=${year}`);
            const transData = await transRes.json();
            
            if (Array.isArray(transData)) {
                setTransactions(transData);
                let rec = 0, dbt = 0;
                transData.forEach(t => {
                    if (t) {
                        rec += Number(t.amount_paid) || 0;
                        dbt += Number(t.debt_added) || 0;
                    }
                });
                setSummary({ received: rec, debt: dbt, total: rec + dbt });
            } else {
                setTransactions([]);
                setSummary({ received: 0, debt: 0, total: 0 });
            }

        } catch (e) {
            console.error(e);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, [year, month]);

    const formatCurrency = (val) => {
        try {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        } catch (e) {
            return `R$ ${(val || 0).toFixed(2)}`;
        }
    };

    if (loading) {
        return (
            <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spin-animation-slow" style={{ color: 'var(--primary)', textAlign: 'center' }}>
                    <Filter size={40} />
                    <p style={{ marginTop: '10px' }}>Carregando dados financeiros...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <header className="card-header">
                <div>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp className="text-gold" /> Fechamento Financeiro
                    </h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Relatórios detalhados de faturamento e pendências</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select className="form-control" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                        {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                    <select className="form-control" value={year} onChange={e => setYear(parseInt(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </header>

            {/* Cards de Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Recebido no Mês</span>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--success)' }}>
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: 0 }}>{formatCurrency(summary.received)}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={14} /> Total em caixa
                    </p>
                </div>

                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Saldo Devedor (Fiado)</span>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--warning)' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: 0 }}>{formatCurrency(summary.debt)}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> Aguardando pagamento
                    </p>
                </div>

                <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Total de Serviços</span>
                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}>
                            <Briefcase size={20} />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '2rem', margin: 0 }}>{formatCurrency(summary.total)}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Volume total bruto
                    </p>
                </div>
            </div>

            {/* Gráfico de Desempenho Anual */}
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Desempenho Mensal ({year})</h3>
                <div style={{ height: '300px' }}>
                    {stats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" />
                                <YAxis stroke="var(--text-muted)" />
                                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="recebido" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="devedor" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Sem dados gráficos para o ano de {year}.
                        </div>
                    )}
                </div>
            </div>

            {/* Tabela Detalhada */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="card-header" style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Extrato Detalhado do Mês</h3>
                    <button className="btn-glass" style={{ gap: '8px' }} onClick={() => window.print()}>
                        <Download size={16} /> Imprimir / PDF
                    </button>
                </div>
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '12px' }}>Data</th>
                                <th style={{ padding: '12px' }}>Cliente</th>
                                <th style={{ padding: '12px' }}>Serviço</th>
                                <th style={{ padding: '12px' }}>Método</th>
                                <th style={{ padding: '12px' }}>Total</th>
                                <th style={{ padding: '12px' }}>Pago</th>
                                <th style={{ padding: '12px' }}>Restante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!transactions || transactions.length === 0) ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                            <Filter size={30} opacity={0.3} />
                                            Nenhuma transação registrada neste período.
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t, idx) => (
                                    <tr key={t?.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px' }}>{t?.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td style={{ padding: '12px' }}>{t?.client_name || 'Desconhecido'}</td>
                                        <td style={{ padding: '12px' }}>{t?.service_name || '-'}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{t?.payment_method || 'Outro'}</span>
                                        </td>
                                        <td style={{ padding: '12px' }}>{formatCurrency(t?.amount)}</td>
                                        <td style={{ padding: '12px', color: 'var(--success)' }}>{formatCurrency(t?.amount_paid)}</td>
                                        <td style={{ padding: '12px', color: (t?.debt_added > 0) ? 'var(--warning)' : 'inherit' }}>
                                            {(t?.debt_added > 0) ? formatCurrency(t.debt_added) : 'Quitado'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}
