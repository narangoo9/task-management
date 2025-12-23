

const API_URL = 'https://dummyjson.com/todos';

const DB_NAME = 'TaskManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';
let db = null;

function getTasks() {
    return stateManager ? stateManager.getState().tasks : [];
}

function getProjects() {
    return stateManager ? stateManager.getState().projects : [];
}

function getCurrentPage() {
    return stateManager ? stateManager.getState().currentPage : 'dashboard';
}

function getSearchQuery() {
    return stateManager ? stateManager.getState().searchQuery : '';
}

document.addEventListener('DOMContentLoaded', async () => {
    initializeDashboard();

    await initIndexedDB();

    await loadTasksFromIndexedDB(); 
    loadTasksFromStorage(); 
    loadTasks(); 
    setupEventListeners();
    setupModal();
    setupNavigation();
    setupSearch();
    updateDates();
    loadPageState(); 
    if (!getCurrentPage() || getCurrentPage() === 'dashboard') {
        showPage('dashboard'); 
    }
});

function initializeDashboard() {

    updateDates();

    initializeProjects();

    initializeCurrencyChart();
    initializeTrackingChart();
}

let currencyChart = null;
let trackingChart = null;
let hoveredDatasetIndex = -1;
let trackingHoveredDatasetIndex = -1;
let chartColors = [
    { border: 'rgb(102, 126, 234)', background: 'rgba(102, 126, 234, 0.1)' },
    { border: 'rgb(118, 75, 162)', background: 'rgba(118, 75, 162, 0.1)' },
    { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.1)' },
    { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.1)' },
    { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.1)' },
    { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.1)' }
];

