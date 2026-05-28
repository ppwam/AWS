/**
 * Workspace Hub - Client Application Logic
 * Pure ES6 vanilla JavaScript with smooth DOM animations, async API integrations, S3 uploads, and dynamic layouts.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Digital Clock (Visible on all pages) ---
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        function updateClock() {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }
        setInterval(updateClock, 1000);
        updateClock(); // Initial run
    }

    // --- Global Connection Status Polling ---
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    let isOffline = false;

    async function checkServerStatus() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                setOnlineStatus(true);
            } else {
                setOnlineStatus(false);
            }
        } catch (error) {
            setOnlineStatus(false);
        }
    }

    function setOnlineStatus(online) {
        if (!statusDot || !statusText) return;
        if (online) {
            statusDot.className = 'status-dot online';
            statusText.textContent = '連線正常';
            if (isOffline) {
                isOffline = false;
                // Reload data once reconnected
                if (document.getElementById('notesList')) fetchNotes();
                if (document.getElementById('s3FilesTableBody')) fetchS3Files();
            }
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = '與伺服器中斷';
            isOffline = true;
        }
    }
    // Poll server status every 5 seconds
    setInterval(checkServerStatus, 5000);


    // ==========================================================================
    // PAGE 1: Home Dashboard & Notes Manager
    // ==========================================================================
    const isDashboard = document.getElementById('cpuPercent') !== null;
    if (isDashboard) {
        const elements = {
            cpuPercent: document.getElementById('cpuPercent'),
            cpuProgress: document.getElementById('cpuProgress'),
            cpuCores: document.getElementById('cpuCores'),
            cpuStatusDesc: document.getElementById('cpuStatusDesc'),
            
            memPercent: document.getElementById('memPercent'),
            memProgress: document.getElementById('memProgress'),
            memTotal: document.getElementById('memTotal'),
            memUsageText: document.getElementById('memUsageText'),
            memStatusDesc: document.getElementById('memStatusDesc'),
            
            diskPercent: document.getElementById('diskPercent'),
            diskProgress: document.getElementById('diskProgress'),
            diskTotal: document.getElementById('diskTotal'),
            diskUsageText: document.getElementById('diskUsageText'),
            diskStatusDesc: document.getElementById('diskStatusDesc'),
            
            osName: document.getElementById('osName'),
            pythonVersion: document.getElementById('pythonVersion'),
            serverUptime: document.getElementById('serverUptime'),
            
            noteForm: document.getElementById('noteForm'),
            noteInput: document.getElementById('noteInput'),
            notesList: document.getElementById('notesList'),
            notesCount: document.getElementById('notesCount')
        };

        // --- System Performance API Polling ---
        async function fetchStats() {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) throw new Error('API request failed');
                
                const result = await response.json();
                if (result.status === 'success') {
                    updateDashboardUI(result.data);
                    setOnlineStatus(true);
                }
            } catch (error) {
                console.error('Error fetching system stats:', error);
                setOnlineStatus(false);
                if (elements.cpuStatusDesc) {
                    elements.cpuStatusDesc.textContent = '連線中斷';
                    elements.cpuStatusDesc.className = 'status-desc';
                }
            }
        }

        function updateDashboardUI(data) {
            // CPU
            if (elements.cpuPercent) animateNumber(elements.cpuPercent, parseFloat(data.cpu.percent));
            if (elements.cpuProgress) elements.cpuProgress.style.width = `${data.cpu.percent}%`;
            if (elements.cpuCores) elements.cpuCores.textContent = `${data.cpu.cores} Cores`;
            if (elements.cpuStatusDesc) {
                elements.cpuStatusDesc.textContent = getCpuStatusDescription(data.cpu.percent);
                elements.cpuStatusDesc.className = `status-desc ${getCpuStatusColorClass(data.cpu.percent)}`;
            }

            // Memory
            if (elements.memPercent) animateNumber(elements.memPercent, parseFloat(data.memory.percent));
            if (elements.memProgress) elements.memProgress.style.width = `${data.memory.percent}%`;
            if (elements.memTotal) elements.memTotal.textContent = `${data.memory.total_gb} GB`;
            if (elements.memUsageText) elements.memUsageText.textContent = `已使用 ${data.memory.used_gb} GB`;
            if (elements.memStatusDesc) {
                elements.memStatusDesc.textContent = `剩餘 ${data.memory.free_gb} GB`;
                elements.memStatusDesc.className = `status-desc ${getResourceStatusColorClass(data.memory.percent)}`;
            }

            // Disk
            if (elements.diskPercent) animateNumber(elements.diskPercent, parseFloat(data.disk.percent));
            if (elements.diskProgress) elements.diskProgress.style.width = `${data.disk.percent}%`;
            if (elements.diskTotal) elements.diskTotal.textContent = `${data.disk.total_gb} GB`;
            if (elements.diskUsageText) elements.diskUsageText.textContent = `已使用 ${data.disk.used_gb} GB`;
            if (elements.diskStatusDesc) {
                elements.diskStatusDesc.textContent = `剩餘 ${data.disk.free_gb} GB`;
                elements.diskStatusDesc.className = `status-desc ${getResourceStatusColorClass(data.disk.percent)}`;
            }

            // Server Info
            if (elements.osName) elements.osName.textContent = data.os_name;
            if (elements.pythonVersion) elements.pythonVersion.textContent = `v${data.python_version}`;
            if (elements.serverUptime) elements.serverUptime.textContent = data.uptime;
        }

        // Helper to animate numbers smoothly
        function animateNumber(element, targetValue) {
            const startValue = parseFloat(element.textContent) || 0.0;
            if (startValue === targetValue) return;

            const duration = 800; // milliseconds
            const startTime = performance.now();

            function updateStep(currentTime) {
                const elapsedTime = currentTime - startTime;
                if (elapsedTime >= duration) {
                    element.textContent = targetValue.toFixed(1);
                    return;
                }

                // Ease Out Quad formula
                const progress = elapsedTime / duration;
                const easeProgress = progress * (2 - progress);
                const currentValue = startValue + (targetValue - startValue) * easeProgress;
                
                element.textContent = currentValue.toFixed(1);
                requestAnimationFrame(updateStep);
            }

            requestAnimationFrame(updateStep);
        }

        function getCpuStatusDescription(percent) {
            if (percent < 20) return '極低負載';
            if (percent < 50) return '運作流暢';
            if (percent < 85) return '中度負載';
            return '高度負荷';
        }

        function getCpuStatusColorClass(percent) {
            if (percent < 50) return 'text-teal';
            if (percent < 85) return 'text-blue';
            return 'text-purple';
        }

        function getResourceStatusColorClass(percent) {
            if (percent < 70) return 'text-teal';
            if (percent < 90) return 'text-blue';
            return 'text-purple';
        }

        // Start stats polling
        fetchStats();
        setInterval(fetchStats, 3000);

        // --- Workspace Notes (CRUD) Management ---
        async function fetchNotes() {
            try {
                const response = await fetch('/api/notes');
                if (!response.ok) throw new Error('Failed to load notes');
                
                const result = await response.json();
                if (result.status === 'success') {
                    renderNotes(result.data);
                }
            } catch (error) {
                console.error('Error fetching notes:', error);
                if (elements.notesList) {
                    elements.notesList.innerHTML = `
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-purple"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                            <p>無法讀取便簽，請確認伺服器連線狀態。</p>
                        </div>
                    `;
                }
            }
        }

        function renderNotes(notes) {
            if (elements.notesCount) elements.notesCount.textContent = `${notes.length} 則紀錄`;
            if (!elements.notesList) return;
            
            if (notes.length === 0) {
                elements.notesList.innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                        <p>目前沒有任何便簽，快新增一個靈感吧！</p>
                    </div>
                `;
                return;
            }

            // Sort descending by ID (timestamp) so newest is on top
            notes.sort((a, b) => b.id - a.id);

            elements.notesList.innerHTML = '';
            notes.forEach(note => {
                const noteNode = createNoteElement(note);
                elements.notesList.appendChild(noteNode);
            });
        }

        function createNoteElement(note) {
            const item = document.createElement('div');
            item.className = 'note-item';
            item.dataset.id = note.id;
            
            item.innerHTML = `
                <div class="note-content-area">
                    <span class="note-text">${escapeHtml(note.content)}</span>
                    <span class="note-date">${note.created_at}</span>
                </div>
                <button class="delete-btn" aria-label="Delete note">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
            `;

            // Bind delete action
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteNote(note.id, item));

            return item;
        }

        // Add Note Form Submit
        if (elements.noteForm) {
            elements.noteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const content = elements.noteInput.value.trim();
                if (!content) return;
                
                if (isOffline) {
                    alert('伺服器離線中，無法新增便簽。');
                    return;
                }

                try {
                    elements.noteInput.disabled = true;
                    
                    const response = await fetch('/api/notes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ content })
                    });

                    if (!response.ok) throw new Error('Failed to create note');
                    
                    const result = await response.json();
                    if (result.status === 'success') {
                        elements.noteInput.value = '';
                        
                        // If it was empty state, clear it
                        if (elements.notesList.querySelector('.empty-state')) {
                            elements.notesList.innerHTML = '';
                        }
                        
                        // Prepend new note item with animation
                        const newNoteNode = createNoteElement(result.data);
                        elements.notesList.insertBefore(newNoteNode, elements.notesList.firstChild);
                        
                        // Recalculate count
                        const currentCount = elements.notesList.querySelectorAll('.note-item').length;
                        elements.notesCount.textContent = `${currentCount} 則紀錄`;
                    }
                } catch (error) {
                    console.error('Error adding note:', error);
                    alert('新增便簽失敗，請稍後重試。');
                } finally {
                    elements.noteInput.disabled = false;
                    elements.noteInput.focus();
                }
            });
        }

        // Delete Note API integration
        async function deleteNote(id, noteElement) {
            if (isOffline) {
                alert('伺服器離線中，無法刪除便簽。');
                return;
            }

            try {
                const response = await fetch(`/api/notes/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Failed to delete note');
                
                const result = await response.json();
                if (result.status === 'success') {
                    noteElement.classList.add('removing');
                    
                    noteElement.addEventListener('animationend', () => {
                        noteElement.remove();
                        const currentCount = elements.notesList.querySelectorAll('.note-item').length;
                        elements.notesCount.textContent = `${currentCount} 則紀錄`;
                        
                        if (currentCount === 0) {
                            renderNotes([]);
                        }
                    });
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                alert('刪除便簽失敗。');
            }
        }

        // Initialize notes list
        fetchNotes();
    }


    // ==========================================================================
    // PAGE 2: Feature 1 - Taiwan Stock Dashboard
    // ==========================================================================
    const stockTableBody = document.getElementById('stockTableBody');
    if (stockTableBody) {
        const refreshStocksBtn = document.getElementById('refreshStocks');

        async function fetchStocks() {
            try {
                stockTableBody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state">
                                <div class="spinner"></div>
                                <p>正在加載今日漲停股票數據...</p>
                            </div>
                        </td>
                    </tr>
                `;
                
                const response = await fetch('/api/feature1');
                if (!response.ok) throw new Error('Failed to load stock data');
                
                const result = await response.json();
                if (result.status === 'success') {
                    renderStocks(result.data);
                }
            } catch (error) {
                console.error('Error fetching stocks:', error);
                stockTableBody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-purple"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                <p>無法讀取股票數據，請重新整理頁面。</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        function renderStocks(stocks) {
            if (stocks.length === 0) {
                stockTableBody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-state">
                                <p>今日無強勢漲停個股。</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            stockTableBody.innerHTML = '';
            stocks.forEach(stock => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong class="font-mono text-purple">${stock.code}</strong></td>
                    <td><strong>${stock.name}</strong></td>
                    <td><span class="font-mono font-bold">${stock.price.toFixed(1)}</span></td>
                    <td><span class="text-purple font-bold">▲ +${stock.change_value.toFixed(1)}</span></td>
                    <td><span class="table-badge table-badge-simulated">+${stock.change_percent.toFixed(1)}%</span></td>
                    <td class="font-mono">${stock.volume.toLocaleString()}</td>
                    <td><span class="info-label">${stock.industry}</span></td>
                    <td><span class="table-badge table-badge-success">鎖死漲停</span></td>
                `;
                stockTableBody.appendChild(tr);
            });
        }

        if (refreshStocksBtn) {
            refreshStocksBtn.addEventListener('click', fetchStocks);
        }

        // Load stocks initial
        fetchStocks();
    }


    // ==========================================================================
    // PAGE 3: Feature 2 - Afternoon Companies
    // ==========================================================================
    const companiesGrid = document.getElementById('companiesGrid');
    if (companiesGrid) {
        async function fetchCompanies() {
            try {
                companiesGrid.innerHTML = `
                    <div class="glass-card loading-card-full" style="grid-column: 1 / -1; width:100%;">
                        <div class="empty-state">
                            <div class="spinner"></div>
                            <p>正在加載下午上班公司數據...</p>
                        </div>
                    </div>
                `;
                
                const response = await fetch('/api/feature2');
                if (!response.ok) throw new Error('Failed to load companies');
                
                const result = await response.json();
                if (result.status === 'success') {
                    renderCompanies(result.data);
                }
            } catch (error) {
                console.error('Error fetching companies:', error);
                companiesGrid.innerHTML = `
                    <div class="glass-card loading-card-full" style="grid-column: 1 / -1; width:100%;">
                        <div class="empty-state">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-purple"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                            <p>無法讀取公司狀態，請檢查伺服器連線。</p>
                        </div>
                    </div>
                `;
            }
        }

        function renderCompanies(companies) {
            if (companies.length === 0) {
                companiesGrid.innerHTML = `
                    <div class="glass-card loading-card-full" style="grid-column: 1 / -1; width:100%;">
                        <div class="empty-state">
                            <p>無任何公司數據。</p>
                        </div>
                    </div>
                `;
                return;
            }

            companiesGrid.innerHTML = '';
            companies.forEach(company => {
                const card = document.createElement('div');
                card.className = 'glass-card company-card';
                card.innerHTML = `
                    <div class="company-card-header">
                        <div>
                            <h3 class="company-title">${company.name}</h3>
                            <span class="company-location">${company.location}</span>
                        </div>
                        <span class="table-badge table-badge-success">${company.status}</span>
                    </div>
                    <div class="company-card-body border-top" style="padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.03);">
                        <div class="company-detail-item">
                            <span class="company-detail-label">辦公時段</span>
                            <span class="company-detail-val font-mono">${company.hours}</span>
                        </div>
                        <div class="company-detail-item">
                            <span class="company-detail-label">上班模式</span>
                            <span class="company-detail-val text-blue">${company.mode}</span>
                        </div>
                        <div class="company-detail-item" style="flex-direction: column; gap: 0.25rem;">
                            <div style="display:flex; justify-content: space-between;">
                                <span class="company-detail-label">現場出席率</span>
                                <span class="company-detail-val font-mono text-teal">${company.attendance_rate}%</span>
                            </div>
                            <div class="attendance-progress-container">
                                <div class="attendance-progress-fill" style="width: ${company.attendance_rate}%;"></div>
                            </div>
                        </div>
                    </div>
                `;
                companiesGrid.appendChild(card);
            });
        }

        // Load companies initial
        fetchCompanies();
    }


    // ==========================================================================
    // PAGE 4: Feature 3 - S3 Cloud Upload Browser
    // ==========================================================================
    const s3FilesTableBody = document.getElementById('s3FilesTableBody');
    if (s3FilesTableBody) {
        const uploadDropzone = document.getElementById('uploadDropzone');
        const fileInput = document.getElementById('fileInput');
        const refreshS3Btn = document.getElementById('refreshS3Files');
        const selectFilesBtn = document.querySelector('.select-files-btn');
        const activeUploadsContainer = document.getElementById('activeUploadsContainer');
        const activeUploadsList = document.getElementById('activeUploadsList');

        // --- Fetch S3 Files ---
        async function fetchS3Files() {
            try {
                s3FilesTableBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            <div class="empty-state">
                                <div class="spinner"></div>
                                <p>正在讀取儲存桶檔案列表...</p>
                            </div>
                        </td>
                    </tr>
                `;

                const response = await fetch('/api/feature3/files');
                if (!response.ok) throw new Error('Failed to retrieve S3 files');
                
                const result = await response.json();
                renderS3Files(result);
            } catch (error) {
                console.error('Error fetching S3 list:', error);
                s3FilesTableBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            <div class="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-purple"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                                <p>讀取儲存桶檔案失敗，請檢查網路連線或 AWS 連線配置。</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        function renderS3Files(result) {
            const isMock = result.mode === 'simulated';
            const files = result.files || [];

            // Update S3 status banner dynamically on S3 page if elements exist
            const banner = document.getElementById('s3StatusBanner');
            const s3ModeText = document.getElementById('s3ModeText');
            const s3ModeDesc = document.getElementById('s3ModeDesc');
            
            if (banner && s3ModeText && s3ModeDesc) {
                if (isMock) {
                    banner.className = 'glass-card status-banner-card status-s3-simulated';
                    s3ModeText.textContent = '本地模擬測試中 (Simulated Mode)';
                    s3ModeDesc.innerHTML = '未檢測到 AWS 憑證，系統已啟用<strong>本機隔離儲存模擬</strong>。檔案將安全寫入 <code>data/s3_mock/</code> 目錄。';
                } else {
                    banner.className = 'glass-card status-banner-card status-s3-active';
                    s3ModeText.textContent = 'AWS 實體連線中';
                    s3ModeDesc.innerHTML = `成功連接至儲存桶 <strong>${result.bucket || 'bucket-for-hoodini'}</strong>。您的檔案已安全保存於 AWS S3 雲端。`;
                }
            }

            if (files.length === 0) {
                s3FilesTableBody.innerHTML = `
                    <tr>
                        <td colspan="4">
                            <div class="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                                <p>目前沒有任何檔案。請拖曳檔案到左側區域進行上傳！</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            s3FilesTableBody.innerHTML = '';
            files.forEach(file => {
                const tr = document.createElement('tr');
                tr.dataset.name = file.name;
                
                // Human-readable size
                const sizeStr = formatBytes(file.size_bytes);
                const badgeClass = isMock ? 'table-badge-simulated' : 'table-badge-success';
                const badgeLabel = isMock ? '模擬儲存' : 'S3 儲存';

                tr.innerHTML = `
                    <td><strong class="font-mono text-purple">${escapeHtml(file.name)}</strong></td>
                    <td class="font-mono">${sizeStr}</td>
                    <td class="font-mono text-secondary">${file.last_modified}</td>
                    <td>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <span class="table-badge ${badgeClass}">${badgeLabel}</span>
                            <button class="delete-btn delete-file-btn" aria-label="Delete file">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        </div>
                    </td>
                `;

                // Delete event listener
                const deleteBtn = tr.querySelector('.delete-file-btn');
                deleteBtn.addEventListener('click', () => deleteS3File(file.name, tr));

                s3FilesTableBody.appendChild(tr);
            });
        }

        // --- File Upload Handling ---
        function uploadSelectedFiles(files) {
            if (files.length === 0) return;
            activeUploadsContainer.classList.remove('hidden');

            Array.from(files).forEach(file => {
                // Ignore extremely large files (e.g. over 50MB) to protect resources
                if (file.size > 50 * 1024 * 1024) {
                    alert(`檔案 ${file.name} 超過 50MB 上限，無法上傳！`);
                    return;
                }

                // Render active progress item
                const progressId = 'upload_' + Math.random().toString(36).substr(2, 9);
                const progressItem = document.createElement('div');
                progressItem.className = 'progress-item';
                progressItem.id = progressId;
                progressItem.innerHTML = `
                    <div class="progress-info">
                        <span class="progress-filename" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                        <span class="progress-percentage" id="percent_${progressId}">0%</span>
                    </div>
                    <div class="progress-bar-container" style="height:6px; margin-bottom:0;">
                        <div class="progress-bar-fill fill-purple" id="fill_${progressId}" style="width: 0%"></div>
                    </div>
                `;
                activeUploadsList.appendChild(progressItem);

                // Perform AJAX file upload with progression listener
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append('file', file);

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        const percentText = document.getElementById(`percent_${progressId}`);
                        const fillEl = document.getElementById(`fill_${progressId}`);
                        
                        if (percentText) percentText.textContent = `${percent}%`;
                        if (fillEl) fillEl.style.width = `${percent}%`;
                    }
                });

                xhr.addEventListener('load', () => {
                    setTimeout(() => {
                        const itemNode = document.getElementById(progressId);
                        if (itemNode) {
                            itemNode.style.transition = 'all 0.4s ease';
                            itemNode.style.opacity = '0';
                            itemNode.style.transform = 'translateY(-10px)';
                            
                            itemNode.addEventListener('transitionend', () => {
                                itemNode.remove();
                                if (activeUploadsList.children.length === 0) {
                                    activeUploadsContainer.classList.add('hidden');
                                }
                            });
                        }
                    }, 1500);

                    if (xhr.status === 200) {
                        // Add green success glow to bar before disappearing
                        const fillEl = document.getElementById(`fill_${progressId}`);
                        if (fillEl) {
                            fillEl.className = 'progress-bar-fill fill-teal';
                        }
                        fetchS3Files(); // Reload bucket files
                    } else {
                        let errMsg = '請確認連線或權限配置。';
                        try {
                            const errRes = JSON.parse(xhr.responseText);
                            if (errRes && errRes.message) {
                                errMsg = errRes.message;
                            }
                        } catch(e) {}
                        alert(`檔案 ${file.name} 上傳失敗：${errMsg}`);
                    }
                });

                xhr.addEventListener('error', () => {
                    alert(`上傳檔案 ${file.name} 出現連線錯誤！`);
                    const progressItemNode = document.getElementById(progressId);
                    if (progressItemNode) progressItemNode.remove();
                });

                xhr.open('POST', '/api/feature3/upload', true);
                xhr.send(formData);
            });
        }

        // --- File Deletion Handling ---
        async function deleteS3File(filename, trElement) {
            if (isOffline) {
                alert('與伺服器連線中斷，此時無法刪除檔案。');
                return;
            }

            if (!confirm(`確定要刪除「${filename}」檔案嗎？此動作無法復原！`)) {
                return;
            }

            try {
                // Encode filename properly (including subdirectories/slashes)
                const encodedFilename = encodeURIComponent(filename);
                const response = await fetch(`/api/feature3/delete/${encodedFilename}`, {
                    method: 'DELETE'
                });

                if (!response.ok) throw new Error('Delete request failed');
                
                const result = await response.json();
                if (result.status === 'success') {
                    // Animation sliding row out before deleting
                    trElement.style.transition = 'all 0.3s ease';
                    trElement.style.opacity = '0';
                    trElement.style.transform = 'translateX(-20px)';
                    
                    trElement.addEventListener('transitionend', () => {
                        trElement.remove();
                        // Check if list is empty
                        if (s3FilesTableBody.querySelectorAll('tr').length === 0) {
                            renderS3Files({ files: [], mode: result.mode });
                        }
                    });
                } else {
                    alert(result.message || '刪除檔案失敗！');
                }
            } catch (error) {
                console.error('Delete S3 file error:', error);
                alert('刪除檔案過程中發生錯誤。');
            }
        }

        // Helper to format bytes cleanly
        function formatBytes(bytes, decimals = 2) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        // --- Event Listeners binding ---
        
        // Trigger file picker click
        if (selectFilesBtn && fileInput) {
            selectFilesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        // File selection from input
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                uploadSelectedFiles(e.target.files);
            });
        }

        // Drag & drop dropzone listeners
        if (uploadDropzone) {
            uploadDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.add('dragover');
            });

            uploadDropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.remove('dragover');
            });

            uploadDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                uploadDropzone.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    uploadSelectedFiles(e.dataTransfer.files);
                }
            });

            // Make entire dropzone clickable
            uploadDropzone.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // Bind refresh button click
        if (refreshS3Btn) {
            refreshS3Btn.addEventListener('click', fetchS3Files);
        }

        // Load S3 files initial
        fetchS3Files();
    }


    // --- Helper to escape HTML characters ---
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.toString().replace(/[&<>"']/g, m => map[m]);
    }

});
