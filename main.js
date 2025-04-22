document.addEventListener('DOMContentLoaded', function () {
    // Elementos do DOM
    const productionTab = document.getElementById('production-tab');
    const analysisTab = document.getElementById('analysis-tab');
    const historyTab = document.getElementById('history-tab');

    // Variáveis globais
    let allHistoryData = [];
    let holidays = JSON.parse(localStorage.getItem('breadProductionHolidays') || '[]');
    let productionChart = null;
    let wasteChart = null;

    // Inicialização
    initApp();

    // Função de inicialização
    function initApp() {
        // Configurar data atual
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        document.getElementById('date').value = formattedDate;

        // Configurar dia da semana
        const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        document.getElementById('day').value = days[today.getDay()];

        // Configurar hora atual para a primeira formada
        const hours = today.getHours().toString().padStart(2, '0');
        const minutes = today.getMinutes().toString().padStart(2, '0');
        document.querySelector('.production-time').value = `${hours}:${minutes}`;

        // Carregar dados salvos se existirem
        loadSavedData();

        // Configurar aba de histórico
        setupHistoryTab();

        // Event listeners
        setupEventListeners();
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Cálculo de sobras
        document.querySelectorAll('.produced, .sold').forEach(input => {
            input.addEventListener('input', calculateRemaining);
        });

        // Botões
        document.getElementById('add-row').addEventListener('click', addNewRow);
        document.getElementById('reset').addEventListener('click', resetAll);
        document.getElementById('export-excel').addEventListener('click', exportToExcel);
        document.getElementById('export-pdf').addEventListener('click', exportToPDF);
        document.getElementById('print').addEventListener('click', printPage);
        document.getElementById('save-data').addEventListener('click', saveData);

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', switchTab);
        });

        // Crocância
        document.querySelectorAll('.crispness').forEach(input => {
            input.addEventListener('input', calculateCrispnessValidity);
        });

        document.querySelectorAll('.production-time').forEach(input => {
            input.addEventListener('change', calculateCrispnessValidity);
        });

        // Salvar dados quando a página for fechada
        window.addEventListener('beforeunload', saveData);
    }

    // Configurar aba de histórico
    function setupHistoryTab() {
        loadAllHistoryData();
        document.getElementById('filter-history').addEventListener('click', filterHistoryData);
        document.getElementById('reset-filters').addEventListener('click', resetHistoryFilters);
        document.getElementById('export-demand').addEventListener('click', exportForDemandPrivisor);
    }

    // Carregar todos os dados históricos
    function loadAllHistoryData() {
        const savedData = JSON.parse(localStorage.getItem('breadProductionData') || {});
        allHistoryData = [];
        
        Object.keys(savedData).forEach(date => {
            const dayData = savedData[date];
            let totalProduced = 0;
            let totalSold = 0;
            
            dayData.batches.forEach(batch => {
                totalProduced += parseFloat(batch.produced) || 0;
                totalSold += parseFloat(batch.sold) || 0;
            });
            
            const totalRemaining = totalProduced - totalSold;
            const saleRate = totalProduced > 0 ? (totalSold / totalProduced * 100).toFixed(1) : 0;
            const isHoliday = holidays.includes(date);
            
            allHistoryData.push({
                date,
                day: dayData.day,
                produced: totalProduced,
                sold: totalSold,
                remaining: totalRemaining,
                rate: saleRate,
                promotion: dayData.promotion || 'Não',
                temperature: dayData.temperature || '',
                isHoliday,
                fullData: dayData
            });
        });
        
        // Ordenar por data (mais recente primeiro)
        allHistoryData.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        renderHistoryTable(allHistoryData);
    }

    // Renderizar tabela de histórico
    function renderHistoryTable(data) {
        const tbody = document.getElementById('history-data');
        tbody.innerHTML = '';
        
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(item.date)}</td>
                <td>${item.day}</td>
                <td>${item.produced}</td>
                <td>${item.sold}</td>
                <td class="${item.remaining > 0 ? 'highlight' : 'positive'}">${item.remaining}</td>
                <td>${item.rate}%</td>
                <td>${item.promotion}</td>
                <td>
                    <select class="holiday-input" data-date="${item.date}" 
                        onchange="toggleHoliday(this)" title="Marcar como feriado">
                        <option value="0" ${!item.isHoliday ? 'selected' : ''}>Não</option>
                        <option value="1" ${item.isHoliday ? 'selected' : ''}>Sim</option>
                    </select>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm" onclick="editHistoryRecord('${item.date}')">Editar</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteHistoryRecord('${item.date}')">Excluir</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('total-records').textContent = `${data.length} registros encontrados`;
    }

    // Filtrar dados históricos
    function filterHistoryData() {
        const dateFilter = document.getElementById('history-date').value;
        const dayFilter = document.getElementById('history-day').value;
        const promotionFilter = document.getElementById('history-promotion').value;
        
        let filteredData = [...allHistoryData];
        
        if (dateFilter) {
            filteredData = filteredData.filter(item => item.date === dateFilter);
        }
        
        if (dayFilter) {
            filteredData = filteredData.filter(item => item.day === dayFilter);
        }
        
        if (promotionFilter) {
            filteredData = filteredData.filter(item => item.promotion === promotionFilter);
        }
        
        renderHistoryTable(filteredData);
    }

    // Resetar filtros do histórico
    function resetHistoryFilters() {
        document.getElementById('history-date').value = '';
        document.getElementById('history-day').value = '';
        document.getElementById('history-promotion').value = '';
        renderHistoryTable(allHistoryData);
    }

    // Alternar entre abas
    function switchTab(e) {
        const tabId = e.target.getAttribute('data-tab');

        // Remover classe active de todas as tabs e conteúdos
        document.querySelectorAll('.tab, .tab-content').forEach(el => {
            el.classList.remove('active');
        });

        // Adicionar classe active à tab e conteúdo selecionados
        e.target.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Se for a aba de análise, atualizar gráficos
        if (tabId === 'analysis') {
            updateCharts();
        }
    }

    // Calcular sobras e estatísticas
    function calculateRemaining() {
        const rows = document.querySelectorAll('#production-table tbody tr');
        let totalProduced = 0;
        let totalSold = 0;
        let totalCrispness = 0;
        let crispnessCount = 0;
        let totalEfficiency = 0;
        let efficiencyCount = 0;

        rows.forEach(row => {
            const producedInput = row.querySelector('.produced');
            const soldInput = row.querySelector('.sold');
            const crispnessInput = row.querySelector('.crispness');
            const remainingCell = row.querySelector('.remaining');

            const produced = parseFloat(producedInput.value) || 0;
            const sold = parseFloat(soldInput.value) || 0;
            const crispness = parseFloat(crispnessInput.value) || 0;

            const remaining = produced - sold;
            remainingCell.textContent = remaining >= 0 ? remaining : 0;

            totalProduced += produced;
            totalSold += sold;

            if (crispness > 0) {
                totalCrispness += crispness;
                crispnessCount++;
            }

            // Calcular eficiência por formada (vendido/produzido)
            if (produced > 0) {
                totalEfficiency += (sold / produced);
                efficiencyCount++;
            }
        });

        // Atualizar resumo
        document.getElementById('total-produced').textContent = totalProduced;
        document.getElementById('total-sold').textContent = totalSold;
        document.getElementById('total-remaining').textContent = Math.max(0, totalProduced - totalSold);

        const saleRate = totalProduced > 0 ? (totalSold / totalProduced * 100).toFixed(1) : 0;
        document.getElementById('sale-rate').textContent = `${saleRate}%`;

        const avgCrispness = crispnessCount > 0 ? (totalCrispness / crispnessCount).toFixed(1) : 0;
        document.getElementById('avg-crispness').textContent = avgCrispness;

        const avgEfficiency = efficiencyCount > 0 ? (totalEfficiency / efficiencyCount * 100).toFixed(1) : 0;
        document.getElementById('efficiency').textContent = `${avgEfficiency}%`;

        // Mostrar/ocultar sugestões baseadas em sobras
        const remaining = totalProduced - totalSold;
        const suggestionsBox = document.getElementById('suggestions-box');
        const suggestionsList = document.getElementById('suggestions-list');

        if (remaining > 0) {
            suggestionsBox.style.display = 'block';
            suggestionsList.innerHTML = generateSuggestions(remaining, totalProduced, totalSold);
        } else {
            suggestionsBox.style.display = 'none';
        }
    }

    // Gerar sugestões para reduzir sobras
    function generateSuggestions(remaining, totalProduced, totalSold) {
        const saleRate = totalProduced > 0 ? (totalSold / totalProduced * 100) : 0;
        const suggestions = [];

        if (saleRate < 70) {
            suggestions.push(`Ajuste sua produção: Reduza em ${Math.round(remaining * 1.2)} unidades na próxima fornada.`);
            suggestions.push(`Considere fazer promoções relâmpago para produtos que estão sobrando.`);
        } else if (saleRate < 85) {
            suggestions.push(`Ajuste fino: Reduza em ${Math.round(remaining)} unidades na próxima fornada.`);
        } else if (saleRate < 95) {
            suggestions.push(`Você está quase no ponto ideal! Ajuste de apenas ${Math.round(remaining * 0.5)} unidades pode otimizar.`);
        }

        suggestions.push(`Sobras atuais podem ser transformadas em torradas, farinha de rosca ou doações.`);

        if (remaining > totalProduced * 0.3) {
            suggestions.push(`<strong>ATENÇÃO:</strong> Produzindo ${Math.round((remaining / totalProduced) * 100)}% a mais do que vende. Reavalie.`);
        }

        return suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('');
    }

    // Adicionar nova linha
    function addNewRow() {
        const tbody = document.querySelector('#production-table tbody');
        const lastRow = tbody.lastElementChild;
        const newRowNum = parseInt(lastRow.cells[0].textContent) + 1;

        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${newRowNum}</td>
            <td><input type="time" class="form-control production-time"></td>
            <td><input type="number" class="form-control produced" min="0" step="1"></td>
            <td><input type="number" class="form-control crispness" min="0" step="0.1"></td>
            <td class="crispness-validity">-</td>
            <td><input type="number" class="form-control sold" min="0" step="1"></td>
            <td class="remaining">0</td>
            <td><input type="text" class="form-control notes"></td>
        `;

        tbody.appendChild(newRow);

        // Adicionar event listeners aos novos inputs
        newRow.querySelector('.produced').addEventListener('input', calculateRemaining);
        newRow.querySelector('.sold').addEventListener('input', calculateRemaining);
        newRow.querySelector('.crispness').addEventListener('input', calculateCrispnessValidity);
        newRow.querySelector('.production-time').addEventListener('change', calculateCrispnessValidity);
    }

    // Resetar tudo
    function resetAll() {
        if (confirm('Tem certeza que deseja limpar todos os dados?')) {
            document.querySelectorAll('#production-table tbody input').forEach(input => {
                if (input.type === 'time') {
                    // Mantém a hora atual para a primeira linha
                    if (input === document.querySelector('.production-time')) {
                        const now = new Date();
                        const hours = now.getHours().toString().padStart(2, '0');
                        const minutes = now.getMinutes().toString().padStart(2, '0');
                        input.value = `${hours}:${minutes}`;
                    } else {
                        input.value = '';
                    }
                } else if (input.type === 'number' || input.type === 'text') {
                    input.value = '';
                }
            });

            document.querySelectorAll('.remaining').forEach(cell => {
                cell.textContent = '0';
            });

            document.getElementById('temperature').value = '';
            document.getElementById('promotion-no').checked = true;

            calculateRemaining();
        }
    }

    // Salvar dados no localStorage
    function saveData() {
        const productionData = {
            date: document.getElementById('date').value,
            day: document.getElementById('day').value,
            temperature: document.getElementById('temperature').value,
            promotion: document.querySelector('input[name="promotion"]:checked').value,
            batches: []
        };

        document.querySelectorAll('#production-table tbody tr').forEach(row => {
            const batch = {
                batchNumber: row.cells[0].textContent,
                productionTime: row.querySelector('.production-time').value,
                produced: row.querySelector('.produced').value,
                crispness: row.querySelector('.crispness').value,
                sold: row.querySelector('.sold').value,
                remaining: row.querySelector('.remaining').textContent,
                notes: row.querySelector('.notes').value
            };

            productionData.batches.push(batch);
        });

        // Salvar no localStorage
        const savedData = JSON.parse(localStorage.getItem('breadProductionData') || '{}');
        savedData[productionData.date] = productionData;
        localStorage.setItem('breadProductionData', JSON.stringify(savedData));

        // Atualizar histórico
        loadAllHistoryData();

        // Feedback visual
        const saveBtn = document.getElementById('save-data');
        saveBtn.textContent = 'Salvo!';
        saveBtn.style.backgroundColor = '#2e7d32';
        setTimeout(() => {
            saveBtn.textContent = 'Salvar';
            saveBtn.style.backgroundColor = '';
        }, 2000);
    }

    // Carregar dados salvos
    function loadSavedData() {
        const today = document.getElementById('date').value;
        const savedData = JSON.parse(localStorage.getItem('breadProductionData') || '{}');

        if (savedData[today]) {
            const data = savedData[today];

            // Preencher metadados
            document.getElementById('day').value = data.day || '';
            document.getElementById('temperature').value = data.temperature || '';
            if (data.promotion === 'Sim') {
                document.getElementById('promotion-yes').checked = true;
            } else {
                document.getElementById('promotion-no').checked = true;
            }

            // Preencher dados de produção
            data.batches.forEach((batch, index) => {
                const row = document.querySelectorAll('#production-table tbody tr')[index];
                if (row) {
                    row.querySelector('.production-time').value = batch.productionTime || '';
                    row.querySelector('.produced').value = batch.produced || '';
                    row.querySelector('.crispness').value = batch.crispness || '';
                    row.querySelector('.sold').value = batch.sold || '';
                    row.querySelector('.notes').value = batch.notes || '';
                }
            });

            // Recalcular
            calculateRemaining();
            calculateCrispnessValidity();
        }
    }

    // Atualizar gráficos
    function updateCharts() {
        const savedData = JSON.parse(localStorage.getItem('breadProductionData') || '{}');
        const dates = Object.keys(savedData).sort();
        const last7Dates = dates.slice(-7); // Últimos 7 dias

        // Preparar dados para os gráficos
        const productionData = [];
        const soldData = [];
        const wasteData = [];
        const efficiencyData = [];

        last7Dates.forEach(date => {
            const dayData = savedData[date];
            let dayProduced = 0;
            let daySold = 0;

            dayData.batches.forEach(batch => {
                dayProduced += parseFloat(batch.produced) || 0;
                daySold += parseFloat(batch.sold) || 0;
            });

            const dayWaste = dayProduced - daySold;
            const dayEfficiency = dayProduced > 0 ? (daySold / dayProduced * 100) : 0;

            productionData.push(dayProduced);
            soldData.push(daySold);
            wasteData.push(dayWaste);
            efficiencyData.push(dayEfficiency);
        });

        // Gráfico de produção vs vendas
        const productionCtx = document.getElementById('production-chart').getContext('2d');

        if (productionChart) {
            productionChart.destroy();
        }

        productionChart = new Chart(productionCtx, {
            type: 'bar',
            data: {
                labels: last7Dates,
                datasets: [
                    {
                        label: 'Produzido',
                        data: productionData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Vendido',
                        data: soldData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Produção vs Vendas (Últimos 7 dias)'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function (context) {
                                const index = context.dataIndex;
                                const efficiency = efficiencyData[index];
                                return `Eficiência: ${efficiency.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    }
                }
            }
        });

        // Gráfico de desperdício
        const wasteCtx = document.getElementById('waste-chart').getContext('2d');

        if (wasteChart) {
            wasteChart.destroy();
        }

        wasteChart = new Chart(wasteCtx, {
            type: 'line',
            data: {
                labels: last7Dates,
                datasets: [
                    {
                        label: 'Sobras',
                        data: wasteData,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução das Sobras (Últimos 7 dias)'
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function (context) {
                                const index = context.dataIndex;
                                const waste = wasteData[index];
                                const produced = productionData[index];
                                const wastePercent = produced > 0 ? (waste / produced * 100) : 0;
                                return `Representa ${wastePercent.toFixed(1)}% da produção`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    }
                }
            }
        });

        // Gerar recomendações baseadas nos dados
        generateDataSuggestions(last7Dates, productionData, soldData, wasteData);
    }

    // Gerar recomendações baseadas em dados históricos
    function generateDataSuggestions(dates, productionData, soldData, wasteData) {
        const suggestions = [];
        const dataSuggestions = document.getElementById('data-suggestions');

        // Calcular médias
        const avgProduction = productionData.reduce((a, b) => a + b, 0) / productionData.length;
        const avgWaste = wasteData.reduce((a, b) => a + b, 0) / wasteData.length;
        const avgEfficiency = soldData.reduce((a, b, i) => a + (b / productionData[i] * 100), 0) / soldData.length;

        // Sugestão 1: Dias com maior desperdício
        const maxWasteIndex = wasteData.indexOf(Math.max(...wasteData));
        if (wasteData[maxWasteIndex] > avgWaste * 1.5) {
            suggestions.push(`<strong>${dates[maxWasteIndex]}:</strong> Foi o dia com maior desperdício (${wasteData[maxWasteIndex]} unidades). Revise a produção para este dia da semana.`);
        }

        // Sugestão 2: Tendência geral
        if (wasteData[wasteData.length - 1] > avgWaste) {
            suggestions.push(`As sobras estão acima da média recente. Considere reduzir a produção em ${Math.round((wasteData[wasteData.length - 1] - avgWaste) / wasteData.length)} unidades por fornada.`);
        } else if (wasteData[wasteData.length - 1] < avgWaste * 0.5) {
            suggestions.push(`As sobras estão abaixo da média recente. Você pode aumentar a produção com segurança.`);
        }

        // Sugestão 3: Eficiência
        if (avgEfficiency < 80) {
            suggestions.push(`Sua eficiência média é de ${avgEfficiency.toFixed(1)}%. Melhore o ajuste entre produção e demanda para reduzir desperdícios.`);
        } else {
            suggestions.push(`Ótima eficiência média de ${avgEfficiency.toFixed(1)}%! Continue monitorando para manter esse desempenho.`);
        }

        dataSuggestions.innerHTML = suggestions.map(s => `<div class="suggestion-item">${s}</div>`).join('');
    }

    // Exportar para Excel
    function exportToExcel() {
        const workbook = XLSX.utils.book_new();
        const worksheetData = [];

        // Adicionar cabeçalho
        const headers = [];
        document.querySelectorAll('#production-table thead th').forEach(th => {
            headers.push(th.textContent);
        });
        worksheetData.push(headers);

        // Adicionar dados
        document.querySelectorAll('#production-table tbody tr').forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach((cell, index) => {
                if (index === 0) {
                    rowData.push(cell.textContent);
                } else if (cell.querySelector('input')) {
                    const input = cell.querySelector('input');
                    rowData.push(input.value);
                } else {
                    rowData.push(cell.textContent);
                }
            });
            worksheetData.push(rowData);
        });

        // Adicionar metadados e resumo
        worksheetData.push([], ['Metadados']);
        worksheetData.push(['Dia da semana:', document.getElementById('day').value]);
        worksheetData.push(['Data:', document.getElementById('date').value]);
        worksheetData.push(['Temperatura Ambiente (°C):', document.getElementById('temperature').value]);
        worksheetData.push(['Promoção Ativa?:', document.querySelector('input[name="promotion"]:checked').value]);

        worksheetData.push([], ['Resumo do Dia']);
        worksheetData.push(['Total Produzido:', document.getElementById('total-produced').textContent]);
        worksheetData.push(['Total Vendido:', document.getElementById('total-sold').textContent]);
        worksheetData.push(['Total Sobrando:', document.getElementById('total-remaining').textContent]);
        worksheetData.push(['Taxa de Venda:', document.getElementById('sale-rate').textContent]);
        worksheetData.push(['Média Crocância:', document.getElementById('avg-crispness').textContent]);
        worksheetData.push(['Eficiência de Produção:', document.getElementById('efficiency').textContent]);

        // Adicionar sugestões se houver sobras
        if (document.getElementById('suggestions-box').style.display !== 'none') {
            worksheetData.push([], ['Sugestões para Reduzir Sobras']);
            const suggestions = document.querySelectorAll('#suggestions-list .suggestion-item');
            suggestions.forEach(suggestion => {
                worksheetData.push([suggestion.textContent.trim()]);
            });
        }

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Produção Pão Francês');

        // Gerar arquivo
        XLSX.writeFile(workbook, `producao_pao_frances_${document.getElementById('date').value}.xlsx`);
    }

    // Exportar para PDF
    function exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Título
        doc.setFontSize(16);
        doc.text('Relatório de Produção de Pão Francês', 105, 15, { align: 'center' });

        // Metadados
        doc.setFontSize(10);
        doc.text(`Data: ${document.getElementById('date').value}`, 20, 25);
        doc.text(`Dia da semana: ${document.getElementById('day').value}`, 20, 30);
        doc.text(`Temperatura: ${document.getElementById('temperature').value || 'N/A'}°C`, 20, 35);
        doc.text(`Promoção Ativa: ${document.querySelector('input[name="promotion"]:checked').value}`, 20, 40);

        // Tabela de produção (simplificada para mobile)
        doc.autoTable({
            startY: 45,
            head: [['Nº', 'Hora', 'Produzido', 'Vendido', 'Sobrando']],
            body: Array.from(document.querySelectorAll('#production-table tbody tr')).map(row => {
                return [
                    row.cells[0].textContent,
                    row.querySelector('.production-time').value || '-',
                    row.querySelector('.produced').value || '0',
                    row.querySelector('.sold').value || '0',
                    row.querySelector('.remaining').textContent
                ];
            }),
            styles: {
                fontSize: 8,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [242, 242, 242],
                textColor: 0,
                fontSize: 8
            },
            margin: { left: 15, right: 15 }
        });

        // Resumo
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Resumo do Dia', 15, finalY);

        doc.setFontSize(10);
        doc.text(`Total Produzido: ${document.getElementById('total-produced').textContent}`, 20, finalY + 8);
        doc.text(`Total Vendido: ${document.getElementById('total-sold').textContent}`, 20, finalY + 14);
        doc.text(`Total Sobrando: ${document.getElementById('total-remaining').textContent}`, 20, finalY + 20);
        doc.text(`Taxa de Venda: ${document.getElementById('sale-rate').textContent}`, 20, finalY + 26);
        doc.text(`Eficiência: ${document.getElementById('efficiency').textContent}`, 20, finalY + 32);

        // Sugestões se houver sobras
        if (document.getElementById('suggestions-box').style.display !== 'none') {
            const suggestionsY = finalY + 40;
            doc.setFontSize(12);
            doc.text('Sugestões para Reduzir Sobras', 15, suggestionsY);

            doc.setFontSize(9);
            const suggestions = document.querySelectorAll('#suggestions-list .suggestion-item');
            let currentY = suggestionsY + 8;

            suggestions.forEach(suggestion => {
                const text = suggestion.textContent.trim();
                if (currentY > 270) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.text(`• ${text}`, 20, currentY, { maxWidth: 170 });
                currentY += 6;
            });
        }

        // Data e hora
        doc.setFontSize(8);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 15, 285, { align: 'left' });

        // Salvar PDF
        doc.save(`producao_pao_frances_${document.getElementById('date').value}.pdf`);
    }

    // Exportar para Privisor de Demanda
    function exportForDemandPrivisor() {
        const filteredData = getFilteredHistoryData();
        const workbook = XLSX.utils.book_new();
        
        // Preparar dados no formato específico para o Privisor
        const privisorData = [
            ['Data', 'Unidades Vendidas'],
            ...filteredData.map(item => [item.date, item.sold])
        ];
        
        const worksheet = XLSX.utils.aoa_to_sheet(privosorData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados_Privisor');
        
        // Gerar arquivo
        XLSX.writeFile(workbook, `dados_vendas_para_privosor_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    // Obter dados filtrados do histórico
    function getFilteredHistoryData() {
        const dateFilter = document.getElementById('history-date').value;
        const dayFilter = document.getElementById('history-day').value;
        const promotionFilter = document.getElementById('history-promotion').value;
        
        let filteredData = [...allHistoryData];
        
        if (dateFilter) {
            filteredData = filteredData.filter(item => item.date === dateFilter);
        }
        
        if (dayFilter) {
            filteredData = filteredData.filter(item => item.day === dayFilter);
        }
        
        if (promotionFilter) {
            filteredData = filteredData.filter(item => item.promotion === promotionFilter);
        }
        
        return filteredData;
    }

    // Imprimir
    function printPage() {
        window.print();
    }

    // Calcular validade da crocância
    function calculateCrispnessValidity() {
        document.querySelectorAll('#production-table tbody tr').forEach(row => {
            const productionTime = row.querySelector('.production-time').value;
            const crispnessInput = row.querySelector('.crispness');
            const validityCell = row.querySelector('.crispness-validity');
    
            if (productionTime && crispnessInput.value) {
                const [hours, minutes] = productionTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;
                const crispnessHours = parseFloat(crispnessInput.value) || 0;
                
                // Calcula validade (horário de produção + tempo de crocância)
                const validityMinutes = totalMinutes + (crispnessHours * 60);
                const validityHours = Math.floor(validityMinutes / 60) % 24;
                const validityMins = validityMinutes % 60;
                
                validityCell.textContent = 
                    `${validityHours.toString().padStart(2, '0')}:${validityMins.toString().padStart(2, '0')}`;
                
                // Adiciona classes de aviso
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const remainingMinutes = validityMinutes - currentMinutes;
                
                validityCell.classList.remove('warning', 'danger');
                if (remainingMinutes > 0 && remainingMinutes < 60) {
                    validityCell.classList.add('warning'); // Amarelo: 1h ou menos
                } else if (remainingMinutes <= 0) {
                    validityCell.classList.add('danger'); // Vermelho: expirado
                }
            } else {
                validityCell.textContent = '-';
                validityCell.classList.remove('warning', 'danger');
            }
        });
    }

    // Formatar data
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    // Funções globais para uso no HTML
    window.toggleHoliday = function(selectElement) {
        const date = selectElement.getAttribute('data-date');
        const isHoliday = selectElement.value === '1';
        
        if (isHoliday && !holidays.includes(date)) {
            holidays.push(date);
        } else if (!isHoliday) {
            holidays = holidays.filter(d => d !== date);
        }
        
        localStorage.setItem('breadProductionHolidays', JSON.stringify(holidays));
        
        // Atualizar o item correspondente no allHistoryData
        const item = allHistoryData.find(item => item.date === date);
        if (item) {
            item.isHoliday = isHoliday;
        }
    };

    window.editHistoryRecord = function(date) {
        const record = allHistoryData.find(item => item.date === date);
        if (record) {
            // Preencher os campos do formulário com os dados do registro
            document.getElementById('date').value = record.date;
            document.getElementById('day').value = record.day;
            document.getElementById('temperature').value = record.temperature || '';
            document.getElementById(`promotion-${record.promotion === 'Sim' ? 'yes' : 'no'}`).checked = true;
            
            // Limpar as linhas existentes
            const tbody = document.querySelector('#production-table tbody');
            tbody.innerHTML = '';
            
            // Adicionar linhas com os dados do registro
            record.fullData.batches.forEach((batch, index) => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td>${index + 1}</td>
                    <td><input type="time" class="form-control production-time" value="${batch.productionTime || ''}"></td>
                    <td><input type="number" class="form-control produced" min="0" step="1" value="${batch.produced || ''}"></td>
                    <td><input type="number" class="form-control crispness" min="0" step="0.1" value="${batch.crispness || ''}"></td>
                    <td class="crispness-validity">-</td>
                    <td><input type="number" class="form-control sold" min="0" step="1" value="${batch.sold || ''}"></td>
                    <td class="remaining">${batch.remaining || '0'}</td>
                    <td><input type="text" class="form-control notes" value="${batch.notes || ''}"></td>
                `;
                tbody.appendChild(newRow);
                
                // Adicionar event listeners
                newRow.querySelector('.produced').addEventListener('input', calculateRemaining);
                newRow.querySelector('.sold').addEventListener('input', calculateRemaining);
                newRow.querySelector('.crispness').addEventListener('input', calculateCrispnessValidity);
                newRow.querySelector('.production-time').addEventListener('change', calculateCrispnessValidity);
            });
            
            // Calcular valores
            calculateRemaining();
            calculateCrispnessValidity();
            
            // Mudar para a aba de produção
            document.querySelectorAll('.tab, .tab-content').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector('.tab[data-tab="production"]').classList.add('active');
            document.getElementById('production-tab').classList.add('active');
            
            alert(`Registro de ${formatDate(date)} carregado para edição.`);
        }
    };

    window.deleteHistoryRecord = function(date) {
        if (confirm(`Tem certeza que deseja excluir o registro de ${formatDate(date)}?`)) {
            const savedData = JSON.parse(localStorage.getItem('breadProductionData') || '{}');
            delete savedData[date];
            localStorage.setItem('breadProductionData', JSON.stringify(savedData));
            
            // Atualizar a lista
            loadAllHistoryData();
            alert('Registro excluído com sucesso!');
        }
    };
});