function initializeCurrencyChart() {
    const ctx = document.getElementById('currencyChart');
    if (!ctx) return;

    const generateProjectData = (period) => {
        const now = new Date();
        const labels = [];
        
        let days = period === 'week' ? 7 : 30;

        const activeProjects = getProjects().filter(p => !p.completed).slice(0, 3);
        const projectDataArrays = activeProjects.map(project => {
            const dataArray = [];

            const progressHistory = project.progressHistory || [];
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0]; 

                const historyEntry = progressHistory.find(h => h.date === dateStr);
                if (historyEntry) {

                    dataArray.push(historyEntry.progress);
                } else {

                    const prevValue = dataArray.length > 0 ? dataArray[dataArray.length - 1] : (project.progress || 0);
                    dataArray.push(prevValue);
                }
            }
            
            return dataArray;
        });

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            if (period === 'week') {
                labels.push(date.toLocaleDateString('mn-MN', { weekday: 'short' }));
            } else {
                labels.push(date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }));
            }
        }
        
        return { labels, projectDataArrays };
    };

    const data = generateProjectData('week');
    const activeProjects = getProjects().filter(p => !p.completed).slice(0, 3);
    const projectNames = activeProjects.map(p => p.title);

    const datasets = projectNames.map((projectName, index) => {
        const color = chartColors[index % chartColors.length];
        return {
            label: projectName,
            data: data.projectDataArrays[index] || [],
            borderColor: color.border,
            backgroundColor: color.background,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        };
    });
    
    currencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart',
                delay: (context) => {

                    if (context.type === 'data' && context.mode === 'default') {
                        return context.dataIndex * 100 + context.datasetIndex * 200;
                    }
                    return 0;
                },
                onProgress: function(animation) {},
                onComplete: function(animation) {}
            },
            animations: {
                x: {
                    from: 0,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                y: {
                    from: 0,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                colors: {
                    duration: 2000
                }
            },
            transitions: {
                show: {
                    animations: {
                        x: {
                            from: 0
                        },
                        y: {
                            from: 0
                        }
                    }
                },
                hide: {
                    animations: {
                        x: {
                            to: 0
                        },
                        y: {
                            to: 0
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);

                            if (hoveredDatasetIndex >= 0 && hoveredDatasetIndex < labels.length) {
                                const hoveredLabel = labels[hoveredDatasetIndex];
                                labels.splice(hoveredDatasetIndex, 1);

                                hoveredLabel.font = {
                                    size: 14,
                                    weight: 'bold',
                                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                };
                                labels.unshift(hoveredLabel);

                                labels.slice(1).forEach(label => {
                                    label.font = {
                                        size: 12,
                                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                    };
                                });
                            } else {

                                labels.forEach(label => {
                                    label.font = {
                                        size: 12,
                                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                    };
                                });
                            }
                            
                            return labels;
                        }
                    },
                    onHover: function(e, legendItem) {
                        e.native.target.style.cursor = 'pointer';
                    },
                    onClick: function(e, legendItem) {
                        const index = legendItem.datasetIndex;
                        const chart = this.chart;
                        const meta = chart.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                        chart.update();
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        },
                        labelTextColor: function(context) {
                            return context.dataset.borderColor;
                        },

                        itemSort: function(a, b) {

                            if (hoveredDatasetIndex >= 0) {
                                if (a.datasetIndex === hoveredDatasetIndex) return -1;
                                if (b.datasetIndex === hoveredDatasetIndex) return 1;
                            }
                            return 0;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#8b8d97'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#8b8d97',
                        callback: function(value) {
                            return value.toFixed(0) + '%';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            onHover: function(event, activeElements) {
                const chart = this.chart;
                if (activeElements.length > 0) {
                    const newHoveredIndex = activeElements[0].datasetIndex;
                    if (hoveredDatasetIndex !== newHoveredIndex) {
                        hoveredDatasetIndex = newHoveredIndex;
                        chart.update('none');
                    }
                } else {
                    if (hoveredDatasetIndex !== -1) {
                        hoveredDatasetIndex = -1;
                        chart.update('none');
                    }
                }
            }
        },
        plugins: [{
            id: 'customHover',
            afterEvent: function(chart, args) {
                const event = args.event;
                const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                
                if (activeElements.length > 0) {
                    const newHoveredIndex = activeElements[0].datasetIndex;
                    if (hoveredDatasetIndex !== newHoveredIndex) {
                        hoveredDatasetIndex = newHoveredIndex;
                        chart.update('none');
                    }
                } else {
                    if (hoveredDatasetIndex !== -1) {
                        hoveredDatasetIndex = -1;
                        chart.update('none');
                    }
                }
            }
        }]
    });

    ctx.addEventListener('mouseleave', function() {

        hoveredDatasetIndex = -1;
        if (currencyChart) {
            currencyChart.update('none');
        }
    });

    const currencyFilter = document.getElementById('currencyFilter');
    if (currencyFilter) {
        currencyFilter.addEventListener('change', (e) => {
            updateChartData(currencyChart, e.target.value);
        });
    }
}

// Tracking хуудсанд график эхлүүлэх функц
function initializeTrackingChart() {
    const ctx = document.getElementById('trackingChart');
    if (!ctx) return;

    const generateTrackingData = (period) => {
        const now = new Date();
        const labels = [];
        
        let days = period === 'week' ? 7 : 30;
        
        // Бүх төслүүдийн өгөгдөл (дууссан болсон хэсэг оруулахгүй)
        const allProjects = getProjects().filter(p => !p.completed).slice(0, 3);
        const projectDataArrays = allProjects.map(project => {
            const dataArray = [];
            const progressHistory = project.progressHistory || [];
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const historyEntry = progressHistory.find(h => h.date === dateStr);
                if (historyEntry) {
                    dataArray.push(historyEntry.progress);
                } else {
                    const prevValue = dataArray.length > 0 ? dataArray[dataArray.length - 1] : (project.progress || 0);
                    dataArray.push(prevValue);
                }
            }
            
            return dataArray;
        });
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            if (period === 'week') {
                labels.push(date.toLocaleDateString('mn-MN', { weekday: 'short' }));
            } else {
                labels.push(date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }));
            }
        }
        
        return { labels, projectDataArrays };
    };

    const data = generateTrackingData('week');
    const projectNames = getProjects().filter(p => !p.completed).slice(0, 3).map(p => p.title);
    
    const datasets = projectNames.map((projectName, index) => {
        const color = chartColors[index % chartColors.length];
        return {
            label: projectName,
            data: data.projectDataArrays[index] || [],
            borderColor: color.border,
            backgroundColor: color.background,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        };
    });
    
    trackingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart',
                delay: (context) => {
                    if (context.type === 'data' && context.mode === 'default') {
                        return context.dataIndex * 100 + context.datasetIndex * 200;
                    }
                    return 0;
                }
            },
            animations: {
                x: {
                    from: 0,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                y: {
                    from: 0,
                    duration: 2000,
                    easing: 'easeInOutQuart'
                },
                colors: {
                    duration: 2000
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                        },
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            
                            if (trackingHoveredDatasetIndex >= 0 && trackingHoveredDatasetIndex < labels.length) {
                                const hoveredLabel = labels[trackingHoveredDatasetIndex];
                                labels.splice(trackingHoveredDatasetIndex, 1);
                                hoveredLabel.font = {
                                    size: 14,
                                    weight: 'bold',
                                    family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                };
                                labels.unshift(hoveredLabel);
                                
                                labels.slice(1).forEach(label => {
                                    label.font = {
                                        size: 12,
                                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                    };
                                });
                            } else {
                                labels.forEach(label => {
                                    label.font = {
                                        size: 12,
                                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                    };
                                });
                            }
                            
                            return labels;
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        },
                        labelTextColor: function(context) {
                            return context.dataset.borderColor;
                        },
                        itemSort: function(a, b) {
                            if (trackingHoveredDatasetIndex >= 0) {
                                if (a.datasetIndex === trackingHoveredDatasetIndex) return -1;
                                if (b.datasetIndex === trackingHoveredDatasetIndex) return 1;
                            }
                            return 0;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#8b8d97'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#8b8d97',
                        callback: function(value) {
                            return value.toFixed(0) + '%';
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            onHover: function(event, activeElements) {
                const chart = this.chart;
                if (activeElements.length > 0) {
                    const newHoveredIndex = activeElements[0].datasetIndex;
                    if (trackingHoveredDatasetIndex !== newHoveredIndex) {
                        trackingHoveredDatasetIndex = newHoveredIndex;
                        chart.update('none');
                    }
                } else {
                    if (trackingHoveredDatasetIndex !== -1) {
                        trackingHoveredDatasetIndex = -1;
                        chart.update('none');
                    }
                }
            }
        },
        plugins: [{
            id: 'customHoverTracking',
            afterEvent: function(chart, args) {
                const event = args.event;
                const activeElements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
                
                if (activeElements.length > 0) {
                    const newHoveredIndex = activeElements[0].datasetIndex;
                    if (trackingHoveredDatasetIndex !== newHoveredIndex) {
                        trackingHoveredDatasetIndex = newHoveredIndex;
                        chart.update('none');
                    }
                } else {
                    if (trackingHoveredDatasetIndex !== -1) {
                        trackingHoveredDatasetIndex = -1;
                        chart.update('none');
                    }
                }
            }
        }]
    });

    ctx.addEventListener('mouseleave', function() {
        trackingHoveredDatasetIndex = -1;
        if (trackingChart) {
            trackingChart.update('none');
        }
    });

    const trackingFilter = document.getElementById('trackingChartFilter');
    if (trackingFilter) {
        trackingFilter.addEventListener('change', (e) => {
            updateTrackingChartData(trackingChart, e.target.value);
        });
    }
}

