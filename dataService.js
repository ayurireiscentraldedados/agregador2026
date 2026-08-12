const DataService = {
    dadosPresidencia: [],
    dadosAvaliacao: [],
    dadosGovernadorSenador: [], 
    
    coresPartidos: {
        "mdb": "#009959",
        "pt": "#C0122D",
        "pl": "#30306C",
        "psb": "#FFCC00",
        "psd": "#FFA400",
        "psol": "#68018D",
        "união brasil": "#00A0DF", "união": "#00A0DF", "uniao": "#00A0DF", "uniao brasil": "#00A0DF",
        "psdb": "#0f2bc5",
        "novo": "#ec671c",
        "republicanos": "#005CA9",
        "pode": "#00d663", "podemos": "#00d663",
        "dc": "#c89721",
        "missão": "#FCBE26", "missao": "#FCBE26",
        "pp": "#54b8ea", "progressistas": "#54b8ea",
        "rede": "#3ca08c", "rede sustentabilidade": "#3ca08c",
        "solidariedade": "#f37021",
        "prtb": "#0047ab",
        "pdt": "#FE8E6D",
        "avante": "#2EABB1",
        "pco": "#9F030A",
        "up": "#000000",
        "pstu": "#c92127",
        "cidadania": "#FF8A00",
        "pcdob": "#800314",
        "democrata": "#8CC63E", "democratas": "#8CC63E",
        "pv": "#01652F",
        "prd": "#0c3f86",
        "agir": "#01369E",
        "sem partido": "#808080"
    },
    
    coresEspeciais: {
        "Branco/Nulo/Nenhum": "#475569", // Cinza Escuro
        "Indeciso/Não sabe": "#94a3b8", // Cinza Claro
        "Ótimo/Bom": "#16a34a", "Regular": "#eab308", "Ruim/Péssimo": "#ef4444",
        "Ótimo": "#16a34a", "Bom": "#22c55e", "Ruim": "#ef4444", "Péssimo": "#b91c1c",
        "Aprova": "#2563eb", "Desaprova": "#dc2626"
    },

    async carregarDados(urlLink1, urlLink2) {
        const fetchCsv = (url) => {
            // Adiciona um timestamp na URL para "quebrar" o cache do navegador e forçar o download da versão mais recente
            const urlSemCache = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
            
            return new Promise((resolve, reject) => {
                Papa.parse(urlSemCache, {
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
                            let candidatoNome = linha['Candidato'] ? String(linha['Candidato']).trim() : '';
                            let partidoNome = linha['Partido'] ? String(linha['Partido']).trim() : '';

                            const nomeLower = candidatoNome.toLowerCase();
                            
                            // Normalização de Brancos/Nulos/Indecisos
                            if (nomeLower.includes('branco') || nomeLower.includes('nulo') || nomeLower.includes('nenhum')) {
                                candidatoNome = 'Branco/Nulo/Nenhum';
                                partidoNome = '';
                            } else if (nomeLower.includes('indeciso') || nomeLower.includes('sabe') || nomeLower.includes('ns')) {
                                candidatoNome = 'Indeciso/Não sabe';
                                partidoNome = '';
                            }
                            
                            let nomeFinal = candidatoNome;
                            // Checa se é uma linha de avaliação do governo
                            const termosAvaliacao = ['ótimo', 'bom', 'regular', 'ruim', 'péssimo', 'aprova', 'desaprova'];
                            const isAvaliacao = termosAvaliacao.some(t => nomeLower.includes(t));

                            // Adiciona o partido se for um candidato real
                            if (partidoNome && !isAvaliacao && candidatoNome !== 'Branco/Nulo/Nenhum' && candidatoNome !== 'Indeciso/Não sabe') {
                                if (partidoNome.toLowerCase() === 'sem partido') {
                                    nomeFinal = `${candidatoNome} (Sem partido)`;
                                } else {
                                    nomeFinal = `${candidatoNome} (${partidoNome})`;
                                }
                            }

                            const getMargem = (row) => {
                                const key = Object.keys(row).find(k => k.toLowerCase().trim().includes('margem'));
                                return key ? row[key] : null;
                            };

                            return {
                                ...linha,
                                data_referencia: dataRef || new Date(),
                                turno: linha['Turno'],
                                cenario: linha['Cenário'],
                                candidato: nomeFinal,
                                percentual: percent,
                                margem_erro: getMargem(linha),
                                instituto: linha['Instituto']
                            };
                        }).filter(d => d.candidato.trim() !== '' && !isNaN(d.data_referencia.getTime()) && !isNaN(d.percentual));
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

    obterCor(nome) { 
        if (this.coresEspeciais[nome]) return this.coresEspeciais[nome];
        
        // Extrai o partido de dentro dos parênteses, ex: "Lula (PT)" -> "PT"
        const match = nome.match(/\(([^)]+)\)$/);
        if (match) {
            const partido = match[1].toLowerCase().trim();
            if (this.coresPartidos[partido]) {
                return this.coresPartidos[partido];
            }
        }
        return "#" + Math.floor(Math.random()*16777215).toString(16); 
    },

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
                dadosBolinhas.push({ 
                    value: [p.data_referencia.getTime(), p.percentual], 
                    instituto: p.instituto,
                    margem_erro: p.margem_erro 
                });
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
                            value: [dataAtual.getTime(), somaValores / somaPesos],
                            instituto: "Média Móvel"
                        });
                    }
                }
            }

            // Preenchimento de intervalos (Interpolação Linear) para garantir magnetismo perfeito do hover
            if (dadosLinha.length > 0) {
                let filledLinha = [];
                for (let i = 0; i < dadosLinha.length; i++) {
                    filledLinha.push(dadosLinha[i]);
                    if (i < dadosLinha.length - 1) {
                        const t1 = dadosLinha[i].value[0];
                        const v1 = dadosLinha[i].value[1];
                        const t2 = dadosLinha[i+1].value[0];
                        const v2 = dadosLinha[i+1].value[1];
                        
                        const diasDiff = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
                        if (diasDiff > 1) {
                            for (let j = 1; j < diasDiff; j++) {
                                const tInterp = t1 + j * (1000 * 60 * 60 * 24);
                                const vInterp = v1 + (v2 - v1) * (j / diasDiff);
                                filledLinha.push({
                                    value: [tInterp, vInterp],
                                    instituto: "Média Móvel"
                                });
                            }
                        }
                    }
                }
                dadosLinha = filledLinha;
            }

            // Suavização final (Filtro de média móvel centrada de 11 dias) para garantir curvas arredondadas (Smooth Lines)
            if (dadosLinha.length > 0) {
                let smoothedLinha = [];
                const smoothWindow = 5; // +/- 5 dias para suavizar as quinas
                for (let i = 0; i < dadosLinha.length; i++) {
                    let sum = 0, count = 0;
                    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(dadosLinha.length - 1, i + smoothWindow); j++) {
                        sum += dadosLinha[j].value[1];
                        count++;
                    }
                    smoothedLinha.push({
                        value: [dadosLinha[i].value[0], sum / count],
                        instituto: "Média Móvel"
                    });
                }
                dadosLinha = smoothedLinha;
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
    },

    toTitleCase(str) {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            if (word.length > 2 || word === 'df') {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            return word;
        }).join(' ');
    },

    getEstadosGovernador() {
        const governadores = this.dadosGovernadorSenador.filter(d => String(d['Cargo']).trim().toLowerCase() === 'governador');
        const estados = [...new Set(governadores.map(d => this.toTitleCase(String(d['Abrangência']).trim())).filter(Boolean))].sort();
        return estados;
    },

    getTurnosGovernador(estado, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'governador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado
        );
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        return [...new Set(filtrados.map(d => String(d.turno)).filter(Boolean))].sort();
    },

    getCenariosGovernador(estado, turno, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'governador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado &&
            String(d.turno) === String(turno)
        );
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        return [...new Set(filtrados.map(d => String(d.cenario)).filter(Boolean))].sort();
    },

    getInstitutosGovernador(estado) {
        const filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'governador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado
        );
        return [...new Set(filtrados.map(d => String(d.instituto)).filter(Boolean))].sort();
    },

    getDadosGovernador(estado, turno, cenario, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'governador' &&
            this.toTitleCase(String(d['Abrangência']).trim()) === estado &&
            String(d.turno) === String(turno) && 
            String(d.cenario) === String(cenario)
        );
        
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        
        return this.prepararSeriesMistas(filtrados, 'candidato');
    },

    getEstadosSenador() {
        const senadores = this.dadosGovernadorSenador.filter(d => String(d['Cargo']).trim().toLowerCase() === 'senador');
        const estados = [...new Set(senadores.map(d => this.toTitleCase(String(d['Abrangência']).trim())).filter(Boolean))].sort();
        return estados;
    },

    getTurnosSenador(estado, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'senador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado
        );
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        return [...new Set(filtrados.map(d => String(d.turno)).filter(Boolean))].sort();
    },

    getCenariosSenador(estado, turno, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'senador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado &&
            String(d.turno) === String(turno)
        );
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        return [...new Set(filtrados.map(d => String(d.cenario)).filter(Boolean))].sort();
    },

    getInstitutosSenador(estado) {
        const filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'senador' && 
            this.toTitleCase(String(d['Abrangência']).trim()) === estado
        );
        return [...new Set(filtrados.map(d => String(d.instituto)).filter(Boolean))].sort();
    },

    getDadosSenador(estado, turno, cenario, filtroInstituto) {
        let filtrados = this.dadosGovernadorSenador.filter(d => 
            String(d['Cargo']).trim().toLowerCase() === 'senador' &&
            this.toTitleCase(String(d['Abrangência']).trim()) === estado &&
            String(d.turno) === String(turno) && 
            String(d.cenario) === String(cenario)
        );
        
        if (filtroInstituto && filtroInstituto !== 'Todos') {
            filtrados = filtrados.filter(d => String(d.instituto) === filtroInstituto);
        }
        
        return this.prepararSeriesMistas(filtrados, 'candidato');
    },

    // --- MÉTODOS PARA O MAPA DE PRESIDENTE ---
    // --- MÉTODOS PARA O MAPA DE PRESIDENTE (VANTAGEM LULA x FLÁVIO) ---
    getVantagemMapa() {
        // Filtrar presidente apenas no 1º turno para a média do mapa e comparativo
        const presidenciaEstados = this.dadosGovernadorSenador.filter(d => {
            const cargo = String(d['Cargo'] || '').trim().toLowerCase();
            const turno = String(d['Turno'] || '').trim();
            return (cargo === 'presidente' || cargo === 'presidência') && turno === '1';
        });

        // O usuário solicitou fazer a média de todos os resultados disponíveis no estado para calcular a cor
        const filtrados = presidenciaEstados;

        const dadosPorEstado = {};
        filtrados.forEach(d => {
            const estado = this.toTitleCase(String(d['Abrangência'] || '').trim());
            if (!estado) return;
            if (!dadosPorEstado[estado]) dadosPorEstado[estado] = [];
            
            const candidato = String(d.candidato || '').trim();
            const pontuacao = parseFloat(d.percentual);
            const candLower = candidato.toLowerCase();
            
            if (!isNaN(pontuacao) && !candLower.includes('branco') && !candLower.includes('nulo') && !candLower.includes('nenhum') && !candLower.includes('indeciso') && !candLower.includes('sabe')) {
                dadosPorEstado[estado].push({ 
                    candidato, 
                    pontuacao, 
                    data_referencia: d.data_referencia,
                    instituto: String(d.instituto)
                });
            }
        });

        const resultado = {};
        
        for (const estado of Object.keys(dadosPorEstado)) {
            const candidatos = dadosPorEstado[estado];
            
            // Pega a data da pesquisa mais recente deste estado como "hoje"
            const maxTime = Math.max(...candidatos.map(c => c.data_referencia ? c.data_referencia.getTime() : 0));
            const dataMax = new Date(maxTime);
            const dataCorte = new Date(maxTime);
            dataCorte.setDate(dataCorte.getDate() - 30);
            
            const pesosCand = {};
            const somaCand = {};

            candidatos.forEach(c => {
                if (!c.data_referencia || c.data_referencia < dataCorte || c.data_referencia > dataMax) return;
                
                const diasDiff = Math.floor((dataMax - c.data_referencia) / (1000 * 60 * 60 * 24));
                const pesoTempo = Math.max(0, (30 - diasDiff) / 30);
                const pesoInstituto = ['Datafolha', 'Quaest', 'Ipec'].includes(c.instituto) ? 1.5 : 1.0;
                const pesoFinal = pesoTempo * pesoInstituto;

                const candLower = c.candidato.toLowerCase();
                let chaveCand = c.candidato;
                if (candLower.includes('lula')) chaveCand = 'lula';
                else if (candLower.includes('flávio') || candLower.includes('flavio')) chaveCand = 'flavio';

                if (!pesosCand[chaveCand]) { pesosCand[chaveCand] = 0; somaCand[chaveCand] = 0; }
                pesosCand[chaveCand] += pesoFinal;
                somaCand[chaveCand] += c.pontuacao * pesoFinal;
            });

            let mediaLula = 0, mediaFlavio = 0, mediaOutros = 0;

            Object.keys(pesosCand).forEach(cand => {
                const media = somaCand[cand] / pesosCand[cand];
                
                if (cand === 'lula') {
                    mediaLula = media;
                } else if (cand === 'flavio') {
                    mediaFlavio = media;
                } else {
                    mediaOutros += media;
                }
            });

            const pesosLula = pesosCand['lula'] || 0;
            const pesosFlavio = pesosCand['flavio'] || 0;

            let cor = '#808080'; // sem pesquisas ou erro
            let diff = mediaFlavio - mediaLula; // positivo: Flavio lidera. negativo: Lula lidera

            if (pesosLula === 0 && pesosFlavio === 0) {
                cor = '#d3d3d3'; // sem dados
            } else if (Math.abs(diff) <= 2) {
                cor = '#64748b'; // Empate (Cinza mais escuro)
            } else if (diff > 10) {
                cor = '#046B99'; // Flavio forte
            } else if (diff > 2) {
                cor = '#73A8C6'; // Flavio fraco
            } else if (diff < -10) {
                cor = '#C7141A'; // Lula forte
            } else if (diff < -2) {
                cor = '#F87171'; // Lula fraco (vermelho claro ao invés de pêssego)
            }

            resultado[estado] = {
                lula: mediaLula,
                flavio: mediaFlavio,
                outros: mediaOutros,
                diff: diff,
                cor: cor
            };
        }
        
        return resultado;
    },

    eleitoradoApto2022: {
        "São Paulo": 34667793,
        "Minas Gerais": 16290870,
        "Rio de Janeiro": 12827296,
        "Bahia": 11291528,
        "Rio Grande do Sul": 8597450,
        "Paraná": 8475632,
        "Pernambuco": 7018098,
        "Ceará": 6820673,
        "Pará": 6079030,
        "Santa Catarina": 5489658,
        "Maranhão": 5042999,
        "Goiás": 4870354,
        "Paraíba": 3091684,
        "Espírito Santo": 2927426,
        "Amazonas": 2647748,
        "Rio Grande do Norte": 2558625,
        "Piauí": 2573810,
        "Mato Grosso": 2469414,
        "Alagoas": 2327994,
        "Distrito Federal": 2203045,
        "Mato Grosso do Sul": 1996510,
        "Sergipe": 1671492,
        "Rondônia": 1230987,
        "Tocantins": 1094003,
        "Acre": 588433,
        "Amapá": 550686,
        "Roraima": 366240
    },

    eleitoradoApto2026: {
        "São Paulo": 34104226,
        "Minas Gerais": 16377659,
        "Rio de Janeiro": 12857000,
        "Bahia": 11321005,
        "Rio Grande do Sul": 8526233,
        "Paraná": 8609026,
        "Pernambuco": 7225744,
        "Ceará": 6998494,
        "Pará": 6265355,
        "Santa Catarina": 5725753,
        "Maranhão": 5186562,
        "Goiás": 5080755,
        "Paraíba": 3247397,
        "Espírito Santo": 2990490,
        "Amazonas": 2801182,
        "Rio Grande do Norte": 2660565,
        "Piauí": 2708160,
        "Mato Grosso": 2638230,
        "Alagoas": 2441794,
        "Distrito Federal": 2253132,
        "Mato Grosso do Sul": 2024884,
        "Sergipe": 1740124,
        "Rondônia": 1267105,
        "Tocantins": 1182307,
        "Acre": 614375,
        "Amapá": 577534,
        "Roraima": 401496
    },

    dados2022: [],

    async carregarDados2022(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true,
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                complete: (results) => {
                    this.dados2022 = results.data.map(linha => {
                        const estado = this.toTitleCase(String(linha['Estado'] || '').trim());
                        
                        // O Voto Absoluto vem com pontos separando milhar (ex: 3.578.355)
                        const votosPT = parseInt(String(linha['PT - VOTOS ABSOLUTOS'] || '0').replace(/\./g, ''), 10);
                        const votosPL = parseInt(String(linha['PL - VOTOS ABSOLUTOS'] || '0').replace(/\./g, ''), 10);
                        
                        return {
                            estado,
                            votosPT: isNaN(votosPT) ? 0 : votosPT,
                            votosPL: isNaN(votosPL) ? 0 : votosPL
                        };
                    }).filter(d => d.estado && d.votosPT > 0);
                    resolve(this.dados2022);
                },
                error: (err) => reject(err)
            });
        });
    },

    calcularComparativo2022() {
        // Obter as médias atuais das pesquisas (já agregadas)
        const mediasAtuais = this.getVantagemMapa();
        
        const comparativo = [];

        this.dados2022.forEach(d22 => {
            const estado = d22.estado;
            const eleitorado2022 = this.eleitoradoApto2022[estado];
            const eleitorado2026 = this.eleitoradoApto2026[estado];
            
            if (!eleitorado2022 || !eleitorado2026) return; // Se não tiver o eleitorado, não podemos calcular a métrica

            // Desempenho Base 2022 (% sobre o total de APTOS de 2022)
            const percBasePT = (d22.votosPT / eleitorado2022) * 100;
            const percBasePL = (d22.votosPL / eleitorado2022) * 100;

            // Intenção de Voto Atual
            const mediaAtual = mediasAtuais[estado];
            let percAtualPT = 0;
            let percAtualPL = 0;

            if (mediaAtual) {
                percAtualPT = mediaAtual.lula || 0;
                percAtualPL = mediaAtual.flavio || 0; // Usando Flávio como proxy do PL atual
            }

            // Votos Projetados Atuais (Intenção * Eleitorado Atualizado de 2026)
            const projecaoVotosPT = (percAtualPT / 100) * eleitorado2026;
            const projecaoVotosPL = (percAtualPL / 100) * eleitorado2026;

            // Saldo (diferença em votos absolutos)
            const saldoVotosPT = projecaoVotosPT - d22.votosPT;
            const saldoVotosPL = projecaoVotosPL - d22.votosPL;

            comparativo.push({
                estado,
                eleitorado2022,
                eleitorado2026,
                
                votosPT2022: d22.votosPT,
                percBasePT2022: percBasePT,
                percAtualPT: percAtualPT,
                projetadosPT: projecaoVotosPT,
                saldoPT: saldoVotosPT,
                
                votosPL2022: d22.votosPL,
                percBasePL2022: percBasePL,
                percAtualPL: percAtualPL,
                projetadosPL: projecaoVotosPL,
                saldoPL: saldoVotosPL
            });
        });

        // Ordenar por saldo PT decrescente, como foco inicial
        comparativo.sort((a, b) => b.saldoPT - a.saldoPT);
        
        return comparativo;
    }
};