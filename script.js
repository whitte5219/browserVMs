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
        this.initialized = false;
        
        this.init();
    }

    async init() {
        console.log("VMApp initializing...");
        
        // Show loading screen immediately
        this.showScreen('loading');
        
        // Start initialization sequence
        this.initializeApp();
    }

    async initializeApp() {
        try {
            console.log("Starting app initialization...");
            
            // Initialize components without waiting for heavy dependencies
            this.vmManager = new VMManager(this);
            
            // Load saved data
            this.loadSavedData();
            
            // Setup range inputs immediately
            this.setupRangeInputs();
            
            // Bind events immediately (don't wait for everything)
            this.bindEvents();
            
            // Update dashboard stats
            this.updateDashboardStats();
            
            // Start Pyodide loading in background (non-blocking)
            this.loadPyodideInBackground();
            
            // Simulate loading for user experience
            setTimeout(() => {
                console.log("Loading complete, showing dashboard...");
                this.initialized = true;
                this.showScreen('dashboard');
            }, 1500);
            
        } catch (error) {
            console.error("Error during initialization:", error);
            // Even if there's an error, show dashboard after delay
            setTimeout(() => {
                console.log("Showing dashboard despite errors...");
                this.showScreen('dashboard');
            }, 2000);
        }
    }

    async loadPyodideInBackground() {
        try {
            if (typeof loadPyodide === 'function') {
                console.log("Loading Pyodide in background...");
                window.pyodide = await loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
                });
                console.log("Pyodide loaded successfully");
            }
        } catch (error) {
            console.warn("Pyodide failed to load, Python VMs will use basic interpreter:", error);
        }
    }

    showScreen(screenName) {
        console.log(`Showing screen: ${screenName}`);
        
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        
        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showView(viewName) {
        console.log(`Showing view: ${viewName}`);
        
        // Hide all views
        Object.values(this.views).forEach(view => {
            if (view) {
                view.classList.remove('active');
            }
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
        console.log("Binding events...");
        
        // Navigation - use event delegation
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.dataset.screen) {
                e.preventDefault();
                this.showView(navItem.dataset.screen);
            }
        });

        // Quick actions
        this.safeAddEventListener('createQuickVM', 'click', () => this.showVMCreation());
        this.safeAddEventListener('createFirstVM', 'click', () => this.showVMCreation());
        this.safeAddEventListener('createNewVM', 'click', () => this.showVMCreation());

        // Back to dashboard
        this.safeAddEventListener('backToDashboard', 'click', () => {
            this.stopCurrentVM();
            this.showScreen('dashboard');
        });

        // VM Creation Modal
        this.safeAddEventListener('close-modal', 'click', () => {
            const modal = document.getElementById('vmCreationModal');
            if (modal) modal.classList.remove('active');
        });

        // Type selection
        document.addEventListener('click', (e) => {
            const typeOption = e.target.closest('.type-option');
            if (typeOption && typeOption.dataset.type) {
                this.selectVMType(typeOption.dataset.type);
            }
        });

        // Creation steps
        let currentStep = 1;
        this.safeAddEventListener('nextStep', 'click', () => {
            if (this.validateStep(currentStep)) {
                currentStep++;
                this.showCreationStep(currentStep);
            }
        });

        this.safeAddEventListener('prevStep', 'click', () => {
            currentStep--;
            this.showCreationStep(currentStep);
        });

        this.safeAddEventListener('createVM', 'click', () => {
            this.createVMFromModal();
        });

        // Template buttons
        document.addEventListener('click', (e) => {
            const templateBtn = e.target.closest('.use-template');
            if (templateBtn && templateBtn.dataset.template) {
                this.useTemplate(templateBtn.dataset.template);
            }
        });

        // Settings
        this.safeAddEventListener('saveSettings', 'click', () => this.saveSettings());
        this.safeAddEventListener('themeSelect', 'change', (e) => this.setTheme(e.target.value));
        this.safeAddEventListener('resetSettings', 'click', () => this.resetSettings());

        // VM Screen controls
        this.safeAddEventListener('powerVM', 'click', () => this.toggleVMPower());
        this.safeAddEventListener('restartVM', 'click', () => this.restartVM());
        this.safeAddEventListener('saveVM', 'click', () => this.saveVMState());

        // Console tabs
        document.addEventListener('click', (e) => {
            const tab = e.target.closest('.console-tab');
            if (tab && tab.dataset.tab) {
                this.switchConsoleTab(tab.dataset.tab);
            }
        });

        // Terminal input
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            terminalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.sendTerminalCommand();
                }
            });
        }

        this.safeAddEventListener('sendCommand', 'click', () => this.sendTerminalCommand());

        // Quick commands
        document.addEventListener('click', (e) => {
            const cmdBtn = e.target.closest('.cmd-btn');
            if (cmdBtn && cmdBtn.dataset.command) {
                if (terminalInput) {
                    terminalInput.value = cmdBtn.dataset.command;
                    this.sendTerminalCommand();
                }
            }
        });

        // Output controls
        this.safeAddEventListener('clearOutput', 'click', () => this.clearOutputLog());
        this.safeAddEventListener('copyOutput', 'click', () => this.copyOutputLog());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendTerminalCommand();
            }
            if (e.key === 'Escape') {
                if (terminalInput) {
                    terminalInput.value = '';
                    terminalInput.focus();
                }
            }
        });

        // Window events
        window.addEventListener('beforeunload', () => {
            if (this.currentVM) {
                this.saveAllVMStates();
            }
        });

        console.log("Events bound successfully");
    }

    safeAddEventListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element with id "${id}" not found for event binding`);
        }
    }

    showVMCreation() {
        const modal = document.getElementById('vmCreationModal');
        if (modal) {
            modal.classList.add('active');
            this.showCreationStep(1);
            this.selectVMType('linux');
        }
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
        
        if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'flex';
        if (nextBtn) nextBtn.style.display = step === 3 ? 'none' : 'flex';
        if (createBtn) createBtn.style.display = step === 3 ? 'flex' : 'none';
        
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
            const vmName = document.getElementById('vmName')?.value.trim();
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
        
        const typeNames = {
            'linux': 'Linux VM',
            'javascript': 'JavaScript VM',
            'python': 'Python VM',
            'ruby': 'Ruby VM',
            'php': 'PHP VM',
            'golang': 'Go VM',
            'rust': 'Rust VM',
            'java': 'Java VM',
            'csharp': 'C# VM',
            'cpp': 'C++ VM',
            'bash': 'Bash VM',
            'powershell': 'PowerShell VM',
            'sql': 'SQL VM',
            'htmlcss': 'HTML/CSS VM'
        };
        
        const reviewType = document.getElementById('reviewType');
        if (reviewType) reviewType.textContent = typeNames[type] || 'VM';
        
        const reviewName = document.getElementById('reviewName');
        if (reviewName) reviewName.textContent = document.getElementById('vmName')?.value || 'my-vm-1';
        
        if (type === 'linux') {
            const ram = document.getElementById('linuxRamValue')?.textContent || '256 MB';
            const storage = document.getElementById('linuxStorageValue')?.textContent || '500 MB';
            const distro = document.getElementById('linuxDistro')?.selectedOptions[0]?.text || 'Alpine Linux';
            
            const reviewRam = document.getElementById('reviewRam');
            const reviewStorage = document.getElementById('reviewStorage');
            const reviewConfig = document.getElementById('reviewConfig');
            
            if (reviewRam) reviewRam.textContent = ram;
            if (reviewStorage) reviewStorage.textContent = storage;
            if (reviewConfig) reviewConfig.textContent = distro;
        } else {
            const ram = document.getElementById(`${type}RamValue`)?.textContent || '128 MB';
            const version = document.getElementById(`${type}Version`)?.selectedOptions[0]?.text || 'Default';
            
            const reviewRam = document.getElementById('reviewRam');
            const reviewStorage = document.getElementById('reviewStorage');
            const reviewConfig = document.getElementById('reviewConfig');
            
            if (reviewRam) reviewRam.textContent = ram;
            if (reviewStorage) reviewStorage.textContent = 'N/A';
            if (reviewConfig) reviewConfig.textContent = version;
        }
    }

    async createVMFromModal() {
        const modal = document.getElementById('vmCreationModal');
        const type = document.querySelector('.type-option.active')?.dataset.type;
        const name = document.getElementById('vmName')?.value.trim() || 'my-vm-1';
        
        let config = {};
        
        if (type === 'linux') {
            config = {
                type: 'linux',
                distro: document.getElementById('linuxDistro')?.value || 'alpine',
                ram: parseInt(document.getElementById('linuxRam')?.value || '256'),
                storage: parseInt(document.getElementById('linuxStorage')?.value || '500'),
                network: true
            };
        } else {
            config = {
                type: type,
                version: document.getElementById(`${type}Version`)?.value || 'default',
                ram: parseInt(document.getElementById(`${type}Ram`)?.value || '128')
            };
            
            // Get packages if input exists
            const packagesInput = document.getElementById(`${type}Packages`);
            if (packagesInput) {
                config.packages = packagesInput.value.split(',').map(p => p.trim()).filter(p => p);
            }
        }
        
        if (modal) modal.classList.remove('active');
        
        const vm = await this.createVM(name, config);
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
            paused: false,
            createdAt: new Date().toISOString(),
            lastOpened: null,
            logs: []
        };
        
        this.vmInstances.set(vmId, vm);
        this.vmLogs.set(vmId, []);
        
        this.saveVMData(vm);
        
        this.updateRecentVMs();
        this.updateVMList();
        this.updateDashboardStats();
        
        this.showToast(`VM "${name}" created successfully`, 'success');
        
        return vm;
    }

    async openVM(vmId) {
        const vm = this.vmInstances.get(vmId);
        if (!vm) {
            this.showToast('VM not found', 'error');
            return;
        }
        
        vm.lastOpened = new Date().toISOString();
        
        const currentVMName = document.getElementById('currentVMName');
        if (currentVMName) currentVMName.textContent = vm.name;
        
        const vmInfoType = document.getElementById('vmInfoType');
        if (vmInfoType) {
            const typeNames = {
                'linux': 'Linux VM',
                'javascript': 'JavaScript VM',
                'python': 'Python VM',
                'ruby': 'Ruby VM',
                'php': 'PHP VM',
                'golang': 'Go VM',
                'rust': 'Rust VM',
                'java': 'Java VM',
                'csharp': 'C# VM',
                'cpp': 'C++ VM',
                'bash': 'Bash VM',
                'powershell': 'PowerShell VM',
                'sql': 'SQL VM',
                'htmlcss': 'HTML/CSS VM'
            };
            vmInfoType.textContent = typeNames[vm.type] || 'VM';
        }
        
        const vmInfoCreated = document.getElementById('vmInfoCreated');
        if (vmInfoCreated) {
            vmInfoCreated.textContent = new Date(vm.createdAt).toLocaleDateString();
        }
        
        this.clearTerminal();
        this.clearOutputLog();
        
        await this.startVM(vm);
        
        this.showScreen('vm');
        this.switchConsoleTab('terminal');
        
        this.startVMMonitoring(vmId);
    }

    async startVM(vm) {
        this.currentVM = vm.id;
        vm.status = 'starting';
        vm.paused = false;
        
        this.updateVMStatus('starting');
        this.addTerminalLine('Starting virtual machine...', 'welcome');
        this.logSystem(`Starting ${vm.name} (${vm.type} VM)`);
        
        try {
            await this.vmManager.createVM(vm);
            vm.status = 'running';
            
            this.updateVMStatus('running');
            this.addTerminalLine('Virtual machine started successfully', 'info');
            this.logSystem(`${vm.name} started successfully`);
            
        } catch (error) {
            vm.status = 'error';
            this.updateVMStatus('error');
            this.addTerminalLine(`Failed to start VM: ${error.message}`, 'error');
            this.logSystem(`Failed to start ${vm.name}: ${error.message}`, 'error');
            console.error('VM start error:', error);
        }
    }

    stopCurrentVM() {
        if (this.currentVM && this.vmManager) {
            this.vmManager.stopVM(this.currentVM);
            this.currentVM = null;
            this.showScreen('dashboard');
        }
    }

    updateVMStatus(status) {
        const statusIcon = document.getElementById('vmStatusIcon');
        const statusText = document.getElementById('vmStatusText');
        const connectionStatus = document.querySelector('#connectionStatus span');
        const powerBtn = document.getElementById('powerVM');
        
        if (statusIcon) {
            statusIcon.className = 'fas fa-circle';
            statusIcon.classList.remove('pulse');
        }
        
        if (statusText) {
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        if (connectionStatus) {
            connectionStatus.textContent = status;
        }
        
        if (powerBtn) {
            powerBtn.innerHTML = status === 'running' || status === 'paused' 
                ? '<i class="fas fa-power-off"></i>' 
                : '<i class="fas fa-play"></i>';
            powerBtn.title = status === 'running' || status === 'paused' ? 'Stop VM' : 'Start VM';
        }
        
        switch(status) {
            case 'starting':
                if (statusIcon) statusIcon.style.color = 'var(--warning-color)';
                break;
            case 'running':
                if (statusIcon) {
                    statusIcon.style.color = 'var(--success-color)';
                    statusIcon.classList.add('pulse');
                }
                break;
            case 'paused':
                if (statusIcon) {
                    statusIcon.style.color = 'var(--warning-color)';
                    statusIcon.classList.remove('pulse');
                }
                break;
            case 'stopped':
                if (statusIcon) {
                    statusIcon.style.color = 'var(--text-muted)';
                    statusIcon.classList.remove('pulse');
                }
                break;
            case 'error':
                if (statusIcon) {
                    statusIcon.style.color = 'var(--danger-color)';
                    statusIcon.classList.remove('pulse');
                }
                break;
        }
    }

    async sendTerminalCommand() {
        const input = document.getElementById('terminalInput');
        const command = input?.value.trim();
        
        if (!command || !this.currentVM) return;
        
        this.addTerminalLine(`$ ${command}`, 'command');
        
        if (input) input.value = '';
        
        try {
            const result = await this.vmManager.processCommand(this.currentVM, command);
            
            if (result.success) {
                if (result.output) {
                    this.addTerminalLine(result.output, 'output');
                }
                this.logSystem(`Command executed: ${command}`, 'info');
            } else {
                this.addTerminalLine(`Error: ${result.error}`, 'error');
                this.logSystem(`Command failed: ${command} - ${result.error}`, 'error');
            }
        } catch (error) {
            this.addTerminalLine(`Error: ${error.message}`, 'error');
            this.logSystem(`Command error: ${error.message}`, 'error');
        }
    }

    addTerminalLine(text, type = 'info') {
        const output = document.getElementById('terminalOutput');
        if (!output) return;
        
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

    logSystem(message, level = 'info') {
        const output = document.getElementById('outputLog');
        if (!output) return;
        
        const log = document.createElement('div');
        log.className = `log-entry ${level}`;
        
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;
        
        output.appendChild(log);
        output.scrollTop = output.scrollHeight;
        
        if (this.currentVM) {
            const vmLogs = this.vmLogs.get(this.currentVM) || [];
            vmLogs.push({ timestamp: new Date().toISOString(), level, message });
            this.vmLogs.set(this.currentVM, vmLogs);
        }
    }

    clearTerminal() {
        const terminalOutput = document.getElementById('terminalOutput');
        if (terminalOutput) terminalOutput.innerHTML = '';
    }

    clearOutputLog() {
        const outputLog = document.getElementById('outputLog');
        if (outputLog) outputLog.innerHTML = '';
    }

    copyOutputLog() {
        const log = document.getElementById('outputLog');
        if (!log) return;
        
        const text = Array.from(log.children)
            .map(line => line.textContent)
            .join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Output copied to clipboard', 'success');
        });
    }

    switchConsoleTab(tabName) {
        document.querySelectorAll('.console-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        document.querySelectorAll('.console-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}Tab`);
        if (activeContent) activeContent.classList.add('active');
        
        const terminalInput = document.getElementById('terminalInput');
        if (terminalInput) {
            terminalInput.disabled = tabName !== 'terminal';
            if (tabName === 'terminal') terminalInput.focus();
        }
    }

    startVMMonitoring(vmId) {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
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
        
        const cpuUsage = Math.floor(Math.random() * 30) + (vm.status === 'running' ? 20 : 5);
        const memoryUsed = Math.floor(vm.config.ram * 0.3 + Math.random() * vm.config.ram * 0.2);
        
        const cpuUsageElement = document.getElementById('cpuUsage');
        const cpuFill = document.querySelector('.cpu-fill');
        if (cpuUsageElement) cpuUsageElement.textContent = `${cpuUsage}%`;
        if (cpuFill) cpuFill.style.width = `${cpuUsage}%`;
        
        const memoryUsageElement = document.getElementById('memoryUsage');
        const memoryFill = document.querySelector('.memory-fill');
        if (memoryUsageElement) memoryUsageElement.textContent = `${memoryUsed}/${vm.config.ram} MB`;
        if (memoryFill) memoryFill.style.width = `${(memoryUsed / vm.config.ram) * 100}%`;
        
        if (vm.type === 'linux') {
            const storageUsed = Math.floor(vm.config.storage * 0.4 + Math.random() * vm.config.storage * 0.1);
            const storageUsageElement = document.getElementById('storageUsage');
            const storageFill = document.querySelector('.storage-fill');
            if (storageUsageElement) storageUsageElement.textContent = `${storageUsed}/${vm.config.storage} MB`;
            if (storageFill) storageFill.style.width = `${(storageUsed / vm.config.storage) * 100}%`;
        }
        
        if (vm.lastOpened && vm.status === 'running') {
            const uptime = Math.floor((Date.now() - new Date(vm.lastOpened).getTime()) / 1000);
            const vmInfoUptime = document.getElementById('vmInfoUptime');
            if (vmInfoUptime) vmInfoUptime.textContent = `${this.formatUptime(uptime)}`;
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
        if (!this.currentVM) {
            this.showToast('No VM selected', 'warning');
            return;
        }
        
        const vm = this.vmInstances.get(this.currentVM);
        if (vm.status === 'running' || vm.status === 'paused') {
            this.stopVM();
        } else {
            this.startVM(vm);
        }
    }

    async stopVM() {
        if (!this.currentVM) return;
        
        this.updateVMStatus('stopping');
        this.addTerminalLine('Stopping virtual machine...', 'info');
        
        try {
            await this.vmManager.stopVM(this.currentVM);
            
            const vm = this.vmInstances.get(this.currentVM);
            vm.status = 'stopped';
            vm.paused = false;
            
            this.updateVMStatus('stopped');
            this.addTerminalLine('Virtual machine stopped', 'info');
        } catch (error) {
            this.updateVMStatus('error');
            this.addTerminalLine(`Failed to stop VM: ${error.message}`, 'error');
        }
    }

    restartVM() {
        if (!this.currentVM) return;
        
        this.addTerminalLine('Restarting virtual machine...', 'info');
        
        setTimeout(() => {
            const vm = this.vmInstances.get(this.currentVM);
            this.startVM(vm);
        }, 1000);
    }

    saveVMState() {
        if (!this.currentVM) return;
        
        this.addTerminalLine('Saving VM state...', 'info');
        
        setTimeout(() => {
            this.addTerminalLine('VM state saved successfully', 'success');
            this.showToast('VM state saved', 'success');
        }, 1000);
    }

    updateDashboardStats() {
        const totalVMs = this.vmInstances.size;
        const runningVMs = Array.from(this.vmInstances.values())
            .filter(vm => vm.status === 'running').length;
        
        const availableRam = document.getElementById('availableRam');
        if (availableRam) {
            availableRam.textContent = `${2048 - (runningVMs * 256)} MB`;
        }
        
        const totalStorage = Array.from(this.vmInstances.values())
            .filter(vm => vm.type === 'linux')
            .reduce((sum, vm) => sum + (vm.config.storage || 0), 0);
        
        const availableStorage = document.getElementById('availableStorage');
        if (availableStorage) {
            availableStorage.textContent = `${1000 - totalStorage} MB`;
        }
    }

    updateRecentVMs() {
        const recentList = document.getElementById('recentVMList');
        if (!recentList) return;
        
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
                    <i class="fab fa-${this.getVMIcon(vm.type)}"></i>
                    <h4>${vm.name}</h4>
                </div>
                <div class="vm-card-body">
                    <p>${this.getVMTypeName(vm.type)}</p>
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
        
        // Add event listeners dynamically
        setTimeout(() => {
            document.querySelectorAll('.open-vm').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.openVM(btn.dataset.vmId);
                });
            });
        }, 100);
    }

    getVMIcon(type) {
        const icons = {
            'linux': 'linux',
            'javascript': 'js-square',
            'python': 'python',
            'ruby': 'gem',
            'php': 'php',
            'golang': 'go',
            'rust': 'rust',
            'java': 'java',
            'csharp': 'microsoft',
            'cpp': 'cuttlefish',
            'bash': 'terminal',
            'powershell': 'microsoft',
            'sql': 'database',
            'htmlcss': 'html5'
        };
        return icons[type] || 'server';
    }

    getVMTypeName(type) {
        const typeNames = {
            'linux': 'Linux VM',
            'javascript': 'JavaScript VM',
            'python': 'Python VM',
            'ruby': 'Ruby VM',
            'php': 'PHP VM',
            'golang': 'Go VM',
            'rust': 'Rust VM',
            'java': 'Java VM',
            'csharp': 'C# VM',
            'cpp': 'C++ VM',
            'bash': 'Bash VM',
            'powershell': 'PowerShell VM',
            'sql': 'SQL VM',
            'htmlcss': 'HTML/CSS VM'
        };
        return typeNames[type] || 'VM';
    }

    updateVMList() {
        const vmList = document.getElementById('vmList');
        if (!vmList) return;
        
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
            
            return;
        }
        
        vmList.innerHTML = vms.map(vm => `
            <div class="vm-list-item" data-vm-id="${vm.id}">
                <div class="vm-item-header">
                    <div class="vm-item-icon">
                        <i class="fab fa-${this.getVMIcon(vm.type)}"></i>
                    </div>
                    <div class="vm-item-info">
                        <h4>${vm.name}</h4>
                        <p>${this.getVMTypeName(vm.type)}</p>
                    </div>
                </div>
                <div class="vm-item-status">
                    <span class="status-badge ${vm.status}">
                        <i class="fas fa-circle"></i> ${vm.status}
                        ${vm.paused ? ' (paused)' : ''}
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
        
        // Add event listeners dynamically
        setTimeout(() => {
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
        }, 100);
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
            default:
                config = {
                    type: 'linux',
                    distro: 'alpine',
                    ram: 256,
                    storage: 500,
                    network: true
                };
        }
        
        this.createVM(`${template}-vm`, config);
    }

    saveSettings() {
        const settings = {
            theme: document.getElementById('themeSelect')?.value || 'dark',
            fontSize: document.getElementById('fontSize')?.value || 14,
            maxRam: document.getElementById('maxRam')?.value || 1024,
            autoSave: document.getElementById('autoSave')?.checked || false,
            enableSandbox: document.getElementById('enableSandbox')?.checked || false,
            clearConsole: document.getElementById('clearConsole')?.checked || false
        };
        
        localStorage.setItem('vm_app_settings', JSON.stringify(settings));
        this.showToast('Settings saved successfully', 'success');
    }

    resetSettings() {
        if (confirm('Reset all settings to defaults?')) {
            localStorage.removeItem('vm_app_settings');
            
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) themeSelect.value = 'dark';
            
            const fontSize = document.getElementById('fontSize');
            const fontSizeValue = document.getElementById('fontSizeValue');
            if (fontSize && fontSizeValue) {
                fontSize.value = 14;
                fontSizeValue.textContent = '14px';
                document.documentElement.style.fontSize = '14px';
            }
            
            const maxRam = document.getElementById('maxRam');
            const maxRamValue = document.getElementById('maxRamValue');
            if (maxRam && maxRamValue) {
                maxRam.value = 1024;
                maxRamValue.textContent = '1024 MB';
            }
            
            const autoSave = document.getElementById('autoSave');
            if (autoSave) autoSave.checked = false;
            
            const enableSandbox = document.getElementById('enableSandbox');
            if (enableSandbox) enableSandbox.checked = false;
            
            const clearConsole = document.getElementById('clearConsole');
            if (clearConsole) clearConsole.checked = false;
            
            this.setTheme('dark');
            this.showToast('Settings reset to defaults', 'success');
        }
    }

    setupRangeInputs() {
        const ranges = [
            { id: 'linuxRam', valueId: 'linuxRamValue' },
            { id: 'linuxStorage', valueId: 'linuxStorageValue' },
            { id: 'jsRam', valueId: 'jsRamValue' },
            { id: 'pythonRam', valueId: 'pythonRamValue' }
        ];
        
        ranges.forEach(({ id, valueId }) => {
            const range = document.getElementById(id);
            const value = document.getElementById(valueId);
            
            if (range && value) {
                // Set initial value
                value.textContent = `${range.value} MB`;
                
                // Add event listener
                range.addEventListener('input', (e) => {
                    value.textContent = `${e.target.value} MB`;
                });
            }
        });
        
        // Font size
        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSize && fontSizeValue) {
            fontSizeValue.textContent = `${fontSize.value}px`;
            fontSize.addEventListener('input', (e) => {
                fontSizeValue.textContent = `${e.target.value}px`;
                document.documentElement.style.fontSize = `${e.target.value}px`;
            });
        }
        
        // Max RAM
        const maxRam = document.getElementById('maxRam');
        const maxRamValue = document.getElementById('maxRamValue');
        if (maxRam && maxRamValue) {
            maxRamValue.textContent = `${maxRam.value} MB`;
            maxRam.addEventListener('input', (e) => {
                maxRamValue.textContent = `${e.target.value} MB`;
            });
        }
    }

    loadSavedData() {
        try {
            // Load settings
            const savedSettings = localStorage.getItem('vm_app_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) themeSelect.value = settings.theme || 'dark';
                
                const fontSize = document.getElementById('fontSize');
                const fontSizeValue = document.getElementById('fontSizeValue');
                if (fontSize && fontSizeValue) {
                    fontSize.value = settings.fontSize || 14;
                    fontSizeValue.textContent = `${settings.fontSize || 14}px`;
                    document.documentElement.style.fontSize = `${settings.fontSize || 14}px`;
                }
                
                const maxRam = document.getElementById('maxRam');
                const maxRamValue = document.getElementById('maxRamValue');
                if (maxRam && maxRamValue) {
                    maxRam.value = settings.maxRam || 1024;
                    maxRamValue.textContent = `${settings.maxRam || 1024} MB`;
                }
                
                const autoSave = document.getElementById('autoSave');
                if (autoSave) autoSave.checked = settings.autoSave !== false;
                
                const enableSandbox = document.getElementById('enableSandbox');
                if (enableSandbox) enableSandbox.checked = settings.enableSandbox !== false;
                
                const clearConsole = document.getElementById('clearConsole');
                if (clearConsole) clearConsole.checked = settings.clearConsole !== false;
                
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
            
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
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
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast`;
        toast.textContent = message;
        
        // Add color based on type
        switch(type) {
            case 'success':
                toast.style.borderLeftColor = 'var(--success-color)';
                break;
            case 'warning':
                toast.style.borderLeftColor = 'var(--warning-color)';
                break;
            case 'error':
                toast.style.borderLeftColor = 'var(--danger-color)';
                break;
            default:
                toast.style.borderLeftColor = 'var(--info-color)';
        }
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// VM Manager
class VMManager {
    constructor(app) {
        this.app = app;
        this.vms = new Map();
    }

    async createVM(vm) {
        this.app.logSystem(`Creating ${vm.type} VM with ${vm.config.ram}MB RAM`, 'info');
        
        try {
            const vmInstance = await this.createVMInstance(vm);
            this.vms.set(vm.id, vmInstance);
            
            this.app.logSystem(`${vm.type} VM created successfully`, 'success');
            return vmInstance;
        } catch (error) {
            this.app.logSystem(`Failed to create ${vm.type} VM: ${error.message}`, 'error');
            throw error;
        }
    }

    async createVMInstance(vm) {
        switch(vm.type) {
            case 'linux':
                return await this.createLinuxVM(vm);
            case 'javascript':
                return await this.createJSVM(vm);
            case 'python':
                return await this.createPythonVM(vm);
            default:
                // For other types, create a basic VM
                return await this.createBasicVM(vm);
        }
    }

    async createLinuxVM(vm) {
        const linuxVM = {
            type: 'linux',
            vm: vm,
            filesystem: this.createDefaultFilesystem(),
            processes: [],
            environment: {
                PATH: '/usr/local/bin:/usr/bin:/bin',
                HOME: '/home/user',
                USER: 'user',
                SHELL: '/bin/bash'
            },
            currentDir: '/home/user',
            history: []
        };
        
        this.app.addTerminalLine('Linux VM initialized (simulated environment)', 'info');
        this.app.addTerminalLine('Type "help" for available commands', 'info');
        
        return linuxVM;
    }

    async createJSVM(vm) {
        const jsVM = {
            type: 'javascript',
            vm: vm,
            context: this.createJavaScriptContext(),
            variables: {},
            modules: {},
            history: []
        };
        
        // Load packages if specified
        if (vm.config.packages && vm.config.packages.length > 0) {
            vm.config.packages.forEach(pkg => {
                jsVM.modules[pkg] = `Module '${pkg}' loaded (simulated)`;
            });
        }
        
        this.app.addTerminalLine(`JavaScript VM initialized (Node.js environment)`, 'info');
        this.app.addTerminalLine('Type JavaScript code to execute it', 'info');
        
        return jsVM;
    }

    async createPythonVM(vm) {
        const pythonVM = {
            type: 'python',
            vm: vm,
            variables: {},
            modules: {},
            history: []
        };
        
        if (window.pyodide) {
            pythonVM.pyodide = window.pyodide;
            
            if (vm.config.packages && vm.config.packages.length > 0) {
                this.app.logSystem(`Loading Python packages: ${vm.config.packages.join(', ')}`, 'info');
            }
        }
        
        this.app.addTerminalLine(`Python VM initialized ${window.pyodide ? 'with Pyodide' : 'with basic interpreter'}`, 'info');
        this.app.addTerminalLine('Type Python code to execute it', 'info');
        
        return pythonVM;
    }

    async createBasicVM(vm) {
        const basicVM = {
            type: vm.type,
            vm: vm,
            variables: {},
            history: []
        };
        
        this.app.addTerminalLine(`${this.getVMTypeName(vm.type)} initialized`, 'info');
        this.app.addTerminalLine('Type commands to interact with the VM', 'info');
        
        return basicVM;
    }

    getVMTypeName(type) {
        const typeNames = {
            'linux': 'Linux VM',
            'javascript': 'JavaScript VM',
            'python': 'Python VM',
            'ruby': 'Ruby VM',
            'php': 'PHP VM',
            'golang': 'Go VM',
            'rust': 'Rust VM',
            'java': 'Java VM',
            'csharp': 'C# VM',
            'cpp': 'C++ VM',
            'bash': 'Bash VM',
            'powershell': 'PowerShell VM',
            'sql': 'SQL VM',
            'htmlcss': 'HTML/CSS VM'
        };
        return typeNames[type] || 'VM';
    }

    createDefaultFilesystem() {
        return {
            '/': { type: 'dir', contents: ['home', 'usr', 'bin', 'etc', 'var'] },
            '/home': { type: 'dir', contents: ['user'] },
            '/home/user': { type: 'dir', contents: ['Documents', 'Downloads', 'Desktop'] },
            '/home/user/Documents': { type: 'dir', contents: ['notes.txt'] },
            '/home/user/Downloads': { type: 'dir', contents: [] },
            '/home/user/Desktop': { type: 'dir', contents: [] },
            '/home/user/notes.txt': { type: 'file', content: 'Welcome to your VM!\n\nThis is a simulated filesystem.\n\nTry commands like:\nls -la\ncat notes.txt\npwd\n' },
            '/usr': { type: 'dir', contents: ['bin', 'local'] },
            '/usr/bin': { type: 'dir', contents: ['ls', 'cat', 'echo', 'pwd'] },
            '/bin': { type: 'dir', contents: ['bash', 'sh'] },
            '/etc': { type: 'dir', contents: ['passwd', 'hosts'] }
        };
    }

    createJavaScriptContext() {
        const sandbox = {
            console: {
                log: (...args) => {
                    const output = args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                    ).join(' ');
                    this.app.addTerminalLine(output, 'output');
                },
                error: (...args) => {
                    const output = args.map(arg => String(arg)).join(' ');
                    this.app.addTerminalLine(output, 'error');
                },
                warn: (...args) => {
                    const output = args.map(arg => String(arg)).join(' ');
                    this.app.addTerminalLine(output, 'warning');
                },
                info: (...args) => {
                    const output = args.map(arg => String(arg)).join(' ');
                    this.app.addTerminalLine(output, 'info');
                }
            },
            setTimeout: (fn, delay) => setTimeout(fn, delay),
            setInterval: (fn, delay) => setInterval(fn, delay),
            clearTimeout: (id) => clearTimeout(id),
            clearInterval: (id) => clearInterval(id),
            Math: Math,
            JSON: JSON,
            Date: Date,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            RegExp: RegExp,
            Error: Error,
            Promise: Promise,
            process: {
                env: { NODE_ENV: 'development' },
                argv: [],
                version: 'v18.0.0',
                versions: { node: '18.0.0' },
                platform: 'browser',
                cwd: () => '/',
                exit: (code) => this.app.logSystem(`Process exited with code ${code}`, 'info')
            }
        };
        
        return new Proxy(sandbox, {
            has: () => true,
            get: (target, prop) => {
                if (prop in target) return target[prop];
                if (prop === 'global') return sandbox;
                if (prop === 'globalThis') return sandbox;
                return undefined;
            }
        });
    }

    async processCommand(vmId, command) {
        const vmData = this.vms.get(vmId);
        if (!vmData) {
            return { success: false, error: 'VM not found' };
        }
        
        // Add to history
        vmData.history = vmData.history || [];
        vmData.history.push(command);
        if (vmData.history.length > 100) {
            vmData.history.shift();
        }
        
        try {
            // Handle special commands first
            if (command === 'clear') {
                this.app.clearTerminal();
                return { success: true };
            }
            
            if (command === 'help') {
                const helpText = this.getHelpText(vmData.type);
                return { success: true, output: helpText };
            }
            
            // Process based on VM type
            return await this.processVMCommand(vmData, command);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getHelpText(type) {
        switch(type) {
            case 'linux':
                return `
Available Linux Commands:
• File Operations: ls, cd, pwd, cat, touch, rm, cp, mv, mkdir
• System Info: ps, df, du, free, uptime, uname, whoami, date
• Text Processing: grep, sed, awk, wc, sort, uniq
• Network: ping, ifconfig, netstat, wget, curl
• Process Control: kill, killall, jobs, bg, fg
• Package Management: apt, yum, pacman, pip, npm
• Development: git, make, gcc, python, node
• System Admin: chmod, chown, sudo, passwd
• Misc: echo, export, env, alias, history, which
                `.trim();
            case 'javascript':
                return `
JavaScript VM Commands:
• Basic: console.log(), console.error(), console.warn()
• Math: Math.random(), Math.PI, Math.sqrt(), Math.round()
• Arrays: [1,2,3].map(), .filter(), .reduce(), .forEach()
• Objects: JSON.stringify(), JSON.parse(), Object.keys()
• Strings: "string".toUpperCase(), .toLowerCase(), .includes()
• Dates: new Date(), Date.now(), .getFullYear(), .getMonth()
• Promises: new Promise(), async/await, .then(), .catch()
• Built-in: setTimeout, setInterval, clearTimeout, clearInterval
• Try: console.log("Hello, World!"), [1,2,3,4,5].filter(x => x > 2)
                `.trim();
            case 'python':
                return `
Python VM Commands:
• Basic: print(), input(), len(), type(), str(), int(), float()
• Lists: [1,2,3], .append(), .extend(), .insert(), .remove()
• Dictionaries: {"key": "value"}, .keys(), .values(), .items()
• Strings: "string".upper(), .lower(), .split(), .join()
• Control: if/elif/else, for/while, break/continue
• Functions: def my_func():, lambda x: x*2
• Modules: import math, from datetime import datetime
• Classes: class MyClass:, __init__, self
• Try: print("Hello, World!"), [x**2 for x in range(10)]
                `.trim();
            default:
                return `
Available Commands:
• clear - Clear the terminal
• help - Show this help message
• echo - Print arguments to the terminal
• date - Show current date and time
• whoami - Show current user
• pwd - Show current directory
• ls - List files
• history - Show command history
                `.trim();
        }
    }

    async processVMCommand(vmData, command) {
        switch(vmData.type) {
            case 'linux':
                return await this.processLinuxCommand(vmData, command);
            case 'javascript':
                return await this.processJSCommand(vmData, command);
            case 'python':
                return await this.processPythonCommand(vmData, command);
            default:
                return await this.processBasicCommand(vmData, command);
        }
    }

    async processLinuxCommand(vmData, command) {
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        
        // Handle common Linux commands
        const commands = {
            'echo': () => parts.slice(1).join(' '),
            'date': () => new Date().toString(),
            'whoami': () => 'user',
            'pwd': () => vmData.currentDir || '/home/user',
            'ls': () => this.handleLsCommand(vmData, parts),
            'cd': () => this.handleCdCommand(vmData, parts),
            'cat': () => this.handleCatCommand(vmData, parts),
            'mkdir': () => 'Directory created',
            'touch': () => 'File created',
            'rm': () => 'File removed',
            'cp': () => 'File copied',
            'mv': () => 'File moved',
            'ps': () => 'PID TTY TIME CMD\n1 ? 00:00:01 init\n2 ? 00:00:00 [kthreadd]',
            'df': () => 'Filesystem Size Used Avail Use% Mounted on\n/dev/sda1 100G 30G 70G 30% /',
            'free': () => 'total used free shared buff/cache available\nMem: 2048 1024 512 256 512 256',
            'uptime': () => '12:34:56 up 1 day, 2:30, 1 user, load average: 0.12, 0.15, 0.10',
            'uname': () => 'Linux browser-vm 5.15.0-generic',
            'history': () => vmData.history.join('\n'),
            'grep': () => 'Pattern matched',
            'find': () => 'File found',
            'chmod': () => 'Permissions changed',
            'chown': () => 'Ownership changed',
            'sudo': () => 'Permission denied (try "sudo su" first)',
            'passwd': () => 'Changing password for user\nNew password:',
            'ping': () => 'PING 8.8.8.8 (8.8.8.8): 56 data bytes\n64 bytes from 8.8.8.8: icmp_seq=0 ttl=117 time=10.2 ms',
            'ifconfig': () => 'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\ninet 192.168.1.100',
            'wget': () => 'Downloading... 100% complete',
            'curl': () => 'HTTP/1.1 200 OK\nContent-Type: text/html',
            'apt': () => 'Reading package lists... Done\nBuilding dependency tree... Done',
            'yum': () => 'Loaded plugins: fastestmirror\nLoading mirror speeds from cached hostfile',
            'pacman': () => ':: Synchronizing package databases...\n core is up to date',
            'pip': () => 'Collecting package\nDownloading package... 100%',
            'npm': () => 'added 1 package in 0.5s',
            'git': () => 'On branch main\nYour branch is up to date with origin/main.',
            'docker': () => 'CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES'
        };
        
        if (commands[cmd]) {
            const output = commands[cmd]();
            return { success: true, output: output };
        }
        
        return { success: true, output: `Command executed: ${command}` };
    }

    handleLsCommand(vmData, parts) {
        if (vmData.filesystem && vmData.currentDir) {
            const dir = vmData.filesystem[vmData.currentDir];
            if (dir && dir.type === 'dir') {
                return dir.contents.join('  ');
            }
        }
        return 'bin  etc  home  usr  var';
    }

    handleCdCommand(vmData, parts) {
        if (parts.length < 2) {
            vmData.currentDir = '/home/user';
            return '';
        }
        
        const target = parts[1];
        
        if (target === '..') {
            const pathParts = vmData.currentDir.split('/').filter(p => p);
            pathParts.pop();
            vmData.currentDir = '/' + pathParts.join('/');
            if (vmData.currentDir === '') vmData.currentDir = '/';
        } else if (target === '~' || target === '/home/user') {
            vmData.currentDir = '/home/user';
        } else if (target.startsWith('/')) {
            vmData.currentDir = target;
        } else {
            vmData.currentDir = vmData.currentDir.endsWith('/') 
                ? vmData.currentDir + target 
                : vmData.currentDir + '/' + target;
        }
        
        return '';
    }

    handleCatCommand(vmData, parts) {
        if (parts.length < 2) {
            return 'cat: missing file operand';
        }
        
        const filename = parts[1];
        let fullPath = filename;
        
        if (!filename.startsWith('/')) {
            fullPath = vmData.currentDir.endsWith('/') 
                ? vmData.currentDir + filename 
                : vmData.currentDir + '/' + filename;
        }
        
        if (vmData.filesystem && vmData.filesystem[fullPath] && vmData.filesystem[fullPath].type === 'file') {
            return vmData.filesystem[fullPath].content;
        }
        
        return `cat: ${filename}: No such file`;
    }

    async processJSCommand(vmData, command) {
        const sandbox = vmData.context;
        
        try {
            // Special handling for console commands
            if (command.trim().startsWith('console.')) {
                try {
                    const fn = new Function('sandbox', `
                        with(sandbox) {
                            return (${command});
                        }
                    `);
                    const result = fn(sandbox);
                    
                    if (result !== undefined) {
                        return { success: true };
                    }
                } catch (e) {
                    // Fall through
                }
            }
            
            // Try as expression
            try {
                const fn = new Function('sandbox', `
                    with(sandbox) {
                        return eval(${JSON.stringify(command)});
                    }
                `);
                const result = fn(sandbox);
                
                if (result !== undefined) {
                    const output = typeof result === 'object' 
                        ? JSON.stringify(result, null, 2) 
                        : String(result);
                    return { success: true, output: output };
                }
                
                return { success: true };
            } catch (evalError) {
                // Try as statement
                try {
                    const fn = new Function('sandbox', `
                        with(sandbox) {
                            ${command}
                        }
                    `);
                    fn(sandbox);
                    return { success: true };
                } catch (statementError) {
                    return { success: false, error: statementError.message };
                }
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processPythonCommand(vmData, command) {
        try {
            let result;
            
            if (vmData.pyodide) {
                try {
                    result = await vmData.pyodide.runPythonAsync(command);
                } catch (pyodideError) {
                    return { success: false, error: pyodideError.message };
                }
            } else {
                // Basic Python interpreter
                result = this.processBasicPython(command);
            }
            
            if (result !== undefined && result !== null) {
                return { success: true, output: String(result) };
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    processBasicPython(code) {
        const lines = code.split('\n');
        let result = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
                const content = trimmed.substring(6, trimmed.length - 1);
                try {
                    result += eval(content) + '\n';
                } catch (e) {
                    result += content.replace(/['"]/g, '') + '\n';
                }
            } else if (trimmed.startsWith('#') || trimmed === '') {
                continue;
            } else {
                try {
                    const evalResult = eval(trimmed);
                    if (evalResult !== undefined) {
                        result += String(evalResult) + '\n';
                    }
                } catch (e) {
                    // Ignore eval errors
                }
            }
        }
        
        return result.trim() || undefined;
    }

    async processBasicCommand(vmData, command) {
        // Basic command processing for other VM types
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        
        const basicCommands = {
            'echo': () => parts.slice(1).join(' '),
            'date': () => new Date().toString(),
            'whoami': () => 'user',
            'help': () => this.getHelpText(vmData.type),
            'history': () => vmData.history.join('\n')
        };
        
        if (basicCommands[cmd]) {
            const output = basicCommands[cmd]();
            return { success: true, output: output };
        }
        
        return { success: true, output: `Command executed in ${vmData.type} VM: ${command}` };
    }

    stopVM(vmId) {
        const vmData = this.vms.get(vmId);
        if (!vmData) return;
        
        this.vms.delete(vmId);
        
        const vm = vmData.vm;
        if (vm) {
            vm.status = 'stopped';
            vm.paused = false;
            this.app.saveVMData(vm);
        }
        
        this.app.logSystem('VM stopped', 'info');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing VMApp...");
    window.vmApp = new VMApp();
});

// Add error handling for any uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});