// Tracking графикийн өгөгдөл шинэчлэх функц
function updateTrackingChartData(chart, period) {
    if (!chart) {
        console.warn('Tracking график байхгүй байна');
        return;
    }
    
    try {
        const now = new Date();
        const labels = [];
        let days = period === 'week' ? 7 : 30;
        
        const activeProjects = getProjects().filter(p => !p.completed).slice(0, 3);
        const projectNames = activeProjects.map(p => p.title);
        
        const projectDataArrays = activeProjects.map(project => {
            const dataArray = [];
            const progressHistory = project.progressHistory || [];
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const historyEntry = progressHistory.find(h => h.date === dateStr);
                if (historyEntry) {
                    dataArray.push(historyEntry.progress);
                } else {
                    const prevValue = dataArray.length > 0 ? dataArray[dataArray.length - 1] : (project.progress || 0);
                    dataArray.push(prevValue);
                }
            }
            
            return dataArray;
        });
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            if (period === 'week') {
                labels.push(date.toLocaleDateString('mn-MN', { weekday: 'short' }));
            } else {
                labels.push(date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }));
            }
        }
        
        chart.data.labels = labels;
        chart.data.datasets = projectNames.map((projectName, index) => {
            const color = chartColors[index % chartColors.length];
            return {
                label: projectName,
                data: projectDataArrays[index] || [],
                borderColor: color.border,
                backgroundColor: color.background,
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: color.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            };
        });
        
        chart.update('active');
    } catch (error) {
        console.error('updateTrackingChartData алдаа:', error);
    }
}

function updateChartData(chart, period) {
    if (!chart) {
        console.warn('График байхгүй байна');
        return;
    }
    
    try {
    
    const now = new Date();
    const labels = [];
    let days = period === 'week' ? 7 : 30;

    const activeProjects = getProjects().filter(p => !p.completed).slice(0, 3);
    const projectNames = activeProjects.map(p => p.title);
    
    const projectDataArrays = activeProjects.map(project => {
        const dataArray = [];

        const progressHistory = project.progressHistory || [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD формат

            const historyEntry = progressHistory.find(h => h.date === dateStr);
            if (historyEntry) {

                dataArray.push(historyEntry.progress);
            } else {

                const prevValue = dataArray.length > 0 ? dataArray[dataArray.length - 1] : (project.progress || 0);
                dataArray.push(prevValue);
            }
        }
        
        return dataArray;
    });

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        if (period === 'week') {
            labels.push(date.toLocaleDateString('mn-MN', { weekday: 'short' }));
        } else {
            labels.push(date.toLocaleDateString('mn-MN', { month: 'short', day: 'numeric' }));
        }
    }
    
    chart.data.labels = labels;
    chart.data.datasets = projectNames.map((projectName, index) => {
        const color = chartColors[index % chartColors.length];
        return {
            label: projectName,
            data: projectDataArrays[index] || [],
            borderColor: color.border,
            backgroundColor: color.background,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        };
    });

        chart.update('active');
    } catch (error) {
        console.error('updateChartData алдаа:', error);
    }
}

function updateDates() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('mn-MN', options);
    
    const currentDateEl = document.getElementById('currentDate');
    const headerDateEl = document.getElementById('headerDate');
    
    if (currentDateEl) currentDateEl.textContent = dateString;
    if (headerDateEl) headerDateEl.textContent = dateString;
}

function initializeProjects() {

    const initialProjects = [
        {
            id: 1,
            title: 'Хяналтын Самбарын Дизайн',
            description: 'Орчин үеийн хяналтын самбарын интерфейс үүсгэх',
            progress: 50,
            startDate: '09 1-р сар',
            endDate: '1 2-р сар',
            completed: false
        },
        {
            id: 2,
            title: 'Апп UI UX Дизайн',
            description: 'Хэрэглэгчийн интерфейс болон туршлагыг дизайн хийх',
            progress: 30,
            startDate: '15 1-р сар',
            endDate: '15 2-р сар',
            completed: false
        }
    ];
    if (stateManager) {
        stateManager.setProjects(initialProjects);
    }
    renderProjects();
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (stateManager) {
                stateManager.setSearchQuery(query);
            }
            if (query) {
                performSearch();
            } else {

                showPage(currentPage);
            }
        }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(searchTimeout);
            const query = e.target.value.trim().toLowerCase();
            if (stateManager) {
                stateManager.setSearchQuery(query);
            }
            if (query) {
                performSearch();
            } else {
                showPage(currentPage);
            }
        }
    });

    const searchBox = searchInput.parentElement;
    if (searchBox) {
        searchBox.style.cursor = 'pointer';
        searchBox.addEventListener('click', (e) => {

            if (e.target.classList.contains('fa-search')) {
                const query = searchInput.value.trim().toLowerCase();
                if (stateManager) {
                    stateManager.setSearchQuery(query);
                }
                if (query) {
                    performSearch();
                } else {
                    searchInput.focus();
                }
            }
        });
    }
}

function performSearch() {
    const query = getSearchQuery();
    if (!query) {

        loadPageData(getCurrentPage());
        return;
    }

    showSearchResults();
}

function showSearchResults() {

    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));
    
    const dashboardSections = document.getElementById('dashboardSections');
    if (dashboardSections) dashboardSections.style.display = 'none';

    let searchResultsPage = document.getElementById('searchResultsPage');
    if (!searchResultsPage) {

        searchResultsPage = document.createElement('div');
        searchResultsPage.id = 'searchResultsPage';
        searchResultsPage.className = 'page-content';
        document.querySelector('.main-content').appendChild(searchResultsPage);
    }
    
    searchResultsPage.classList.add('active');

    const query = getSearchQuery();
    const results = searchAllData(query);

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = `Хайлтын үр дүн: "${query}"`;
    }

    renderSearchResults(results, searchResultsPage);
}

