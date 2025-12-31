// Main Application
class VMApp {
    constructor() {
        this.screens = {
            loading: document.getElementById('loadingScreen'),
            dashboard: document.getElementById('dashboardScreen'),
            vm: document.getElementById('vmScreen')
        };
        
        this.views = {
            dashboard: document.getElementById('dashboardView'),
            vms: document.getElementById('vmsView'),
            templates: document.getElementById('templatesView'),
            settings: document.getElementById('settingsView')
        };
        
        this.vmManager = null;
        this.currentScreen = 'loading';
        this.currentView = 'dashboard';
        this.currentVM = null;
        this.vmInstances = new Map();
        this.vmLogs = new Map();
        
        this.init();
    }

    async init() {
        // Show loading screen
        this.showScreen('loading');
        
        // Initialize components
        await this.initComponents();
        
        // Load saved data
        this.loadSavedData();
        
        // Simulate loading
        setTimeout(() => {
            this.showScreen('dashboard');
            this.bindEvents();
            this.updateDashboardStats();
        }, 1500);
    }

    async initComponents() {
        // Initialize Pyodide for Python VMs
        window.pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
        });
        
        // Initialize VM Manager
        this.vmManager = new VMManager(this);
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showView(viewName) {
        // Hide all views
        Object.values(this.views).forEach(view => {
            view.classList.remove('active');
        });
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Show target view
        if (this.views[viewName]) {
            this.views[viewName].classList.add('active');
            this.currentView = viewName;
            
            // Update active nav
            const navItem = document.querySelector(`[data-screen="${viewName}"]`);
            if (navItem) navItem.classList.add('active');
        }
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const screen = item.dataset.screen;
                this.showView(screen);
            });
        });

        // Quick actions
        document.getElementById('createQuickVM').addEventListener('click', () => {
            this.showVMCreation();
        });

        document.getElementById('createFirstVM').addEventListener('click', () => {
            this.showVMCreation();
        });

        document.getElementById('createNewVM').addEventListener('click', () => {
            this.showVMCreation();
        });

        // Back to dashboard
        document.getElementById('backToDashboard').addEventListener('click', () => {
            this.stopCurrentVM();
            this.showScreen('dashboard');
        });

        // VM Creation Modal
        const modal = document.getElementById('vmCreationModal');
        const closeBtn = modal.querySelector('.close-modal');
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectVMType(option.dataset.type);
            });
        });

        // Creation steps
        let currentStep = 1;
        const nextBtn = document.getElementById('nextStep');
        const prevBtn = document.getElementById('prevStep');
        const createBtn = document.getElementById('createVM');

        nextBtn.addEventListener('click', () => {
            if (this.validateStep(currentStep)) {
                currentStep++;
                this.showCreationStep(currentStep);
            }
        });

        prevBtn.addEventListener('click', () => {
            currentStep--;
            this.showCreationStep(currentStep);
        });

        createBtn.addEventListener('click', () => {
            this.createVMFromModal();
        });

        // Template buttons
        document.querySelectorAll('.use-template').forEach(btn => {
            btn.addEventListener('click', () => {
                this.useTemplate(btn.dataset.template);
            });
        });

        // Settings
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('themeSelect').addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        // VM Screen controls
        document.getElementById('powerVM').addEventListener('click', () => {
            this.toggleVMPower();
        });

        document.getElementById('restartVM').addEventListener('click', () => {
            this.restartVM();
        });

        document.getElementById('saveVM').addEventListener('click', () => {
            this.saveVMState();
        });

        // Console tabs
        document.querySelectorAll('.console-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchConsoleTab(tab.dataset.tab);
            });
        });

        // Terminal input
        const terminalInput = document.getElementById('terminalInput');
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendTerminalCommand();
            }
        });

        document.getElementById('sendCommand').addEventListener('click', () => {
            this.sendTerminalCommand();
        });

        // Quick commands
        document.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                terminalInput.value = btn.dataset.command;
                this.sendTerminalCommand();
            });
        });

        // Output controls
        document.getElementById('clearOutput').addEventListener('click', () => {
            this.clearOutputLog();
        });

        document.getElementById('copyOutput').addEventListener('click', () => {
            this.copyOutputLog();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter to send command
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendTerminalCommand();
            }
            
            // Escape to clear input
            if (e.key === 'Escape') {
                terminalInput.value = '';
            }
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            if (this.currentVM) {
                e.preventDefault();
                e.returnValue = '';
                this.saveAllVMStates();
            }
        });
    }

    showVMCreation() {
        const modal = document.getElementById('vmCreationModal');
        modal.classList.add('active');
        
        // Reset to step 1
        this.showCreationStep(1);
        
        // Select Linux by default
        this.selectVMType('linux');
    }

    selectVMType(type) {
        // Update UI
        document.querySelectorAll('.type-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const selected = document.querySelector(`[data-type="${type}"]`);
        if (selected) selected.classList.add('active');
        
        // Show appropriate config section
        document.querySelectorAll('.vm-config-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const configSection = document.getElementById(`${type}Config`);
        if (configSection) configSection.classList.add('active');
        
        // Update review
        this.updateReview(type);
    }

    showCreationStep(step) {
        // Update steps UI
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });
        
        const stepEl = document.querySelector(`[data-step="${step}"]`);
        if (stepEl) stepEl.classList.add('active');
        
        // Show/hide step content
        document.querySelectorAll('.creation-step').forEach(content => {
            content.classList.remove('active');
        });
        
        const stepContent = document.getElementById(`step${step}`);
        if (stepContent) stepContent.classList.add('active');
        
        // Update buttons
        const prevBtn = document.getElementById('prevStep');
        const nextBtn = document.getElementById('nextStep');
        const createBtn = document.getElementById('createVM');
        
        prevBtn.style.display = step === 1 ? 'none' : 'flex';
        nextBtn.style.display = step === 3 ? 'none' : 'flex';
        createBtn.style.display = step === 3 ? 'flex' : 'none';
        
        // Update review on step 3
        if (step === 3) {
            this.updateReview();
        }
    }

    validateStep(step) {
        if (step === 1) {
            const selectedType = document.querySelector('.type-option.active');
            if (!selectedType) {
                this.showToast('Please select a VM type', 'warning');
                return false;
            }
            return true;
        }
        
        if (step === 2) {
            const vmName = document.getElementById('vmName').value.trim();
            if (!vmName) {
                this.showToast('Please enter a VM name', 'warning');
                return false;
            }
            
            // Check for duplicate names
            const existingVMs = Array.from(this.vmInstances.values());
            if (existingVMs.some(vm => vm.name === vmName)) {
                this.showToast('A VM with this name already exists', 'warning');
                return false;
            }
            
            return true;
        }
        
        return true;
    }

    updateReview(type) {
        if (!type) {
            type = document.querySelector('.type-option.active')?.dataset.type;
        }
        
        document.getElementById('reviewType').textContent = 
            type === 'linux' ? 'Linux VM' : 
            type === 'javascript' ? 'JavaScript VM' : 
            'Python VM';
        
        document.getElementById('reviewName').textContent = 
            document.getElementById('vmName').value || 'my-vm-1';
        
        if (type === 'linux') {
            const ram = document.getElementById('linuxRamValue').textContent;
            const storage = document.getElementById('linuxStorageValue').textContent;
            const distro = document.getElementById('linuxDistro').selectedOptions[0].text;
            
            document.getElementById('reviewRam').textContent = ram;
            document.getElementById('reviewStorage').textContent = storage;
            document.getElementById('reviewConfig').textContent = distro;
        } else if (type === 'javascript') {
            const ram = document.getElementById('jsRamValue').textContent;
            const version = document.getElementById('jsVersion').selectedOptions[0].text;
            
            document.getElementById('reviewRam').textContent = ram;
            document.getElementById('reviewStorage').textContent = 'N/A';
            document.getElementById('reviewConfig').textContent = version;
        } else if (type === 'python') {
            const ram = document.getElementById('pythonRamValue').textContent;
            const version = document.getElementById('pythonVersion').selectedOptions[0].text;
            
            document.getElementById('reviewRam').textContent = ram;
            document.getElementById('reviewStorage').textContent = 'N/A';
            document.getElementById('reviewConfig').textContent = version;
        }
    }

    async createVMFromModal() {
        const modal = document.getElementById('vmCreationModal');
        const type = document.querySelector('.type-option.active').dataset.type;
        const name = document.getElementById('vmName').value.trim();
        
        let config = {};
        
        if (type === 'linux') {
            config = {
                type: 'linux',
                distro: document.getElementById('linuxDistro').value,
                ram: parseInt(document.getElementById('linuxRam').value),
                storage: parseInt(document.getElementById('linuxStorage').value),
                network: true
            };
        } else if (type === 'javascript') {
            config = {
                type: 'javascript',
                version: document.getElementById('jsVersion').value,
                ram: parseInt(document.getElementById('jsRam').value),
                packages: document.getElementById('jsPackages').value.split(',').map(p => p.trim())
            };
        } else if (type === 'python') {
            config = {
                type: 'python',
                version: document.getElementById('pythonVersion').value,
                ram: parseInt(document.getElementById('pythonRam').value),
                packages: document.getElementById('pythonPackages').value.split(',').map(p => p.trim())
            };
        }
        
        // Close modal
        modal.classList.remove('active');
        
        // Create VM
        const vm = await this.createVM(name, config);
        
        // Open VM
        this.openVM(vm.id);
    }

    async createVM(name, config) {
        const vmId = `vm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const vm = {
            id: vmId,
            name: name,
            type: config.type,
            config: config,
            status: 'stopped',
            createdAt: new Date().toISOString(),
            lastOpened: null,
            logs: []
        };
        
        // Add to instances
        this.vmInstances.set(vmId, vm);
        
        // Initialize logs
        this.vmLogs.set(vmId, []);
        
        // Save to localStorage
        this.saveVMData(vm);
        
        // Update dashboard
        this.updateRecentVMs();
        this.updateVMList();
        
        this.showToast(`VM "${name}" created successfully`, 'success');
        
        return vm;
    }

    async openVM(vmId) {
        const vm = this.vmInstances.get(vmId);
        if (!vm) return;
        
        // Update last opened
        vm.lastOpened = new Date().toISOString();
        
        // Update UI
        document.getElementById('currentVMName').textContent = vm.name;
        document.getElementById('vmInfoType').textContent = 
            vm.type === 'linux' ? 'Linux VM' : 
            vm.type === 'javascript' ? 'JavaScript VM' : 
            'Python VM';
        
        document.getElementById('vmInfoCreated').textContent = 
            new Date(vm.createdAt).toLocaleDateString();
        
        // Clear terminal and output
        this.clearTerminal();
        this.clearOutputLog();
        
        // Start VM
        await this.startVM(vm);
        
        // Show VM screen
        this.showScreen('vm');
        this.switchConsoleTab('terminal');
        
        // Start monitoring
        this.startVMMonitoring(vmId);
    }

    async startVM(vm) {
        this.currentVM = vm.id;
        
        // Update status
        this.updateVMStatus('starting');
        this.logOutput('Starting virtual machine...', 'info');
        
        try {
            // Create appropriate VM instance
            if (vm.type === 'linux') {
                await this.vmManager.createLinuxVM(vm);
            } else if (vm.type === 'javascript') {
                await this.vmManager.createJSVM(vm);
            } else if (vm.type === 'python') {
                await this.vmManager.createPythonVM(vm);
            }
            
            this.updateVMStatus('running');
            this.logOutput('Virtual machine started successfully', 'success');
            
        } catch (error) {
            this.updateVMStatus('error');
            this.logOutput(`Failed to start VM: ${error.message}`, 'error');
            console.error('VM start error:', error);
        }
    }

    stopCurrentVM() {
        if (this.currentVM && this.vmManager) {
            this.vmManager.stopVM(this.currentVM);
            this.currentVM = null;
        }
    }

    updateVMStatus(status) {
        const statusIcon = document.getElementById('vmStatusIcon');
        const statusText = document.getElementById('vmStatusText');
        const connectionStatus = document.querySelector('#connectionStatus span');
        
        statusIcon.className = 'fas fa-circle';
        statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        connectionStatus.textContent = status;
        
        switch(status) {
            case 'starting':
                statusIcon.style.color = 'var(--warning-color)';
                break;
            case 'running':
                statusIcon.style.color = 'var(--success-color)';
                break;
            case 'stopped':
                statusIcon.style.color = 'var(--text-muted)';
                break;
            case 'error':
                statusIcon.style.color = 'var(--danger-color)';
                break;
        }
    }

    async sendTerminalCommand() {
        const input = document.getElementById('terminalInput');
        const command = input.value.trim();
        
        if (!command || !this.currentVM) return;
        
        // Add to terminal output
        this.addTerminalLine(`$ ${command}`, 'command');
        
        // Clear input
        input.value = '';
        
        // Process command
        try {
            const result = await this.vmManager.processCommand(this.currentVM, command);
            
            if (result.success) {
                if (result.output) {
                    this.addTerminalLine(result.output, 'output');
                }
                
                // Log successful command
                this.logOutput(`Command executed: ${command}`, 'info');
            } else {
                this.addTerminalLine(`Error: ${result.error}`, 'error');
                this.logOutput(`Command failed: ${command} - ${result.error}`, 'error');
            }
        } catch (error) {
            this.addTerminalLine(`Error: ${error.message}`, 'error');
            this.logOutput(`Command error: ${error.message}`, 'error');
        }
    }

    addTerminalLine(text, type = 'info') {
        const output = document.getElementById('terminalOutput');
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        line.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${this.escapeHtml(text)}</span>
        `;
        
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    logOutput(message, level = 'info') {
        const output = document.getElementById('outputLog');
        const log = document.createElement('div');
        log.className = `log-entry ${level}`;
        
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;
        
        output.appendChild(log);
        output.scrollTop = output.scrollHeight;
        
        // Store in VM logs
        if (this.currentVM) {
            const vmLogs = this.vmLogs.get(this.currentVM) || [];
            vmLogs.push({ timestamp: new Date().toISOString(), level, message });
            this.vmLogs.set(this.currentVM, vmLogs);
        }
    }

    clearTerminal() {
        document.getElementById('terminalOutput').innerHTML = '';
    }

    clearOutputLog() {
        document.getElementById('outputLog').innerHTML = '';
    }

    copyOutputLog() {
        const log = document.getElementById('outputLog');
        const text = Array.from(log.children)
            .map(line => line.textContent)
            .join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Output copied to clipboard', 'success');
        });
    }

    switchConsoleTab(tabName) {
        // Update tabs
        document.querySelectorAll('.console-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Update content
        document.querySelectorAll('.console-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) activeContent.classList.add('active');
        
        // Enable/disable terminal input
        const terminalInput = document.getElementById('terminalInput');
        terminalInput.disabled = tabName !== 'terminal';
    }

    startVMMonitoring(vmId) {
        // Clear any existing interval
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        // Start monitoring
        this.monitorInterval = setInterval(() => {
            if (this.currentVM === vmId) {
                this.updateVMMonitor(vmId);
            } else {
                clearInterval(this.monitorInterval);
            }
        }, 2000);
    }

    updateVMMonitor(vmId) {
        const vm = this.vmInstances.get(vmId);
        if (!vm) return;
        
        // Simulate metrics (in a real app, these would come from the VM)
        const cpuUsage = Math.floor(Math.random() * 30) + (vm.status === 'running' ? 20 : 5);
        const memoryUsed = Math.floor(vm.config.ram * 0.3 + Math.random() * vm.config.ram * 0.2);
        
        // Update display
        document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
        document.querySelector('.cpu-fill').style.width = `${cpuUsage}%`;
        
        document.getElementById('memoryUsage').textContent = `${memoryUsed}/${vm.config.ram} MB`;
        document.querySelector('.memory-fill').style.width = `${(memoryUsed / vm.config.ram) * 100}%`;
        
        if (vm.type === 'linux') {
            const storageUsed = Math.floor(vm.config.storage * 0.4 + Math.random() * vm.config.storage * 0.1);
            document.getElementById('storageUsage').textContent = `${storageUsed}/${vm.config.storage} MB`;
            document.querySelector('.storage-fill').style.width = `${(storageUsed / vm.config.storage) * 100}%`;
        }
        
        // Update uptime
        if (vm.lastOpened) {
            const uptime = Math.floor((Date.now() - new Date(vm.lastOpened).getTime()) / 1000);
            document.getElementById('vmInfoUptime').textContent = `${this.formatUptime(uptime)}`;
        }
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    toggleVMPower() {
        if (!this.currentVM) return;
        
        const vm = this.vmInstances.get(this.currentVM);
        if (vm.status === 'running') {
            this.stopVM();
        } else {
            this.startVM(vm);
        }
    }

    async stopVM() {
        if (!this.currentVM) return;
        
        this.updateVMStatus('stopping');
        this.logOutput('Stopping virtual machine...', 'info');
        
        try {
            await this.vmManager.stopVM(this.currentVM);
            this.updateVMStatus('stopped');
            this.logOutput('Virtual machine stopped', 'info');
        } catch (error) {
            this.updateVMStatus('error');
            this.logOutput(`Failed to stop VM: ${error.message}`, 'error');
        }
    }

    restartVM() {
        if (!this.currentVM) return;
        
        this.logOutput('Restarting virtual machine...', 'info');
        
        setTimeout(() => {
            const vm = this.vmInstances.get(this.currentVM);
            this.startVM(vm);
        }, 1000);
    }

    saveVMState() {
        if (!this.currentVM) return;
        
        this.logOutput('Saving VM state...', 'info');
        
        // In a real app, this would save the VM state
        setTimeout(() => {
            this.logOutput('VM state saved successfully', 'success');
            this.showToast('VM state saved', 'success');
        }, 1000);
    }

    updateDashboardStats() {
        // Update available RAM (simulated)
        const totalVMs = this.vmInstances.size;
        const runningVMs = Array.from(this.vmInstances.values())
            .filter(vm => vm.status === 'running').length;
        
        // Update UI
        document.getElementById('availableRam').textContent = 
            `${2048 - (runningVMs * 256)} MB`;
        
        const totalStorage = Array.from(this.vmInstances.values())
            .filter(vm => vm.type === 'linux')
            .reduce((sum, vm) => sum + (vm.config.storage || 0), 0);
        
        document.getElementById('availableStorage').textContent = 
            `${1000 - totalStorage} MB`;
    }

    updateRecentVMs() {
        const recentList = document.getElementById('recentVMList');
        const vms = Array.from(this.vmInstances.values())
            .sort((a, b) => new Date(b.lastOpened || b.createdAt) - new Date(a.lastOpened || a.createdAt))
            .slice(0, 3);
        
        if (vms.length === 0) {
            recentList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-server"></i>
                    <p>No VMs created yet</p>
                    <button class="btn-secondary" id="createFirstVM">
                        Create Your First VM
                    </button>
                </div>
            `;
            return;
        }
        
        recentList.innerHTML = vms.map(vm => `
            <div class="vm-card">
                <div class="vm-card-header">
                    <i class="fab fa-${vm.type === 'linux' ? 'linux' : vm.type === 'javascript' ? 'js-square' : 'python'}"></i>
                    <h4>${vm.name}</h4>
                </div>
                <div class="vm-card-body">
                    <p>${vm.type === 'linux' ? 'Linux VM' : vm.type === 'javascript' ? 'JavaScript VM' : 'Python VM'}</p>
                    <div class="vm-card-stats">
                        <span><i class="fas fa-memory"></i> ${vm.config.ram}MB RAM</span>
                        ${vm.type === 'linux' ? `<span><i class="fas fa-hdd"></i> ${vm.config.storage}MB Storage</span>` : ''}
                    </div>
                </div>
                <div class="vm-card-footer">
                    <button class="btn-small open-vm" data-vm-id="${vm.id}">
                        <i class="fas fa-play"></i> Open
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.open-vm').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openVM(btn.dataset.vmId);
            });
        });
    }

    updateVMList() {
        const vmList = document.getElementById('vmList');
        const vms = Array.from(this.vmInstances.values());
        
        if (vms.length === 0) {
            vmList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-server"></i>
                    <p>No virtual machines created yet</p>
                    <button class="btn-primary" id="createFromList">
                        Create Your First VM
                    </button>
                </div>
            `;
            
            document.getElementById('createFromList')?.addEventListener('click', () => {
                this.showVMCreation();
            });
            
            return;
        }
        
        vmList.innerHTML = vms.map(vm => `
            <div class="vm-list-item" data-vm-id="${vm.id}">
                <div class="vm-item-header">
                    <div class="vm-item-icon">
                        <i class="fab fa-${vm.type === 'linux' ? 'linux' : vm.type === 'javascript' ? 'js-square' : 'python'}"></i>
                    </div>
                    <div class="vm-item-info">
                        <h4>${vm.name}</h4>
                        <p>${vm.type === 'linux' ? 'Linux VM' : vm.type === 'javascript' ? 'JavaScript VM' : 'Python VM'}</p>
                    </div>
                </div>
                <div class="vm-item-status">
                    <span class="status-badge ${vm.status}">
                        <i class="fas fa-circle"></i> ${vm.status}
                    </span>
                </div>
                <div class="vm-item-specs">
                    <span><i class="fas fa-memory"></i> ${vm.config.ram}MB RAM</span>
                    ${vm.type === 'linux' ? `<span><i class="fas fa-hdd"></i> ${vm.config.storage}MB</span>` : ''}
                </div>
                <div class="vm-item-actions">
                    <button class="btn-small open-vm" data-vm-id="${vm.id}">
                        <i class="fas fa-play"></i> Open
                    </button>
                    <button class="btn-small delete-vm" data-vm-id="${vm.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.open-vm').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openVM(btn.dataset.vmId);
            });
        });
        
        document.querySelectorAll('.delete-vm').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteVM(btn.dataset.vmId);
            });
        });
    }

    deleteVM(vmId) {
        if (confirm('Are you sure you want to delete this VM? This action cannot be undone.')) {
            if (this.currentVM === vmId) {
                this.stopCurrentVM();
                this.showScreen('dashboard');
            }
            
            this.vmInstances.delete(vmId);
            this.vmLogs.delete(vmId);
            localStorage.removeItem(`vm_${vmId}`);
            
            this.updateRecentVMs();
            this.updateVMList();
            this.updateDashboardStats();
            
            this.showToast('VM deleted successfully', 'success');
        }
    }

    useTemplate(template) {
        let config;
        
        switch(template) {
            case 'ubuntu':
                config = {
                    type: 'linux',
                    distro: 'ubuntu',
                    ram: 256,
                    storage: 500,
                    network: true
                };
                break;
            case 'nodejs':
                config = {
                    type: 'javascript',
                    version: '18',
                    ram: 128,
                    packages: ['lodash', 'axios']
                };
                break;
            case 'python':
                config = {
                    type: 'python',
                    version: '3.11',
                    ram: 128,
                    packages: ['numpy', 'pandas']
                };
                break;
            case 'alpine':
                config = {
                    type: 'linux',
                    distro: 'alpine',
                    ram: 64,
                    storage: 100,
                    network: false
                };
                break;
        }
        
        this.createVM(`${template}-vm`, config);
    }

    saveSettings() {
        const settings = {
            theme: document.getElementById('themeSelect').value,
            fontSize: document.getElementById('fontSize').value,
            maxRam: document.getElementById('maxRam').value,
            autoSave: document.getElementById('autoSave').checked,
            enableSandbox: document.getElementById('enableSandbox').checked,
            clearConsole: document.getElementById('clearConsole').checked
        };
        
        localStorage.setItem('vm_app_settings', JSON.stringify(settings));
        this.showToast('Settings saved successfully', 'success');
    }

    loadSavedData() {
        // Load settings
        const savedSettings = localStorage.getItem('vm_app_settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            document.getElementById('themeSelect').value = settings.theme || 'dark';
            document.getElementById('fontSize').value = settings.fontSize || 14;
            document.getElementById('fontSizeValue').textContent = `${settings.fontSize || 14}px`;
            document.getElementById('maxRam').value = settings.maxRam || 1024;
            document.getElementById('maxRamValue').textContent = `${settings.maxRam || 1024} MB`;
            document.getElementById('autoSave').checked = settings.autoSave !== false;
            document.getElementById('enableSandbox').checked = settings.enableSandbox !== false;
            document.getElementById('clearConsole').checked = settings.clearConsole !== false;
            
            this.setTheme(settings.theme || 'dark');
        }
        
        // Load VMs
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('vm_')) {
                try {
                    const vmData = JSON.parse(localStorage.getItem(key));
                    this.vmInstances.set(vmData.id, vmData);
                } catch (e) {
                    console.error('Error loading VM data:', e);
                }
            }
        }
        
        // Update UI
        this.updateRecentVMs();
        this.updateVMList();
    }

    setTheme(theme) {
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }
        
        document.documentElement.setAttribute('data-theme', theme);
    }

    saveVMData(vm) {
        localStorage.setItem(`vm_${vm.id}`, JSON.stringify(vm));
    }

    saveAllVMStates() {
        this.vmInstances.forEach(vm => {
            this.saveVMData(vm);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// VM Manager - Handles different VM types
class VMManager {
    constructor(app) {
        this.app = app;
        this.vms = new Map();
        this.linuxEmulator = null;
    }

    async createLinuxVM(vm) {
        const config = {
            wasm_path: "https://copy.sh/v86/build/v86.wasm",
            memory_size: vm.config.ram * 1024 * 1024,
            vga_memory_size: 8 * 1024 * 1024,
            screen_container: document.createElement('div'),
            bios: { url: "https://copy.sh/v86/build/bios.bin" },
            vga_bios: { url: "https://copy.sh/v86/build/vgabios.bin" },
            cdrom: { url: this.getLinuxImage(vm.config.distro) }
        };

        if (vm.config.network) {
            config.network_adapter = true;
        }

        return new Promise((resolve, reject) => {
            try {
                this.linuxEmulator = new window.V86(config);
                
                this.linuxEmulator.add_listener("emulator-ready", () => {
                    vm.status = 'running';
                    this.vms.set(vm.id, {
                        type: 'linux',
                        emulator: this.linuxEmulator,
                        vm: vm
                    });
                    
                    // Setup console output
                    this.linuxEmulator.add_listener("serial0-output-char", (char) => {
                        this.app.addTerminalLine(char.char || char, 'output');
                    });
                    
                    resolve();
                });
                
                this.linuxEmulator.run();
            } catch (error) {
                reject(error);
            }
        });
    }

    async createJSVM(vm) {
        // Create a JavaScript VM environment
        const jsVM = {
            type: 'javascript',
            context: {
                console: {
                    log: (...args) => {
                        const output = args.map(arg => 
                            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                        ).join(' ');
                        this.app.addTerminalLine(output, 'output');
                    }
                },
                setTimeout: (fn, delay) => setTimeout(fn, delay),
                setInterval: (fn, delay) => setInterval(fn, delay),
                clearTimeout: (id) => clearTimeout(id),
                clearInterval: (id) => clearInterval(id)
            },
            vm: vm
        };
        
        // Initialize with basic globals
        const sandbox = new Proxy(jsVM.context, {
            has: () => true,
            get: (target, prop) => {
                if (prop in target) return target[prop];
                if (prop === 'window') return sandbox;
                if (prop === 'global') return sandbox;
                if (prop === 'globalThis') return sandbox;
                return undefined;
            }
        });
        
        // Add some common globals
        sandbox.Math = Math;
        sandbox.JSON = JSON;
        sandbox.Date = Date;
        
        this.vms.set(vm.id, jsVM);
        vm.status = 'running';
        
        this.app.logOutput('JavaScript VM initialized with Node.js-like environment', 'info');
        this.app.addTerminalLine('JavaScript VM Ready (Node.js-like environment)', 'info');
        this.app.addTerminalLine('Try: console.log("Hello") or 2 + 2', 'info');
        
        return jsVM;
    }

    async createPythonVM(vm) {
        try {
            // Initialize Pyodide if not already done
            if (!window.pyodide) {
                window.pyodide = await loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
                });
            }
            
            const pythonVM = {
                type: 'python',
                pyodide: window.pyodide,
                vm: vm
            };
            
            // Load any specified packages
            if (vm.config.packages && vm.config.packages.length > 0) {
                for (const pkg of vm.config.packages) {
                    if (pkg.trim()) {
                        this.app.logOutput(`Loading Python package: ${pkg}`, 'info');
                        try {
                            await window.pyodide.loadPackage(pkg.trim());
                            this.app.logOutput(`Loaded package: ${pkg}`, 'success');
                        } catch (error) {
                            this.app.logOutput(`Failed to load package ${pkg}: ${error.message}`, 'warning');
                        }
                    }
                }
            }
            
            this.vms.set(vm.id, pythonVM);
            vm.status = 'running';
            
            this.app.logOutput('Python VM initialized with Pyodide', 'info');
            this.app.addTerminalLine('Python VM Ready (Python 3.11 via Pyodide)', 'info');
            this.app.addTerminalLine('Try: print("Hello") or 2 + 2', 'info');
            
            return pythonVM;
        } catch (error) {
            throw new Error(`Failed to initialize Python VM: ${error.message}`);
        }
    }

    async processCommand(vmId, command) {
        const vmData = this.vms.get(vmId);
        if (!vmData) {
            return { success: false, error: 'VM not found' };
        }
        
        try {
            if (vmData.type === 'linux') {
                return await this.processLinuxCommand(vmData, command);
            } else if (vmData.type === 'javascript') {
                return await this.processJSCommand(vmData, command);
            } else if (vmData.type === 'python') {
                return await this.processPythonCommand(vmData, command);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processLinuxCommand(vmData, command) {
        if (!vmData.emulator) {
            return { success: false, error: 'Emulator not available' };
        }
        
        // Send command to emulator
        for (let i = 0; i < command.length; i++) {
            vmData.emulator.serial0_send(command.charCodeAt(i));
        }
        
        // Send Enter key
        vmData.emulator.serial0_send(13);
        
        return { success: true, output: 'Command sent to Linux VM' };
    }

    async processJSCommand(vmData, command) {
        const sandbox = vmData.context;
        
        try {
            // Special commands
            if (command === 'clear') {
                this.app.clearTerminal();
                return { success: true };
            }
            
            if (command === 'help') {
                const help = `
Available commands:
• JavaScript expressions: 2 + 2, Math.PI
• Console output: console.log("Hello")
• Variable assignment: let x = 10
• Functions: function greet() { return "Hello" }
• Special: clear, help
                `.trim();
                return { success: true, output: help };
            }
            
            // Try to evaluate the command
            let result;
            
            if (command.trim().startsWith('console.')) {
                // Direct console command
                const fn = new Function('sandbox', `
                    with(sandbox) {
                        return (${command});
                    }
                `);
                result = fn(sandbox);
            } else {
                // Try as expression
                try {
                    const fn = new Function('sandbox', `
                        with(sandbox) {
                            return eval(${JSON.stringify(command)});
                        }
                    `);
                    result = fn(sandbox);
                } catch (e) {
                    // Try as statement
                    const fn = new Function('sandbox', `
                        with(sandbox) {
                            ${command}
                        }
                    `);
                    result = fn(sandbox);
                }
            }
            
            // Handle the result
            if (result !== undefined) {
                const output = typeof result === 'object' ? 
                    JSON.stringify(result, null, 2) : 
                    String(result);
                return { success: true, output: output };
            } else {
                return { success: true };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processPythonCommand(vmData, command) {
        try {
            const pyodide = vmData.pyodide;
            
            // Special commands
            if (command === 'clear') {
                this.app.clearTerminal();
                return { success: true };
            }
            
            if (command === 'help') {
                const help = `
Available commands:
• Python expressions: 2 + 2
• Print output: print("Hello")
• Variable assignment: x = 10
• Import modules: import math
• Functions: def greet(): return "Hello"
• Special: clear, help
                `.trim();
                return { success: true, output: help };
            }
            
            // Execute Python code
            let result;
            
            if (command.trim().startsWith('print(')) {
                // Capture print output
                const code = command;
                result = await pyodide.runPythonAsync(code);
            } else {
                // Try to get a result
                try {
                    result = await pyodide.runPythonAsync(command);
                } catch (e) {
                    // Might be a statement without return
                    await pyodide.runPythonAsync(command);
                    result = undefined;
                }
            }
            
            // Handle the result
            if (result !== undefined) {
                return { success: true, output: String(result) };
            } else {
                return { success: true };
            }
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    stopVM(vmId) {
        const vmData = this.vms.get(vmId);
        if (!vmData) return;
        
        if (vmData.type === 'linux' && vmData.emulator) {
            try {
                vmData.emulator.stop();
            } catch (error) {
                console.error('Error stopping Linux VM:', error);
            }
        }
        
        this.vms.delete(vmId);
        
        // Update VM status
        const vm = vmData.vm;
        if (vm) {
            vm.status = 'stopped';
            this.app.saveVMData(vm);
        }
    }

    getLinuxImage(distro) {
        const images = {
            alpine: 'https://copy.sh/v86/images/alpine.iso.bin',
            debian: 'https://copy.sh/v86/images/linux.iso',
            ubuntu: 'https://copy.sh/v86/images/linux4.iso',
            arch: 'https://github.com/ivandavidov/minimal-linux-images/raw/master/archlinux-buildroot-x86_64.iso'
        };
        
        return images[distro] || images.debian;
    }
}

// Range input handlers
function setupRangeInputs() {
    // Linux RAM
    const linuxRam = document.getElementById('linuxRam');
    const linuxRamValue = document.getElementById('linuxRamValue');
    
    if (linuxRam && linuxRamValue) {
        linuxRam.addEventListener('input', (e) => {
            linuxRamValue.textContent = `${e.target.value} MB`;
        });
    }
    
    // Linux Storage
    const linuxStorage = document.getElementById('linuxStorage');
    const linuxStorageValue = document.getElementById('linuxStorageValue');
    
    if (linuxStorage && linuxStorageValue) {
        linuxStorage.addEventListener('input', (e) => {
            linuxStorageValue.textContent = `${e.target.value} MB`;
        });
    }
    
    // JS RAM
    const jsRam = document.getElementById('jsRam');
    const jsRamValue = document.getElementById('jsRamValue');
    
    if (jsRam && jsRamValue) {
        jsRam.addEventListener('input', (e) => {
            jsRamValue.textContent = `${e.target.value} MB`;
        });
    }
    
    // Python RAM
    const pythonRam = document.getElementById('pythonRam');
    const pythonRamValue = document.getElementById('pythonRamValue');
    
    if (pythonRam && pythonRamValue) {
        pythonRam.addEventListener('input', (e) => {
            pythonRamValue.textContent = `${e.target.value} MB`;
        });
    }
    
    // Settings ranges
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    
    if (fontSize && fontSizeValue) {
        fontSize.addEventListener('input', (e) => {
            fontSizeValue.textContent = `${e.target.value}px`;
            document.documentElement.style.fontSize = `${e.target.value}px`;
        });
    }
    
    const maxRam = document.getElementById('maxRam');
    const maxRamValue = document.getElementById('maxRamValue');
    
    if (maxRam && maxRamValue) {
        maxRam.addEventListener('input', (e) => {
            maxRamValue.textContent = `${e.target.value} MB`;
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Setup range inputs first
    setupRangeInputs();
    
    // Initialize app
    window.vmApp = new VMApp();
});
