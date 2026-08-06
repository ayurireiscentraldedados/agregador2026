const PresidenciaApp = {
    chartInstance: null,
    ocultos: new Set(), // nomes das séries que o usuário escondeu manualmente

    init() {
        this.popularSelectTurno();
        this.popularSelectInstituto();
        this.configurarEventos();
        setTimeout(() => this.atualizarGrafico(), 100);
    },

    popularSelectTurno() {
        const selectTurno = document.getElementById('select-turno');

        let turnos = [];
        if (typeof DataService.getTurnos === 'function') {
            turnos = DataService.getTurnos();
        } else {
            const baseDados = DataService.dadosPresidencia || [];
            turnos = [...new Set(baseDados.map(d => d.turno).filter(Boolean))].sort();
        }

        selectTurno.innerHTML = '';
        if (turnos.length === 0) return;
        turnos.forEach(turno => {
            const option = document.createElement('option');
            option.value = turno;
            option.textContent = turno + "º Turno";
            selectTurno.appendChild(option);
        });
        this.popularSelectCenario();
    },

    popularSelectCenario() {
        const selectTurno = document.getElementById('select-turno');
        const selectCenario = document.getElementById('select-cenario');
        const turnoSelecionado = selectTurno.value;

        let cenarios = [];
        if (typeof DataService.getCenariosPorTurno === 'function') {
            cenarios = DataService.getCenariosPorTurno(turnoSelecionado);
        } else {
            const baseDados = DataService.dadosPresidencia || [];
            const dadosTurno = baseDados.filter(d => String(d.turno) === String(turnoSelecionado));
            cenarios = [...new Set(dadosTurno.map(d => d.cenario))];
        }

        cenarios = cenarios.filter(c => c && typeof c === 'string' && !c.toLowerCase().includes('avaliação'));

        selectCenario.innerHTML = '';
        cenarios.forEach(cenario => {
            const option = document.createElement('option');
            option.value = cenario;
            option.textContent = cenario;
            selectCenario.appendChild(option);
        });
    },

    popularSelectInstituto() {
        const selectInstituto = document.getElementById('select-instituto');

        let institutos = [];
        if (typeof DataService.getInstitutos === 'function') {
            institutos = DataService.getInstitutos();
        } else {
            const baseDados = DataService.dadosPresidencia || [];
            institutos = [...new Set(baseDados.map(d => d.instituto).filter(Boolean))].sort();
        }

        selectInstituto.innerHTML = '<option value="Todos">Todos os institutos</option>';
        institutos.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            selectInstituto.appendChild(option);
        });
    },

    configurarEventos() {
        document.getElementById('select-turno').addEventListener('change', () => {
            this.ocultos.clear();
            this.popularSelectCenario();
            this.atualizarGrafico();
        });
        document.getElementById('select-cenario').addEventListener('change', () => this.atualizarGrafico());
        document.getElementById('select-instituto').addEventListener('change', () => {
            this.ocultos.clear();
            this.atualizarGrafico();
        });
    },

    atualizarGrafico() {
        const turno = document.getElementById('select-turno').value;
        const cenario = document.getElementById('select-cenario').value;
        const instituto = document.getElementById('select-instituto').value;

        if (!turno || !cenario) return;

        const seriesData = DataService.getDadosPresidencia(turno, cenario, instituto);
        if (seriesData.length > 0) this.renderizarChart(seriesData);
    },

    // Legenda 100% própria (HTML), independente do sistema de legenda do ApexCharts.
    // Isso resolve o problema de multi-seleção instável do legendClick nativo.
    renderizarLegenda(legendItems, legendColors) {
        const container = document.getElementById('legenda-presidencia');
        if (!container) return;
        container.innerHTML = '';

        legendItems.forEach((nome, i) => {
            const escondido = this.ocultos.has(nome);

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'legenda-pill' + (escondido ? ' inativo' : '');
            btn.innerHTML = `<span class="legenda-marker" style="background-color:${legendColors[i]}"></span>${nome}`;

            btn.addEventListener('click', () => {
                if (this.ocultos.size === 0) {
                    legendItems.forEach((outroNome, outroIndex) => {
                        if (outroNome !== nome) {
                            this.ocultos.add(outroNome);
                            const outroBtn = container.children[outroIndex];
                            if (outroBtn) outroBtn.classList.add('inativo');
                        }
                    });
                } else {
                    if (this.ocultos.has(nome)) {
                        this.ocultos.delete(nome);
                        btn.classList.remove('inativo');
                    } else {
                        this.ocultos.add(nome);
                        btn.classList.add('inativo');
                        if (this.ocultos.size === legendItems.length) {
                            legendItems.forEach((n, nIndex) => {
                                this.ocultos.delete(n);
                                const nBtn = container.children[nIndex];
                                if (nBtn) nBtn.classList.remove('inativo');
                            });
                        }
                    }
                }
                
                if (this.chartInstance && this.seriesOriginales) {
                    this.seriesOriginales.forEach(s => {
                        const baseName = s.name.replace(' (Pesquisas)', '');
                        if (this.ocultos.has(baseName)) {
                            this.chartInstance.hideSeries(s.name);
                        } else {
                            this.chartInstance.showSeries(s.name);
                        }
                    });
                }
            });

            container.appendChild(btn);
        });
    },

    renderizarChart(series) {
        if (this.chartInstance) this.chartInstance.destroy();
        
        this.seriesOriginales = series;

        const legendItems = [...new Set(series.map(s => s.name.replace(' (Pesquisas)', '')))];
        const legendColors = legendItems.map(nome => DataService.obterCor(nome));

        // Mantém as escolhas do usuário apenas para quem ainda existe neste conjunto de dados
        this.ocultos = new Set([...this.ocultos].filter(nome => legendItems.includes(nome)));

        this.renderizarLegenda(legendItems, legendColors);

        const activeSeries = this.seriesOriginales.map(s => {
            const baseName = s.name.replace(' (Pesquisas)', '');
            return { ...s, data: this.ocultos.has(baseName) ? [] : s.data };
        });

        const options = {
            series: activeSeries,
            chart: {
                type: 'line',
                height: 550,
                background: '#ffffff',
                zoom: { enabled: false },
                toolbar: { show: true, tools: { download: false, selection: true, zoom: true, pan: true, reset: true } },
                animations: { 
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: { enabled: true, delay: 150 },
                    dynamicAnimation: { enabled: true, speed: 350 }
                }
            },
            theme: { mode: 'light' },
            stroke: {
                width: series.map(s => s.name.includes('(Pesquisas)') ? 0 : 2),
                curve: 'smooth'
            },
            markers: {
                size: series.map(s => s.name.includes('(Pesquisas)') ? 5 : 0),
                strokeWidth: series.map(() => 2),
                strokeColors: series.map(s => s.color),
                colors: series.map(() => '#ffffff'),
                hover: { size: 6, sizeOffset: 2 }
            },
            xaxis: {
                type: 'datetime',
                crosshairs: { 
                    show: true,
                    stroke: { color: '#94a3b8', width: 1, dashArray: 4 }
                },
                labels: { format: 'dd/MM/yy', style: { colors: '#64748b', fontSize: '13px' } },
                axisBorder: { show: true, color: '#94a3b8', height: 1 },
                axisTicks: { show: true, color: '#94a3b8' }
            },
            yaxis: {
                min: function (min) { return Math.max(0, Math.floor(min / 5) * 5); },
                max: function (max) { return Math.ceil(max / 5) * 5; },
                stepSize: 5,
                axisBorder: { show: true, color: '#94a3b8', width: 1 },
                labels: {
                    formatter: function (value) { return Number(value).toFixed(1).replace('.', ',') + '%'; },
                    style: { colors: '#64748b', fontSize: '14px', fontWeight: 'bold' }
                }
            },
            grid: { 
                show: true,
                borderColor: '#cbd5e1', 
                strokeDashArray: 4,
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: true } }
            },
            // Legenda nativa desligada: usamos a legenda em HTML acima (#legenda-presidencia)
            legend: { show: false },
            tooltip: {
                enabled: true,
                shared: false,
                intersect: false,
                custom: function (opts) {
                    try {
                        const w = opts.w;
                        let seriesIndex = opts.seriesIndex;
                        let dataPointIndex = opts.dataPointIndex;

                        if (seriesIndex === -1 || dataPointIndex === undefined || dataPointIndex < 0) return '';

                        const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
                        if (!dataPoint || dataPoint.y === null || dataPoint.y === undefined) return '';

                        let dateStr = "";
                        if (dataPoint.x) {
                            const d = new Date(dataPoint.x);
                            d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                            dateStr = d.toLocaleDateString('pt-BR');
                        }

                        const color = w.globals.colors[seriesIndex];
                        const seriesName = w.globals.seriesNames[seriesIndex].replace(' (Pesquisas)', '');
                        const instituto = dataPoint.instituto || 'Média Móvel';
                        const valFormatado = Number(dataPoint.y).toFixed(1).replace('.', ',');

                        // Gambiarra necessária para ApexCharts tratar como bolinha, caso o nome seja de pesquisa
                        const isMediaMovel = !w.config.series[seriesIndex].name.includes('(Pesquisas)');
                        const badgeText = isMediaMovel ? 'Média Móvel' : instituto;
                        const badgeBg = isMediaMovel ? '#eff6ff' : '#f1f5f9';
                        const badgeColor = isMediaMovel ? '#2563eb' : '#475569';

                        return `
                            <div style="padding: 12px; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid ${color}; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: 'Roboto Condensed', sans-serif;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; gap: 16px;">
                                    <span style="font-size: 13px; color: #64748b; font-weight: bold;">${dateStr}</span>
                                    <span style="font-size: 11px; font-weight: bold; padding: 3px 6px; border-radius: 4px; background-color: ${badgeBg}; color: ${badgeColor}; white-space: nowrap;">${badgeText}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="width: 12px; height: 12px; border-radius: 50%; display: inline-block; background-color: ${color};"></span>
                                    <span style="font-weight: bold; color: #334155; font-size: 15px;">${seriesName}:</span>
                                    <span style="font-weight: bold; color: #0f172a; font-size: 16px;">${valFormatado}%</span>
                                </div>
                            </div>
                        `;
                    } catch (e) { return ''; }
                }
            }
        };

        this.chartInstance = new ApexCharts(document.querySelector("#chart-presidencia"), options);
        this.chartInstance.render().then(() => {
            const inner = document.querySelector('#chart-presidencia .apexcharts-inner');
            if (inner) inner.style.position = 'relative';
        });
    }
};