function searchAllData(query) {
    const results = {
        projects: [],
        tasks: [],
        total: 0
    };

    results.projects = getProjects().filter(project => {
        const titleMatch = project.title.toLowerCase().includes(query);
        const descMatch = project.description && project.description.toLowerCase().includes(query);
        return titleMatch || descMatch;
    });

    results.tasks = getTasks().filter(task => {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descMatch = task.description && task.description.toLowerCase().includes(query);
        return titleMatch || descMatch;
    });
    
    results.total = results.projects.length + results.tasks.length;
    
    return results;
}

function renderSearchResults(results, container) {
    const query = getSearchQuery();
    const t = typeof window !== 'undefined' && typeof t === 'function' ? window.t : (key) => {
        if (typeof translations !== 'undefined' && typeof currentLanguage !== 'undefined') {
            return translations[currentLanguage] && translations[currentLanguage][key] ? translations[currentLanguage][key] : key;
        }
        return key;
    };
    
    if (results.total === 0) {
        container.innerHTML = `
            <div class="search-results-content">
                <div class="empty-state">
                    <h3>${typeof t === 'function' ? t('noSearchResults') : 'Хайлтын үр дүн олдсонгүй'}</h3>
                    <p>"${escapeHtml(query)}" ${typeof t === 'function' ? t('noSearchResultsText') : 'гэсэн утгаар хайлт хийсэн боловч үр дүн олдсонгүй.'}</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="search-results-content">
            <div class="search-summary">
                <h3>${results.total} ${currentLanguage === 'en' ? 'results found' : 'үр дүн олдлоо'}</h3>
                <p>"${escapeHtml(query)}" ${currentLanguage === 'en' ? 'search results' : 'гэсэн утгаар хайлт хийсэн'}</p>
            </div>
    `;

    if (results.projects.length > 0) {
        html += `
            <div class="search-section">
                <h4 class="search-section-title">
                    <i class="fas fa-folder"></i>
                    ${currentLanguage === 'en' ? 'Projects' : 'Төслүүд'} (${results.projects.length})
                </h4>
                <div class="search-results-grid">
        `;
        
        results.projects.forEach(project => {
            html += `
                <div class="search-result-card">
                    <div class="search-result-header">
                        <h5>${escapeHtml(project.title)}</h5>
                        <span class="result-type-badge project-badge">${currentLanguage === 'en' ? 'Project' : 'Төсөл'}</span>
                    </div>
                    <p class="search-result-description">${escapeHtml(project.description || '')}</p>
                    <div class="search-result-meta">
                        <span class="progress-info">${project.progress}% ${currentLanguage === 'en' ? 'Completed' : 'Дууссан'}</span>
                        <span class="date-info">${project.startDate} - ${project.endDate}</span>
                    </div>
                    <div class="search-result-actions">
                        <button class="btn-edit" onclick="editTask(${project.id})">${currentLanguage === 'en' ? 'Edit' : 'Засах'}</button>
                        <button class="btn-delete" onclick="deleteTask(${project.id})">${currentLanguage === 'en' ? 'Delete' : 'Устгах'}</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }

    if (results.tasks.length > 0) {
        html += `
            <div class="search-section">
                <h4 class="search-section-title">
                    <i class="fas fa-tasks"></i>
                    ${currentLanguage === 'en' ? 'Tasks' : 'Даалгаврууд'} (${results.tasks.length})
                </h4>
                <div class="search-results-list">
        `;
        
        results.tasks.forEach(task => {
            html += `
                <div class="search-result-item">
                    <div class="search-result-header">
                        <h5>${escapeHtml(task.title)}</h5>
                        <span class="result-type-badge task-badge">${currentLanguage === 'en' ? 'Task' : 'Даалгавар'}</span>
                    </div>
                    <p class="search-result-description">${escapeHtml(task.description || '')}</p>
                    <div class="search-result-meta">
                        <span class="status-badge ${task.completed ? 'completed' : 'active'}">
                            ${task.completed ? (currentLanguage === 'en' ? '✓ Completed' : '✓ Дууссан') : (currentLanguage === 'en' ? 'Active' : 'Идэвхтэй')}
                        </span>
                        <span class="date-info">${task.createdAt ? formatDate(task.createdAt) : ''}</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    container.innerHTML = html;
}

function setupEventListeners() {

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleAddTask);
    }

    const projectForm = document.getElementById('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', handleAddProject);
    }

    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const modal = document.getElementById('taskModal');
            if (modal) modal.classList.add('show');
        });
    }

    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', () => {
            const modal = document.getElementById('projectModal');
            if (modal) modal.classList.add('show');
        });
    }

    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadBackup();
        });
    }

    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('restoreFileInput').click();
        });
    }

    const restoreFileInput = document.createElement('input');
    restoreFileInput.type = 'file';
    restoreFileInput.accept = '.json';
    restoreFileInput.id = 'restoreFileInput';
    restoreFileInput.style.display = 'none';
    restoreFileInput.addEventListener('change', handleRestoreFile);
    document.body.appendChild(restoreFileInput);
}

function setupNavigation() {

    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));

            item.classList.add('active');

            const text = item.querySelector('span').textContent.trim();
            if (text === 'Хяналтын Самбар') {
                showPage('dashboard');
            } else if (text === 'Хянах') {
                showPage('tracking');
            } else if (text === 'Төслүүд') {
                showPage('projects');
            } else if (text === 'Ажлын Түүх') {
                showPage('workHistory');
            } else if (text === 'Ирэх Хайрцаг') {
                showPage('inbox');
            }
        });
    });
}

