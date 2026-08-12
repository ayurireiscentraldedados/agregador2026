const MapaApp = {
    chartInstance: null,
    geoJsonData: null,

    async init() {
        console.log('Inicializando MapaApp (ECharts)...');

        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        try {
            await this.carregarGeoJson();
            this.renderizarMapa();

            // Re-renderizar o mapa se a janela redimensionar
            window.addEventListener('resize', () => {
                if (this.chartInstance) this.chartInstance.resize();
            });
        } catch (e) {
            console.error('Erro ao inicializar MapaApp:', e);
        } finally {
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    },

    async carregarGeoJson() {
        if (this.geoJsonData) return;
        try {
            const response = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson');
            this.geoJsonData = await response.json();

            // Remover ilhas distantes (Fernando de Noronha, Trindade) que geram "linhas" e bugs visuais no 3D
            ['Pernambuco', 'Espírito Santo'].forEach(estado => {
                const feature = this.geoJsonData.features.find(f => f.properties.name === estado);
                if (feature && feature.geometry.type === 'MultiPolygon') {
                    // Mantém apenas o polígono principal (continente), removendo as ilhas minúsculas distantes
                    feature.geometry.coordinates = [feature.geometry.coordinates[0]];
                }
            });

            // Registra o mapa no ECharts com o nome 'BR'
            echarts.registerMap('BR', this.geoJsonData);
            console.log('GeoJSON do Brasil carregado e registrado no ECharts com sucesso!');
        } catch (err) {
            console.error('Erro ao carregar o GeoJSON do Brasil:', err);
        }
    },

    renderizarMapa() {
        const chartContainer = document.getElementById('chart-mapa-presidencia');
        if (!chartContainer || !this.geoJsonData) {
            return;
        }

        try {
            // Inicializar ECharts
            if (!this.chartInstance) {
                this.chartInstance = echarts.init(chartContainer);
            }

            const dadosVantagem = DataService.getVantagemMapa();

            // Função auxiliar para normalizar nomes de estado
            const normalizar = (str) => {
                return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            };

            const mapData = [];

            this.geoJsonData.features.forEach(feature => {
                const stateName = feature.properties.name;
                const normStateName = normalizar(stateName);
                
                let cor = '#d3d3d3'; 
                let dados = null;

                for (const estado in dadosVantagem) {
                    if (normalizar(estado) === normStateName) {
                        cor = dadosVantagem[estado].cor;
                        dados = dadosVantagem[estado];
                        break;
                    }
                }

                mapData.push({
                    name: stateName,
                    regionHeight: 3, // Altura do relevo 3D
                    itemStyle: {
                        color: cor,       
                        borderColor: '#ffffff', 
                        borderWidth: 0.8,
                        opacity: 1
                    },
                    emphasis: {
                        itemStyle: {
                            color: cor, 
                            borderColor: '#f8fafc', 
                            borderWidth: 2,
                        },
                        label: {
                            show: false // Ocultar label padrão para usar apenas o tooltip HTML
                        }
                    },
                    dados: dados
                });
            });

            // A legenda customizada foi removida conforme solicitado.

            const option = {
                backgroundColor: 'transparent',
                tooltip: {
                    trigger: 'item',
                    backgroundColor: '#1E293B', // Tailwind slate-800
                    borderColor: '#334155', // Tailwind slate-700
                    borderWidth: 1,
                    padding: [14, 18],
                    textStyle: { color: '#F8FAFC' },
                    extraCssText: 'border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);',
                    formatter: function (params) {
                        if (params.data && params.data.dados) {
                            const dados = params.data.dados;
                            return `
                            <div style="font-family: 'Inter', sans-serif; min-width: 230px;">
                                <div style="display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                                    <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${params.name}</span>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 15px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #00A0DF; flex-shrink: 0;"></div>
                                        <span style="color: #cbd5e1; font-weight: 500; font-size: 14px; white-space: nowrap;">Flávio Bolsonaro (PL)</span>
                                    </div>
                                    <span style="font-weight: 700; color: #ffffff; font-size: 16px;">${dados.flavio.toFixed(1).replace('.', ',')}%</span>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 15px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #C7141A; flex-shrink: 0;"></div>
                                        <span style="color: #cbd5e1; font-weight: 500; font-size: 14px; white-space: nowrap;">Lula (PT)</span>
                                    </div>
                                    <span style="font-weight: 700; color: #ffffff; font-size: 16px;">${dados.lula.toFixed(1).replace('.', ',')}%</span>
                                </div>
                                
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #94a3b8; flex-shrink: 0;"></div>
                                        <span style="color: #94a3b8; font-weight: 500; font-size: 14px; white-space: nowrap;">Outros</span>
                                    </div>
                                    <span style="font-weight: 700; color: #94a3b8; font-size: 16px;">${(dados.outros || 0).toFixed(1).replace('.', ',')}%</span>
                                </div>
                            </div>
                        `;
                        }
                        
                        return `
                        <div style="font-family: 'Inter', sans-serif; min-width: 190px;">
                            <div style="display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 12px;">
                                <span style="font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${params.name}</span>
                            </div>
                            <div style="color: #94a3b8; font-size: 14px; font-weight: 500; text-align: center; padding: 4px 0;">
                                Nenhuma pesquisa<br>de 2º Turno encontrada.
                            </div>
                        </div>
                        `;
                    }
                },
                series: [
                    {
                        type: 'map3D',
                        map: 'BR',
                        roam: true, // Permitimos roam no 3D para o usuário girar o globo
                        label: {
                            show: false 
                        },
                        itemStyle: {
                            borderColor: '#ffffff',
                            borderWidth: 1
                        },
                        shading: 'lambert',
                        light: {
                            main: {
                                intensity: 1.5,
                                shadow: true,
                                shadowQuality: 'medium',
                                alpha: 40,
                                beta: 40
                            },
                            ambient: {
                                intensity: 0.4
                            }
                        },
                        viewControl: {
                            projection: 'perspective',
                            autoRotate: false,
                            distance: 155, // Zoom out forte para garantir que caiba com bastante folga
                            alpha: 70, 
                            beta: 0, 
                            minAlpha: 70,
                            maxAlpha: 70,
                            minBeta: 0,
                            maxBeta: 0,
                            center: [2, -25, 0], // Move o alvo da câmera para o sul, empurrando o mapa drasticamente para CIMA
                            rotateSensitivity: 0,
                            zoomSensitivity: 0, 
                            panSensitivity: 0
                        },
                        data: mapData
                    }
                ]
            };

            this.chartInstance.setOption(option, true);
            MapaApp.chart = this.chartInstance; // Compatibilidade com a lógica de resize das abas

            // Adicionar legenda
            this.adicionarLegendaHtml();

            // Força bruta: garantir que o mapa assuma o tamanho da div
            setTimeout(() => {
                if (this.chartInstance) this.chartInstance.resize();
            }, 300);

        } catch (e) {
            console.error('ERRO RENDERIZAR MAPA: ', e);
        }
    },

    adicionarLegendaHtml() {
        const container = document.getElementById('container-mapa-presidencia');
        let legendDiv = document.getElementById('mapa-echarts-legend');

        // Se a legenda não existe, cria ela por cima do ECharts
        if (!legendDiv) {
            legendDiv = document.createElement('div');
            legendDiv.id = 'mapa-echarts-legend';
            // Posicionamento absoluto no canto inferior esquerdo
            legendDiv.className = 'absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-xl text-xs z-10 border border-slate-200 text-slate-700';

            const html = `
                <h4 class="font-bold text-sm mb-2 text-slate-800">Vantagem na disputa<br>(Lula x Flávio)</h4>
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2"><span class="w-4 h-4 rounded block shadow-sm border border-black/10" style="background: #046B99"></span> Flávio (10% ou +)</div>
                    <div class="flex items-center gap-2"><span class="w-4 h-4 rounded block shadow-sm border border-black/10" style="background: #73A8C6"></span> Flávio (entre 2% e 10%)</div>
                    <div class="flex items-center gap-2"><span class="w-4 h-4 rounded block shadow-sm border border-black/10" style="background: #64748b"></span> Empate</div>
                    <div class="flex items-center gap-2"><span class="w-4 h-4 rounded block shadow-sm border border-black/10" style="background: #F87171"></span> Lula (entre 2% e 10%)</div>
                    <div class="flex items-center gap-2"><span class="w-4 h-4 rounded block shadow-sm border border-black/10" style="background: #C7141A"></span> Lula (10% ou +)</div>
                </div>
            `;
            legendDiv.innerHTML = html;
            container.appendChild(legendDiv);
        }
    }
};

window.MapaApp = MapaApp;
