const ComparativoApp = {
    sortColumn: null,
    sortDirection: null,

    toggleSort(col) {
        if (this.sortColumn === col) {
            if (this.sortDirection === 'asc') this.sortDirection = 'desc';
            else if (this.sortDirection === 'desc') {
                this.sortColumn = null;
                this.sortDirection = null;
            }
        } else {
            this.sortColumn = col;
            this.sortDirection = 'asc';
        }
        this.renderTable();
    },

    init() {
        this.renderTable();
    },

    formatNumber(num) {
        return Math.round(num).toLocaleString('pt-BR');
    },

    formatCompactNumber(num) {
        if (!num || isNaN(num)) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2).replace('.', ',') + ' mi';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(0) + ' mil';
        }
        return Math.round(num).toLocaleString('pt-BR');
    },

    formatPercent(num) {
        if (!num || isNaN(num)) return '0,0%';
        return num.toFixed(1).replace('.', ',') + '%';
    },

    renderTable() {
        const container = document.getElementById('comparativo-table-container');
        if (!container) return;

        let dados = DataService.calcularComparativo2022();

        if (!dados || dados.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-500 py-10">Aguardando dados ou nenhuma pesquisa encontrada...</p>';
            return;
        }

        // Ordem alfabética padrão (Estado A-Z)
        dados.sort((a, b) => a.estado.localeCompare(b.estado));

        // Aplica ordenação se houver coluna selecionada
        if (this.sortColumn && this.sortDirection) {
            dados.sort((a, b) => {
                let valA, valB;
                if (this.sortColumn === 'pt-voto') { valA = a.percAtualPT; valB = b.percAtualPT; }
                else if (this.sortColumn === 'pt-saldo') { valA = a.saldoPT; valB = b.saldoPT; }
                else if (this.sortColumn === 'pl-voto') { valA = a.percAtualPL; valB = b.percAtualPL; }
                else if (this.sortColumn === 'pl-saldo') { valA = a.saldoPL; valB = b.saldoPL; }

                if (this.sortDirection === 'asc') return valA - valB;
                if (this.sortDirection === 'desc') return valB - valA;
                return 0;
            });
        }

        const getSortIcon = (col) => {
            if (this.sortColumn !== col) return '<span class="text-slate-300 ml-1 text-[12px]">↕</span>';
            return this.sortDirection === 'asc' 
                ? '<span class="text-slate-800 ml-1 text-[12px]">↑</span>' 
                : '<span class="text-slate-800 ml-1 text-[12px]">↓</span>';
        };

        let html = `
            <div class="overflow-x-auto pb-8 pt-4 px-2 flex justify-center">
            <table class="w-full max-w-6xl text-sm text-left border-collapse mx-auto bg-white rounded-lg shadow-sm border border-slate-200 relative">
                <thead class="sticky top-0 z-30 bg-white shadow-md outline outline-1 outline-slate-200">
                    <tr>
                        <th colspan="2" class="border-b border-slate-200 bg-slate-50"></th>
                        
                        <th colspan="2" class="px-4 py-3 text-center border-b border-slate-200 bg-red-50/50">
                            <div class="flex items-center justify-center gap-2 text-red-700 font-black uppercase tracking-wider text-sm">
                                <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Partido dos Trabalhadores
                            </div>
                        </th>
                        
                        <th class="w-1 border-b border-slate-200 bg-slate-50"></th>
                        
                        <th colspan="2" class="px-4 py-3 text-center border-b border-slate-200 bg-blue-50/50">
                            <div class="flex items-center justify-center gap-2 text-blue-700 font-black uppercase tracking-wider text-sm">
                                <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Partido Liberal
                            </div>
                        </th>
                    </tr>
                    <tr class="text-[11px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200 bg-slate-50">
                        <th class="px-5 py-4 font-bold">Estado</th>
                        <th class="px-4 py-4 text-right font-bold">Eleitores Aptos</th>
                        
                        <th class="px-4 py-4 text-center text-red-700/70 font-bold bg-red-50/20 cursor-pointer hover:bg-red-100/50 transition-colors select-none" onclick="window.ComparativoApp.toggleSort('pt-voto')">
                            Intenção de Voto (2022 ➔ 2026) ${getSortIcon('pt-voto')}
                        </th>
                        <th class="px-4 py-4 text-center text-red-700/70 font-bold bg-red-50/20 cursor-pointer hover:bg-red-100/50 transition-colors select-none" onclick="window.ComparativoApp.toggleSort('pt-saldo')">
                            Saldo Projetado ${getSortIcon('pt-saldo')}
                        </th>
                        
                        <th class="w-1 bg-slate-100"></th>
                        
                        <th class="px-4 py-4 text-center text-blue-700/70 font-bold bg-blue-50/20 cursor-pointer hover:bg-blue-100/50 transition-colors select-none" onclick="window.ComparativoApp.toggleSort('pl-voto')">
                            Intenção de Voto (2022 ➔ 2026) ${getSortIcon('pl-voto')}
                        </th>
                        <th class="px-4 py-4 text-center text-blue-700/70 font-bold bg-blue-50/20 cursor-pointer hover:bg-blue-100/50 transition-colors select-none" onclick="window.ComparativoApp.toggleSort('pl-saldo')">
                            Saldo Projetado ${getSortIcon('pl-saldo')}
                        </th>
                    </tr>
                </thead>
                <tbody class="group/table">
        `;

        dados.forEach((row) => {
            const getSaldoHtml = (val) => {
                if (val > 0) {
                    return `
                        <div class="inline-flex flex-col items-center justify-center py-1.5 px-4 rounded-lg bg-emerald-50 border border-emerald-100 shadow-sm transition-transform hover:scale-105">
                            <div class="flex items-center gap-1 text-emerald-700 font-black text-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                ${this.formatCompactNumber(val)}
                            </div>
                            <span class="text-[9px] uppercase font-extrabold text-emerald-600 tracking-widest mt-0.5">Ganho</span>
                        </div>`;
                }
                if (val < 0) {
                    return `
                        <div class="inline-flex flex-col items-center justify-center py-1.5 px-4 rounded-lg bg-rose-50 border border-rose-100 shadow-sm transition-transform hover:scale-105">
                            <div class="flex items-center gap-1 text-rose-700 font-black text-sm">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                ${this.formatCompactNumber(Math.abs(val))}
                            </div>
                            <span class="text-[9px] uppercase font-extrabold text-rose-600 tracking-widest mt-0.5">Perda</span>
                        </div>`;
                }
                return `<div class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-400 font-bold text-lg border border-slate-100">-</div>`;
            };

            html += `
                <tr class="group bg-white transition-all duration-300 border-b border-slate-200 last:border-0 group-hover/table:opacity-30 hover:!opacity-100 hover:shadow-xl hover:-translate-y-1 hover:z-10 relative cursor-default">
                    <td class="px-5 py-4 font-black text-slate-700 text-base">${row.estado}</td>
                    
                    <td class="px-4 py-4 text-right">
                        <div class="text-xs text-slate-400 font-bold">2022: ${this.formatNumber(row.eleitorado2022)}</div>
                        <div class="text-sm font-black text-slate-700 mt-0.5">2026: ${this.formatNumber(row.eleitorado2026)}</div>
                    </td>
                    
                    <!-- PT -->
                    <td class="px-4 py-4 text-center bg-red-50/20 group-hover:bg-red-50/40 transition-colors">
                        <div class="flex flex-col items-center justify-center font-bold tracking-wide">
                            <div class="flex items-center gap-2">
                                <span class="text-slate-400">${this.formatPercent(row.percBasePT2022)}</span>
                                <span class="text-red-300">➔</span>
                                <span class="text-red-600 text-[15px]">${this.formatPercent(row.percAtualPT)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                                <span>${this.formatNumber(row.votosPT2022)}</span>
                                <span class="text-slate-300">➔</span>
                                <span>${this.formatNumber(row.projetadosPT)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 text-center bg-red-50/20 group-hover:bg-red-50/40 transition-colors">
                        ${getSaldoHtml(row.saldoPT)}
                    </td>

                    <td class="w-1 bg-slate-100"></td>

                    <!-- PL -->
                    <td class="px-4 py-4 text-center bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors">
                        <div class="flex flex-col items-center justify-center font-bold tracking-wide">
                            <div class="flex items-center gap-2">
                                <span class="text-slate-400">${this.formatPercent(row.percBasePL2022)}</span>
                                <span class="text-blue-300">➔</span>
                                <span class="text-blue-600 text-[15px]">${this.formatPercent(row.percAtualPL)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mt-1">
                                <span>${this.formatNumber(row.votosPL2022)}</span>
                                <span class="text-slate-300">➔</span>
                                <span>${this.formatNumber(row.projetadosPL)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-4 text-center bg-blue-50/20 group-hover:bg-blue-50/40 transition-colors">
                        ${getSaldoHtml(row.saldoPL)}
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            </div>
        `;

        container.innerHTML = html;
    }
};

window.ComparativoApp = ComparativoApp;