function showPage(pageName) {
    if (stateManager) {
        stateManager.setCurrentPage(pageName);
    }

    const searchResultsPage = document.getElementById('searchResultsPage');
    if (searchResultsPage) searchResultsPage.classList.remove('active');

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        if (stateManager) {
            stateManager.setSearchQuery('');
        }
    }

    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));

    const dashboardSections = document.getElementById('dashboardSections');
    const pageTitle = document.getElementById('pageTitle');

    const pageTitles = {
        'dashboard': 'Хяналтын Самбар',
        'tracking': 'Хянах',
        'projects': 'Төслүүд',
        'workHistory': 'Ажлын Түүх',
        'inbox': 'Ирэх Хайрцаг'
    };
    
    if (pageTitle) {
        pageTitle.textContent = pageTitles[pageName] || 'Хяналтын Самбар';
    }
    
    if (pageName === 'dashboard') {

        if (dashboardSections) dashboardSections.style.display = 'block';
    } else {

        if (dashboardSections) dashboardSections.style.display = 'none';

        const pageMap = {
            'tracking': 'trackingPage',
            'projects': 'projectsPage',
            'workHistory': 'workHistoryPage',
            'inbox': 'inboxPage'
        };
        
        const pageId = pageMap[pageName];
        if (pageId) {
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');

                loadPageData(pageName);
            }
        }
    }

    savePageState();
}

function loadPageData(pageName) {
    switch(pageName) {
        case 'tracking':
            // Tracking хуудас ачаалагдвал графикийг шинэчлэх
            if (trackingChart) {
                const period = document.getElementById('trackingChartFilter')?.value || 'week';
                updateTrackingChartData(trackingChart, period);
            }
            break;
        case 'projects':
            renderAllProjects();
            break;
        case 'workHistory':
            renderWorkHistory();
            break;
        case 'inbox':
            renderInbox();
            break;
    }
}

function renderAllProjects() {
    const container = document.getElementById('allProjectsContainer');
    if (!container) return;
    
    const projects = getProjects();
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${currentLanguage === 'en' ? 'No projects found' : 'Төсөл олдсонгүй'}</h3>
                <p>${currentLanguage === 'en' ? 'Start by adding a new project!' : 'Шинэ төсөл нэмж эхлээрэй!'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = projects.map(project => `
        <div class="project-card ${project.completed ? 'completed' : ''}">
            <div class="project-card-header">
                <div>
                    <div class="project-card-title">${escapeHtml(project.title)}</div>
                    <div class="project-card-description">${escapeHtml(project.description || '')}</div>
                </div>
            </div>
            <div class="project-card-progress">
                <div class="project-card-progress-header">
                    <span>${project.progress}% ${currentLanguage === 'en' ? 'Completed' : 'Дууссан'}</span>
                </div>
                <div class="project-card-progress-bar">
                    <div class="project-card-progress-fill" style="width: ${project.progress}%"></div>
                </div>
            </div>
            <div class="project-card-dates">
                <span>${currentLanguage === 'en' ? 'Start Date:' : 'Эхлэх огноо:'} ${project.startDate}</span>
                <span>${currentLanguage === 'en' ? 'End Date:' : 'Дуусах огноо:'} ${project.endDate}</span>
            </div>
            <div class="project-card-actions">
                ${project.progress >= 80 && !project.completed 
                    ? `<button class="btn-complete" onclick="completeTask(${project.id})">${currentLanguage === 'en' ? 'Complete' : 'Дуусгах'}</button>` 
                    : project.completed 
                    ? '' 
                    : `<button class="btn-check" onclick="checkTask(${project.id})">Check</button>`}
                <button class="btn-edit" onclick="editTask(${project.id})">${currentLanguage === 'en' ? 'Edit' : 'Засах'}</button>
                <button class="btn-delete" onclick="deleteTask(${project.id})">${currentLanguage === 'en' ? 'Delete' : 'Устгах'}</button>
            </div>
        </div>
    `).join('');
}

function renderWorkHistory(filter = 'all') {
    const container = document.getElementById('historyContainer');
    if (!container) return;
    
    let completedItems = [...getProjects().filter(p => p.completed), ...getTasks().filter(t => t.completed)];

    const now = new Date();
    if (filter === 'today') {
        completedItems = completedItems.filter(item => {
            if (!item.createdAt) return false;
            const itemDate = new Date(item.createdAt);
            return itemDate.toDateString() === now.toDateString();
        });
    } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        completedItems = completedItems.filter(item => {
            if (!item.createdAt) return false;
            return new Date(item.createdAt) >= weekAgo;
        });
    } else if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        completedItems = completedItems.filter(item => {
            if (!item.createdAt) return false;
            return new Date(item.createdAt) >= monthAgo;
        });
    }
    
    if (completedItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${currentLanguage === 'en' ? 'No history found' : 'Түүх олдсонгүй'}</h3>
                <p>${currentLanguage === 'en' ? 'Completed work will appear here.' : 'Дууссан ажлууд энд харагдана.'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = completedItems.map(item => `
        <div class="history-item">
            <div class="history-item-header">
                <div class="history-item-title">${escapeHtml(item.title)}</div>
                <div class="history-item-date">${item.createdAt ? formatDate(item.createdAt) : (currentLanguage === 'en' ? 'Date unknown' : 'Огноо тодорхойгүй')}</div>
            </div>
            <p class="history-item-description">${escapeHtml(item.description || '')}</p>
        </div>
    `).join('');

    const historyFilter = document.getElementById('historyFilter');
    if (historyFilter) {
        historyFilter.addEventListener('change', (e) => {
            renderWorkHistory(e.target.value);
        });
    }
}

function renderInbox() {
    const container = document.getElementById('inboxContainer');
    if (!container) return;

    const inboxItems = [
        {
            id: 1,
            title: currentLanguage === 'en' ? 'New task added' : 'Шинэ даалгавар нэмэгдлээ',
            message: currentLanguage === 'en' ? 'A new task has been added to your "Dashboard Design" project.' : 'Таны "Хяналтын Самбарын Дизайн" төсөлд шинэ даалгавар нэмэгдлээ.',
            time: currentLanguage === 'en' ? '2 hours ago' : '2 цагийн өмнө',
            unread: true
        },
        {
            id: 2,
            title: currentLanguage === 'en' ? 'Project completed' : 'Төсөл дууслаа',
            message: currentLanguage === 'en' ? 'Your "App UI UX Design" project has been completed successfully.' : 'Таны "Апп UI UX Дизайн" төсөл амжилттай дууслаа.',
            time: currentLanguage === 'en' ? '5 hours ago' : '5 цагийн өмнө',
            unread: false
        }
    ];
    
    if (inboxItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>${currentLanguage === 'en' ? 'No messages' : 'Мэссэж байхгүй'}</h3>
                <p>${currentLanguage === 'en' ? 'New messages will appear here.' : 'Шинэ мэссэж ирэхэд энд харагдана.'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = inboxItems.map(item => `
        <div class="inbox-item ${item.unread ? 'unread' : ''}">
            <div class="message-avatar">${item.title.charAt(0)}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(item.title)}</span>
                    <span class="message-time">${item.time}</span>
                </div>
                <p class="message-text">${escapeHtml(item.message)}</p>
            </div>
        </div>
    `).join('');
}

function handleAddProject(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('projectTitle');
    const descriptionInput = document.getElementById('projectDescription');
    const startDateInput = document.getElementById('projectStartDate');
    const endDateInput = document.getElementById('projectEndDate');
    
    if (!titleInput || !descriptionInput || !startDateInput || !endDateInput) return;
    
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    if (!title) {
        alert(currentLanguage === 'en' ? 'Please enter project title' : 'Төслийн гарчиг оруулна уу');
        return;
    }
    
    const newProject = {
        id: Date.now(),
        title: title,
        description: description,
        progress: 0,
        progressHistory: [], 
        startDate: formatShortDate(startDate),
        endDate: formatShortDate(endDate),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    if (stateManager) {
        stateManager.addProject(newProject);
    }
    saveTasks();

    renderProjects();
    if (currentPage === 'projects') {
        renderAllProjects();
    }

    if (currencyChart) {
        const period = document.getElementById('currencyFilter')?.value || 'week';
        updateChartData(currencyChart, period);
    }

    const modal = document.getElementById('projectModal');
    if (modal) modal.classList.remove('show');

    titleInput.value = '';
    descriptionInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
}

function savePageState() {
    const page = getCurrentPage();
    localStorage.setItem('currentPage', page);
}

function loadPageState() {
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage) {
        showPage(savedPage);
    }
}

function setupModal() {
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close-modal');

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modals.forEach(modal => modal.classList.remove('show'));
        });
    });

    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    });
}

