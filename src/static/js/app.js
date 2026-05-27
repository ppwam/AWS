/**
 * Workspace Hub - Client Application Logic
 * Pure ES6 vanilla JavaScript with smooth DOM animations and async API integrations.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        timeDisplay: document.getElementById('timeDisplay'),
        statusDot: document.getElementById('statusDot'),
        statusText: document.getElementById('statusText'),
        
        // CPU
        cpuPercent: document.getElementById('cpuPercent'),
        cpuProgress: document.getElementById('cpuProgress'),
        cpuCores: document.getElementById('cpuCores'),
        cpuStatusDesc: document.getElementById('cpuStatusDesc'),
        
        // Memory
        memPercent: document.getElementById('memPercent'),
        memProgress: document.getElementById('memProgress'),
        memTotal: document.getElementById('memTotal'),
        memUsageText: document.getElementById('memUsageText'),
        memStatusDesc: document.getElementById('memStatusDesc'),
        
        // Disk
        diskPercent: document.getElementById('diskPercent'),
        diskProgress: document.getElementById('diskProgress'),
        diskTotal: document.getElementById('diskTotal'),
        diskUsageText: document.getElementById('diskUsageText'),
        diskStatusDesc: document.getElementById('diskStatusDesc'),
        
        // Info
        osName: document.getElementById('osName'),
        pythonVersion: document.getElementById('pythonVersion'),
        serverUptime: document.getElementById('serverUptime'),
        
        // Notes
        noteForm: document.getElementById('noteForm'),
        noteInput: document.getElementById('noteInput'),
        notesList: document.getElementById('notesList'),
        notesCount: document.getElementById('notesCount')
    };

    // Global State
    let isOffline = false;

    // --- 1. Realtime Digital Clock ---
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        elements.timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    }
    setInterval(updateClock, 1000);
    updateClock(); // Initial run

    // --- 2. System Performance API Polling ---
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
        }
    }

    function setOnlineStatus(online) {
        if (online) {
            elements.statusDot.className = 'status-dot online';
            elements.statusText.textContent = '連線正常';
            if (isOffline) {
                isOffline = false;
                // Reload notes once connection re-established
                fetchNotes();
            }
        } else {
            elements.statusDot.className = 'status-dot offline';
            elements.statusText.textContent = '與伺服器中斷';
            isOffline = true;
            
            elements.cpuStatusDesc.textContent = '連線中斷';
            elements.cpuStatusDesc.className = 'status-desc';
        }
    }

    function updateDashboardUI(data) {
        // CPU
        animateNumber(elements.cpuPercent, parseFloat(data.cpu.percent));
        elements.cpuProgress.style.width = `${data.cpu.percent}%`;
        elements.cpuCores.textContent = `${data.cpu.cores} Cores`;
        elements.cpuStatusDesc.textContent = getCpuStatusDescription(data.cpu.percent);
        elements.cpuStatusDesc.className = `status-desc ${getCpuStatusColorClass(data.cpu.percent)}`;

        // Memory
        animateNumber(elements.memPercent, parseFloat(data.memory.percent));
        elements.memProgress.style.width = `${data.memory.percent}%`;
        elements.memTotal.textContent = `${data.memory.total_gb} GB`;
        elements.memUsageText.textContent = `已使用 ${data.memory.used_gb} GB`;
        elements.memStatusDesc.textContent = `剩餘 ${data.memory.free_gb} GB`;
        elements.memStatusDesc.className = `status-desc ${getResourceStatusColorClass(data.memory.percent)}`;

        // Disk
        animateNumber(elements.diskPercent, parseFloat(data.disk.percent));
        elements.diskProgress.style.width = `${data.disk.percent}%`;
        elements.diskTotal.textContent = `${data.disk.total_gb} GB`;
        elements.diskUsageText.textContent = `已使用 ${data.disk.used_gb} GB`;
        elements.diskStatusDesc.textContent = `剩餘 ${data.disk.free_gb} GB`;
        elements.diskStatusDesc.className = `status-desc ${getResourceStatusColorClass(data.disk.percent)}`;

        // Server Info
        elements.osName.textContent = data.os_name;
        elements.pythonVersion.textContent = `v${data.python_version}`;
        elements.serverUptime.textContent = data.uptime;
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

    // --- 3. Workspace Notes (CRUD) Management ---
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
            elements.notesList.innerHTML = `
                <div class="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon text-purple"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                    <p>無法讀取便簽，請確認伺服器連線狀態。</p>
                </div>
            `;
        }
    }

    function renderNotes(notes) {
        elements.notesCount.textContent = `${notes.length} 則紀錄`;
        
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
                // Add sliding animation class
                noteElement.classList.add('removing');
                
                // Remove from DOM after CSS transition completes
                noteElement.addEventListener('animationend', () => {
                    noteElement.remove();
                    
                    // Recalculate notes count
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

    // Helper to escape HTML characters
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Load notes list initial
    fetchNotes();
});
