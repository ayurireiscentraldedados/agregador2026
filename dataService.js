const DataService = {
    dadosPresidencia: [],
    dadosAvaliacao: [],
    dadosGovernadorSenador: [], 
    
    coresCandidatos: {
        "Lula": "#dc2626", "Bolsonaro": "#166534", "Tarcísio": "#2563eb", 
        "Ciro": "#d97706", "Tebet": "#9333ea", "Branco/Nulo": "#64748b", "Indecisos": "#94a3b8",
        "Ótimo/Bom": "#16a34a", "Regular": "#eab308", "Ruim/Péssimo": "#ef4444",
        "Ótimo": "#16a34a", "Bom": "#22c55e", "Ruim": "#ef4444", "Péssimo": "#b91c1c"
    },

    async carregarDados(urlLink1, urlLink2) {
        const fetchCsv = (url) => {
            return new Promise((resolve, reject) => {
                Papa.parse(url, {
                    download: true,
                    header: true,
                    dynamicTyping: false,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const dadosTratados = results.data.map(linha => {
                            let dataRef = null;
                            if (linha['Divulgação']) {
                                const dateStr = String(linha['Divulgação']).trim();
                                if (dateStr.includes('/')) {
                                    const parts = dateStr.split('/');
                                    if (parts.length === 3) dataRef = new Date(parts[2], parts[1] - 1, parts[0]);
                                } else {
                                    dataRef = new Date(dateStr);
                                }
                            }
                            let percent = 0;
                            if (linha['Pontuação (%)'] !== undefined && linha['Pontuação (%)'] !== null) {
                                percent = parseFloat(String(linha['Pontuação (%)']).replace(',', '.'));
                            }
                            return {
                                ...linha,
                                data_referencia: dataRef || new Date(),
                                turno: linha['Turno'],
                                cenario: linha['Cenário'],
                                candidato: linha['Candidato'],
                                percentual: percent,
                                instituto: linha['Instituto']
                            };
                        }).filter(d => !isNaN(d.data_referencia.getTime()) && !isNaN(d.percentual));
                        resolve(dadosTratados);
                    },
                    error: (err) => reject(err)
                });
            });
        };

        try {
            const [planilha1, planilha2] = await Promise.all([
                fetchCsv(urlLink1).catch(() => []),
                fetchCsv(urlLink2).catch(() => [])
            ]);
            
            this.dadosGovernadorSenador = planilha2;
            const termosAvaliacao = ['Ótimo', 'Bom', 'Regular', 'Ruim', 'Péssimo', 'Aprova', 'Desaprova'];
            
            this.dadosAvaliacao = planilha1.filter(d => 
                termosAvaliacao.some(termo => String(d.candidato).includes(termo))
            ).map(d => ({ ...d, avaliacao: d.candidato }));

            this.dadosPresidencia = planilha1.filter(d => 
                !termosAvaliacao.some(termo => String(d.candidato).includes(termo))
            );
        } catch (error) {
            console.error("Erro na leitura das planilhas.", error);
        }
    },

    obterCor(nome) { return this.coresCandidatos[nome] || "#" + Math.floor(Math.random()*16777215).toString(16); },

    getTurnos() { return [...new Set(this.dadosPresidencia.map(d => d.turno).filter(Boolean))].sort(); },

    getCenariosPorTurno(turno) {
        const dadosTurno = this.dadosPresidencia.filter(d => String(d.turno) === String(turno));
        return [...new Set(dadosTurno.map(d => d.cenario).filter(Boolean))].sort();
    },

    getInstitutos() {
        // Coleta todos os institutos únicos de toda a base de presidência
        return [...new Set(this.dadosPresidencia.map(d => d.instituto).filter(Boolean))].sort();
    },

    prepararSeriesMistas(dadosBrutos, campoChave) {
        if (!dadosBrutos || dadosBrutos.length === 0) return [];

        const dataMin = new Date(Math.min(...dadosBrutos.map(d => d.data_referencia)));
        const dataMax = new Date(Math.max(...dadosBrutos.map(d => d.data_referencia)));
        const chaves = [...new Set(dadosBrutos.map(d => d[campoChave]))];

        let seriesMistas = [];

        chaves.forEach(chave => {
            const cor = this.obterCor(chave);
            let dadosLinha = [];
            let dadosBolinhas = [];

            const pesquisasChave = dadosBrutos.filter(d => d[campoChave] === chave);
            pesquisasChave.forEach(p => {
                dadosBolinhas.push({ x: p.data_referencia.getTime(), y: p.percentual, instituto: p.instituto });
            });

            for (let d = new Date(dataMin); d <= dataMax; d.setDate(d.getDate() + 1)) {
                const dataAtual = new Date(d);
                const dataCorte = new Date(d);
                dataCorte.setDate(dataCorte.getDate() - 30); 

                const pesquisasNaJanela = dadosBrutos.filter(p => 
                    p.data_referencia <= dataAtual && p.data_referencia >= dataCorte && p[campoChave] === chave
                );

                if (pesquisasNaJanela.length > 0) {
                    let somaValores = 0, somaPesos = 0;
                    pesquisasNaJanela.forEach(p => {
                        const diasDiff = Math.floor((dataAtual - p.data_referencia) / (1000 * 60 * 60 * 24));
                        const pesoTempo = (30 - diasDiff) / 30;
                        const pesoInstituto = ['Datafolha', 'Quaest', 'Ipec'].includes(p.instituto) ? 1.5 : 1.0;
                        const pesoFinal = pesoTempo * pesoInstituto;
                        somaValores += (p.percentual * pesoFinal);
                        somaPesos += pesoFinal;
                    });
                    if (somaPesos > 0) {
                        dadosLinha.push({
                            x: dataAtual.getTime(),
                            y: parseFloat((somaValores / somaPesos).toFixed(1)),
                            instituto: "Média Móvel"
                        });
                    }
                }
            }
            if (dadosLinha.length > 0) seriesMistas.push({ name: chave, type: 'line', data: dadosLinha, color: cor });
            if (dadosBolinhas.length > 0) seriesMistas.push({ name: chave + ' (Pesquisas)', type: 'line', data: dadosBolinhas, color: cor });
        });
        return seriesMistas;
    },

    getDadosPresidencia(turno, cenario, filtroInstituto) {
        let filtrados = this.dadosPresidencia.filter(d => String(d.turno) === String(turno) && String(d.cenario) === String(cenario));
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => d.instituto === filtroInstituto);
        }
        return this.prepararSeriesMistas(filtrados, 'candidato');
    },

    getDadosAvaliacao(filtroInstituto) {
        let filtrados = this.dadosAvaliacao;
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => d.instituto === filtroInstituto);
        }
        return this.prepararSeriesMistas(filtrados, 'avaliacao');
    }
};