async function loadTasks() {
    try {

        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            try {
                const data = JSON.parse(storedTasks);
                if (stateManager) {
                    stateManager.setTasks(data.tasks || []);
                }
            } catch (error) {
                console.error('Error parsing stored tasks:', error);
                if (stateManager) {
                    stateManager.setTasks([]);
                }
            }
        }

        try {
            const response = await fetch(API_URL);
            const data = await response.json();

            const apiTasks = (data.todos || []).map(todo => ({
                id: todo.id,
                title: todo.todo,
                description: '', // DummyJSON дээр description байхгүй
                completed: todo.completed,
                createdAt: new Date().toISOString()
            }));

            const currentTasks = getTasks();
            const existingIds = new Set(currentTasks.map(t => t.id));
            apiTasks.forEach(apiTask => {
                if (!existingIds.has(apiTask.id)) {
                    if (stateManager) {
                        stateManager.addTask(apiTask);
                    }
                }
            });

            saveTasks();
        } catch (apiError) {
            console.error('Error loading tasks from API:', apiError);

        }

        renderProjects();
    } catch (error) {
        console.error('Error loading tasks:', error);

        tasks = [];
        renderProjects();
    }
}

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB алдаа:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB амжилттай нээгдлээ');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: false });
                objectStore.createIndex('title', 'title', { unique: false });
            }

            if (!database.objectStoreNames.contains('projects')) {
                const objectStore = database.createObjectStore('projects', { keyPath: 'id', autoIncrement: false });
                objectStore.createIndex('title', 'title', { unique: false });
            }
        };
    });
}

async function loadTasksFromIndexedDB() {
    if (!db) {
        console.log('IndexedDB хараахгүй байна');
        return;
    }
    
    try {
        const transaction = db.transaction([STORE_NAME, 'projects'], 'readonly');
        const taskStore = transaction.objectStore(STORE_NAME);
        const projectStore = transaction.objectStore('projects');
        
        const taskRequest = taskStore.getAll();
        const projectRequest = projectStore.getAll();
        
        await Promise.all([
            new Promise((resolve) => {
                taskRequest.onsuccess = () => {
                    if (taskRequest.result && taskRequest.result.length > 0) {
                        if (stateManager) {
                            stateManager.setTasks(taskRequest.result);
                        }
                        console.log('IndexedDB-аас task-ууд ачаалагдлаа:', taskRequest.result.length);
                    }
                    resolve();
                };
            }),
            new Promise((resolve) => {
                projectRequest.onsuccess = () => {
                    if (projectRequest.result && projectRequest.result.length > 0) {
                        if (stateManager) {
                            stateManager.setProjects(projectRequest.result);
                        }
                        console.log('IndexedDB-аас projects ачаалагдлаа:', projectRequest.result.length);
                    }
                    resolve();
                };
            })
        ]);
        
        renderProjects();
    } catch (error) {
        console.error('IndexedDB-аас ачаалах алдаа:', error);
    }
}

