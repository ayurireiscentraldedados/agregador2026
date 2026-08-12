const SenadorApp = {
    chartInstance: null,
    ocultos: new Set(), // nomes das séries que o usuário escondeu manualmente

    init() {
        this.popularSelectEstado();
        this.configurarEventos();
        setTimeout(() => this.atualizarGrafico(), 100);
    },

    popularSelectEstado() {
        const selectEstado = document.getElementById('select-estado-sen');
        const estados = DataService.getEstadosSenador();

        selectEstado.innerHTML = '';
        if (estados.length === 0) return;
        estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            selectEstado.appendChild(option);
        });

        this.popularSelectInstituto();
        this.popularSelectTurno();
    },

    popularSelectTurno() {
        const selectEstado = document.getElementById('select-estado-sen');
        const selectInstituto = document.getElementById('select-instituto-sen');
        const selectTurno = document.getElementById('select-turno-sen');

        const estadoSelecionado = selectEstado.value;
        const institutoSelecionado = selectInstituto ? selectInstituto.value : null;

        const turnos = DataService.getTurnosSenador(estadoSelecionado, institutoSelecionado);

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
        const selectEstado = document.getElementById('select-estado-sen');
        const selectTurno = document.getElementById('select-turno-sen');
        const selectInstituto = document.getElementById('select-instituto-sen');
        const selectCenario = document.getElementById('select-cenario-sen');

        const estadoSelecionado = selectEstado.value;
        const turnoSelecionado = selectTurno ? selectTurno.value : null;
        const institutoSelecionado = selectInstituto ? selectInstituto.value : null;

        let cenarios = DataService.getCenariosSenador(estadoSelecionado, turnoSelecionado, institutoSelecionado);
        cenarios = cenarios.filter(c => c && typeof c === 'string' && !c.toLowerCase().includes('avaliação'));
        cenarios.sort((a, b) => {
            if (a.toLowerCase() === 'geral') return -1;
            if (b.toLowerCase() === 'geral') return 1;
            return a.localeCompare(b);
        });

        selectCenario.innerHTML = '';
        cenarios.forEach(cenario => {
            const option = document.createElement('option');
            option.value = cenario;
            option.textContent = cenario;
            selectCenario.appendChild(option);
        });
    },

    popularSelectInstituto() {
        const selectEstado = document.getElementById('select-estado-sen');
        const selectInstituto = document.getElementById('select-instituto-sen');
        const estadoSelecionado = selectEstado.value;

        const institutos = DataService.getInstitutosSenador(estadoSelecionado);

        selectInstituto.innerHTML = '<option value="Todos">Todos os institutos</option>';
        institutos.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            selectInstituto.appendChild(option);
        });
    },

    configurarEventos() {
        document.getElementById('select-estado-sen').addEventListener('change', () => {
            this.ocultos.clear();
            this.popularSelectInstituto();
            this.popularSelectTurno(); // que por sua vez chama popularSelectCenario()
            this.atualizarGrafico();
        });
        document.getElementById('select-turno-sen').addEventListener('change', () => {
            this.ocultos.clear();
            this.popularSelectCenario();
            this.atualizarGrafico();
        });
        document.getElementById('select-cenario-sen').addEventListener('change', () => this.atualizarGrafico());
        document.getElementById('select-instituto-sen').addEventListener('change', () => {
            this.ocultos.clear();
            this.popularSelectTurno(); // isso recarrega turnos e cenários baseados no novo instituto
            this.atualizarGrafico();
        });
    },

    atualizarGrafico() {
        const estado = document.getElementById('select-estado-sen').value;
        const turno = document.getElementById('select-turno-sen').value;
        const cenario = document.getElementById('select-cenario-sen').value;
        const instituto = document.getElementById('select-instituto-sen').value;

        if (!estado || !turno || !cenario) return;

        const seriesData = DataService.getDadosSenador(estado, turno, cenario, instituto);
        if (seriesData.length > 0) this.renderizarChart(seriesData);
        else if (this.chartInstance) this.chartInstance.clear();
    },

    renderizarLegenda(legendItems, legendColors) {
        const container = document.getElementById('legenda-senado');
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
                    const selectedMap = {};
                    this.seriesOriginales.forEach(s => {
                        const baseName = s.name.replace(' (Pesquisas)', '');
                        const isOculto = this.ocultos.has(baseName);
                        selectedMap[s.name] = !isOculto;
                    });
                    this.chartInstance.setOption({ legend: { selected: selectedMap } });
                }
            });

            container.appendChild(btn);
        });
    },

    renderizarChart(series) {
        if (!this.chartInstance) {
            this.chartInstance = echarts.init(document.querySelector("#chart-senado"));
        }

        this.seriesOriginales = series;

        const legendItems = [...new Set(series.map(s => s.name.replace(' (Pesquisas)', '')))];
        const legendColors = legendItems.map(nome => DataService.obterCor(nome));

        this.ocultos = new Set([...this.ocultos].filter(nome => legendItems.includes(nome)));

        this.renderizarLegenda(legendItems, legendColors);

        let echartsSeries = [];
        let selectedMap = {};

        this.seriesOriginales.forEach(s => {
            const isPesquisa = s.name.includes('(Pesquisas)');
            const baseName = s.name.replace(' (Pesquisas)', '');
            const isOculto = this.ocultos.has(baseName);
            selectedMap[s.name] = !isOculto;

            echartsSeries.push({
                name: s.name,
                type: isPesquisa ? 'scatter' : 'line',
                data: s.data,
                smooth: true,
                showSymbol: false,
                symbolSize: isPesquisa ? 8 : 0,
                silent: !isPesquisa,
                itemStyle: isPesquisa
                    ? { color: '#ffffff', borderColor: s.color, borderWidth: 2.5 }
                    : { color: s.color },
                lineStyle: { width: isPesquisa ? 0 : 3.5, color: s.color },
                emphasis: { focus: 'none' }
            });

            if (!isPesquisa) {
                echartsSeries.push({
                    name: s.name,
                    type: 'scatter',
                    data: s.data,
                    symbol: 'circle',
                    symbolSize: 12,
                    itemStyle: { color: 'transparent', borderColor: 'transparent', borderWidth: 0 },
                    emphasis: { focus: 'none', itemStyle: { color: s.color, borderColor: '#ffffff', borderWidth: 2, opacity: 1 } }
                });
            }
        });

        const options = {
            textStyle: { fontFamily: "'Roboto Condensed', sans-serif" },
            animation: true,
            grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
            dataZoom: [
                { type: 'inside', xAxisIndex: 0, filterMode: 'none' }
            ],
            tooltip: {
                trigger: 'item',
                axisPointer: {
                    type: 'cross',
                    label: { show: false },
                    crossStyle: { color: '#94a3b8', type: 'dashed' }
                },
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderWidth: 1,
                padding: 12,
                textStyle: { color: '#334155', fontFamily: "'Roboto Condensed', sans-serif" },
                formatter: function (p) {
                    if (!p) return '';

                    let dateStr = "";
                    if (p.value && p.value[0]) {
                        const d = new Date(p.value[0]);
                        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                        dateStr = d.toLocaleDateString('pt-BR');
                    }

                    const isMediaMovel = !p.seriesName.includes('(Pesquisas)');
                    const seriesName = p.seriesName.replace(' (Pesquisas)', '');
                    const color = DataService.obterCor(seriesName);
                    const valFormatado = Number(p.value[1]).toFixed(1).replace('.', ',');
                    const instituto = p.data.instituto || (isMediaMovel ? 'Média Móvel' : '');

                    const badgeText = isMediaMovel ? 'Média Móvel' : instituto;
                    const badgeBg = isMediaMovel ? '#eff6ff' : '#f1f5f9';
                    const badgeColor = isMediaMovel ? '#2563eb' : '#475569';
                    
                    const isFullscreen = !!document.fullscreenElement;
                    const fsScale = isFullscreen ? 1.2 : 1;
                    const margemErro = p.data.margem_erro ? String(p.data.margem_erro).replace('%', '').trim() : null;
                    const margemHtml = margemErro ? `<div style="font-size: ${11 * fsScale}px; color: #64748b; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 4px;">Margem de erro: ±${margemErro}%</div>` : '';

                    return `
                        <div style="font-family: 'Roboto Condensed', sans-serif; margin: -12px; padding: ${12 * fsScale}px; border-left: 4px solid ${color}; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; gap: 16px;">
                                <span style="font-size: ${13 * fsScale}px; color: #64748b; font-weight: bold;">${dateStr}</span>
                                <span style="font-size: ${11 * fsScale}px; font-weight: bold; padding: 3px 6px; border-radius: 4px; background-color: ${badgeBg}; color: ${badgeColor}; white-space: nowrap;">${badgeText}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="width: ${12 * fsScale}px; height: ${12 * fsScale}px; border-radius: 50%; display: inline-block; background-color: ${color};"></span>
                                <span style="font-weight: bold; color: #334155; font-size: ${15 * fsScale}px;">${seriesName}:</span>
                                <span style="font-weight: bold; color: #0f172a; font-size: ${16 * fsScale}px;">${valFormatado}%</span>
                            </div>
                            ${margemHtml}
                        </div>
                    `;
                }
            },
            xAxis: {
                type: 'time',
                axisLabel: { formatter: '{dd}/{MM}/{yy}', color: '#64748b', fontSize: 13, hideOverlap: true },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#cbd5e1' } },
                axisLine: { lineStyle: { color: '#94a3b8' } }
            },
            yAxis: {
                type: 'value',
                min: (value) => Math.max(0, Math.floor(value.min / 5) * 5),
                max: (value) => Math.ceil(value.max / 5) * 5,
                interval: 5,
                axisLabel: {
                    formatter: (value) => Number(value).toFixed(1).replace('.', ',') + '%',
                    color: '#64748b', fontSize: 13, fontWeight: 'bold'
                },
                splitLine: { show: true, lineStyle: { type: 'dashed', color: '#cbd5e1' } }
            },
            legend: { show: false, selected: selectedMap },
            series: echartsSeries
        };

        this.chartInstance.setOption(options, true);
    }
};