async function saveTasks() {
    try {

        if (db) {
            const transaction = db.transaction([STORE_NAME, 'projects'], 'readwrite');
            const taskStore = transaction.objectStore(STORE_NAME);
            const projectStore = transaction.objectStore('projects');

            await new Promise((resolve, reject) => {
                const clearTaskRequest = taskStore.clear();
                clearTaskRequest.onsuccess = () => {
                    const clearProjectRequest = projectStore.clear();
                    clearProjectRequest.onsuccess = () => {

                        const tasks = getTasks();
                        const projects = getProjects();
                        tasks.forEach(task => {
                            taskStore.add(task);
                        });
                        projects.forEach(project => {
                            projectStore.add(project);
                        });
                        resolve();
                    };
                    clearProjectRequest.onerror = () => reject(clearProjectRequest.error);
                };
                clearTaskRequest.onerror = () => reject(clearTaskRequest.error);
            });
            
            console.log('Task-ууд IndexedDB-д амжилттай хадгалагдлаа');
        }

        const tasks = getTasks();
        const projects = getProjects();
        localStorage.setItem('tasks', JSON.stringify({ tasks }));
        localStorage.setItem('projects', JSON.stringify({ projects }));
        console.log('Task-ууд localStorage-д амжилттай хадгалагдлаа');
    } catch (error) {
        console.error('Error saving tasks:', error);
    }
}

function loadTasksFromStorage() {
    const storedTasks = localStorage.getItem('tasks');
    const storedProjects = localStorage.getItem('projects');
    
    if (storedTasks) {
        try {
            const data = JSON.parse(storedTasks);
            if (stateManager) {
                stateManager.setTasks(data.tasks || []);
            }
        } catch (error) {
            console.error('Error parsing stored tasks:', error);
        }
    }
    
    if (storedProjects) {
        try {
            const data = JSON.parse(storedProjects);
            if (stateManager) {
                stateManager.setProjects(data.projects || []);
            }
            renderProjects();
        } catch (error) {
            console.error('Error parsing stored projects:', error);
        }
    }
}

async function handleAddTask(e) {
    e.preventDefault(); // Form-ийн default behavior-ийг зогсоох

    const titleInput = document.getElementById('taskTitle');
    const descriptionInput = document.getElementById('taskDescription');
    
    if (!titleInput || !descriptionInput) return;

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        alert(currentLanguage === 'en' ? 'Please enter task title' : 'Даалгаврын гарчиг оруулна уу');
        return;
    }
    
    try {

        const response = await fetch('https://dummyjson.com/todos/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                todo: title,
                completed: false,
                userId: 5, // Default userId
            })
        });
        
        const newTodo = await response.json();

        const newTask = {
            id: newTodo.id,
            title: newTodo.todo,
            description: description,
            completed: newTodo.completed,
            createdAt: new Date().toISOString()
        };

        if (stateManager) {
            stateManager.addTask(newTask);
        }

        const newProject = {
            id: Date.now(),
            title: title,
            description: description,
            progress: 0,
            progressHistory: [], // Progress history эхлүүлэх
            startDate: formatShortDate(new Date()),
            endDate: formatShortDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            completed: false,
            createdAt: new Date().toISOString()
        };

        if (stateManager) {
            stateManager.addProject(newProject);
        }

        saveTasks();

        renderProjects();

        if (currencyChart) {
            try {
                const period = document.getElementById('currencyFilter')?.value || 'week';
                updateChartData(currencyChart, period);
            } catch (error) {
                console.error('График шинэчлэхэд алдаа:', error);
            }
        }

        const modal = document.getElementById('taskModal');
        if (modal) modal.classList.remove('show');

        titleInput.value = '';
        descriptionInput.value = '';
    } catch (error) {
        console.error('Error adding task:', error);
        alert(currentLanguage === 'en' ? 'Error adding task. Please try again.' : 'Даалгавар нэмэхэд алдаа гарлаа. Дахин оролдоно уу.');
    }
}

function checkTask(id) {

    const project = stateManager ? stateManager.getProjectById(id) : getProjects().find(p => p.id === id);
    if (!project) return;

    if (project.completed) return;

    if (!project.progressHistory) {
        project.progressHistory = [];
    }

    if (project.progress < 80) {
        const currentStep = Math.floor(project.progress / 20);
        project.progress = (currentStep + 1) * 20;

        if (project.progress > 80) {
            project.progress = 80;
        }

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD формат
        if (!project.progressHistory) {
            project.progressHistory = [];
        }
        project.progressHistory.push({
            date: today,
            progress: project.progress
        });

        if (stateManager) {
            stateManager.updateProject(id, {
                progress: project.progress,
                progressHistory: project.progressHistory
            });
        }
    }

    saveTasks();

    renderProjects();
    if (getCurrentPage() === 'projects') {
        renderAllProjects();
    }

    if (currencyChart) {
        try {
            const period = document.getElementById('currencyFilter')?.value || 'week';
            updateChartData(currencyChart, period);
        } catch (error) {
            console.error('График шинэчлэхэд алдаа:', error);
        }
    }
}

function completeTask(id) {

    const project = stateManager ? stateManager.getProjectById(id) : getProjects().find(p => p.id === id);
    if (!project) return;

    const progressHistory = project.progressHistory || [];

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD формат
    progressHistory.push({
        date: today,
        progress: 100
    });

    if (stateManager) {
        stateManager.updateProject(id, {
            progress: 100,
            completed: true,
            progressHistory: progressHistory
        });
    }

    saveTasks();

    renderProjects();
    if (getCurrentPage() === 'projects') {
        renderAllProjects();
    }

    if (currencyChart) {
        try {
            const period = document.getElementById('currencyFilter')?.value || 'week';
            updateChartData(currencyChart, period);
        } catch (error) {
            console.error('График шинэчлэхэд алдаа:', error);
        }
    }
}

function deleteTask(id) {

    if (confirm(currentLanguage === 'en' ? 'Are you sure you want to delete this task?' : 'Та энэ даалгаврыг устгахдаа итгэлтэй байна уу?')) {

        if (stateManager) {
            stateManager.deleteProject(id);
        }

        saveTasks();

        renderProjects();

        if (currencyChart) {
            try {
                const period = document.getElementById('currencyFilter')?.value || 'week';
                updateChartData(currencyChart, period);
            } catch (error) {
                console.error('График шинэчлэхэд алдаа:', error);
            }
        }
    }
}

function editTask(id) {

    const project = stateManager ? stateManager.getProjectById(id) : getProjects().find(p => p.id === id);
    if (!project) return;

    const newTitle = prompt('Даалгаврын гарчиг засах:', project.title);
    if (newTitle === null) return; // Цуцлах тохиолдолд

    const newDescription = prompt('Даалгаврын тайлбар засах:', project.description || '');

    if (newTitle.trim()) {
        if (stateManager) {
            stateManager.updateProject(id, {
                title: newTitle.trim(),
                description: newDescription ? newDescription.trim() : ''
            });
        }

        saveTasks();

        renderProjects();

        if (currencyChart) {
            try {
                const period = document.getElementById('currencyFilter')?.value || 'week';
                updateChartData(currencyChart, period);
            } catch (error) {
                console.error('График шинэчлэхэд алдаа:', error);
            }
        }
    }
}

function renderProjects() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    
    const projects = getProjects();

    if (projects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Төсөл олдсонгүй</h3>
                <p>Шинэ төсөл нэмж эхлээрэй!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = projects.map(project => `
        <div class="project-card ${project.completed ? 'completed' : ''}">
            <div class="project-card-header">
                <div>
                    <div class="project-card-title">${escapeHtml(project.title)}</div>
                    <div class="project-card-description">${escapeHtml(project.description || '')}</div>
                </div>
            </div>
            <div class="project-card-progress">
                <div class="project-card-progress-header">
                    <span>${project.progress}% ${currentLanguage === 'en' ? 'Completed' : 'Дууссан'}</span>
                </div>
                <div class="project-card-progress-bar">
                    <div class="project-card-progress-fill" style="width: ${project.progress}%"></div>
                </div>
            </div>
            <div class="project-card-dates">
                <span>${currentLanguage === 'en' ? 'Start Date:' : 'Эхлэх огноо:'} ${project.startDate}</span>
                <span>${currentLanguage === 'en' ? 'End Date:' : 'Дуусах огноо:'} ${project.endDate}</span>
            </div>
            <div class="project-card-actions">
                ${project.progress >= 80 && !project.completed 
                    ? `<button class="btn-complete" onclick="completeTask(${project.id})">${currentLanguage === 'en' ? 'Complete' : 'Дуусгах'}</button>` 
                    : project.completed 
                    ? '' 
                    : `<button class="btn-check" onclick="checkTask(${project.id})">Check</button>`}
                <button class="btn-edit" onclick="editTask(${project.id})">${currentLanguage === 'en' ? 'Edit' : 'Засах'}</button>
                <button class="btn-delete" onclick="deleteTask(${project.id})">${currentLanguage === 'en' ? 'Delete' : 'Устгах'}</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatShortDate(date) {
    if (currentLanguage === 'en') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}`;
    } else {
        const months = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const locale = currentLanguage === 'en' ? 'en-US' : 'mn-MN';
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function downloadBackup() {
    try {
        const backupData = {
            tasks: getTasks(),
            projects: getProjects(),
            backupDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(backupData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `task-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(currentLanguage === 'en' ? 'Backup file downloaded successfully!' : 'Backup файл амжилттай татагдлаа!');
    } catch (error) {
        console.error('Backup татахад алдаа гарлаа:', error);
        alert(currentLanguage === 'en' ? 'Error downloading backup. Please try again.' : 'Backup татахад алдаа гарлаа. Дахин оролдоно уу.');
    }
}

async function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const fileText = await file.text();
        const backupData = JSON.parse(fileText);

        if (!confirm(currentLanguage === 'en' ? 'Are you sure you want to upload backup? Current tasks will be replaced.' : 'Та backup файлаа ачаалахдаа итгэлтэй байна уу? Одоогийн task-ууд солигдоно.')) {
            return;
        }

        if (backupData.tasks && Array.isArray(backupData.tasks)) {
            if (stateManager) {
                stateManager.setTasks(backupData.tasks);
            }
        }
        
        if (backupData.projects && Array.isArray(backupData.projects)) {
            if (stateManager) {
                stateManager.setProjects(backupData.projects);
            }
        }

        await saveTasks();

        renderProjects();
        
        alert(currentLanguage === 'en' ? 'Backup file uploaded successfully!' : 'Backup файл амжилттай ачаалагдлаа!');

        event.target.value = '';
    } catch (error) {
        console.error('Backup ачаалахад алдаа гарлаа:', error);
        alert(currentLanguage === 'en' ? 'Error uploading backup file. File format is incorrect.' : 'Backup файл ачаалахад алдаа гарлаа. Файлын формат буруу байна.');
    }
}
