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
        try {
            // Initialize Pyodide for Python VMs
            if (typeof loadPyodide === 'function') {
                window.pyodide = await loadPyodide({
                    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
                });
                this.logSystem("Pyodide initialized successfully");
            } else {
                this.logSystem("Pyodide not available - Python VMs will use basic interpreter");
            }
        } catch (error) {
            console.warn("Failed to initialize Pyodide:", error);
            this.logSystem("Python VMs will use basic interpreter");
        }
        
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
        const createQuickVM = document.getElementById('createQuickVM');
        if (createQuickVM) {
            createQuickVM.addEventListener('click', () => {
                this.showVMCreation();
            });
        }

        const createFirstVM = document.getElementById('createFirstVM');
        if (createFirstVM) {
            createFirstVM.addEventListener('click', () => {
                this.showVMCreation();
            });
        }

        const createNewVM = document.getElementById('createNewVM');
        if (createNewVM) {
            createNewVM.addEventListener('click', () => {
                this.showVMCreation();
            });
        }

        // Back to dashboard
        const backToDashboard = document.getElementById('backToDashboard');
        if (backToDashboard) {
            backToDashboard.addEventListener('click', () => {
                this.stopCurrentVM();
                this.showScreen('dashboard');
            });
        }

        // VM Creation Modal
        const modal = document.getElementById('vmCreationModal');
        const closeBtn = modal ? modal.querySelector('.close-modal') : null;
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

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

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.validateStep(currentStep)) {
                    currentStep++;
                    this.showCreationStep(currentStep);
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentStep--;
                this.showCreationStep(currentStep);
            });
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createVMFromModal();
            });
        }

        // Template buttons
        document.querySelectorAll('.use-template').forEach(btn => {
            btn.addEventListener('click', () => {
                this.useTemplate(btn.dataset.template);
            });
        });

        // Settings
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }

        // VM Screen controls
        const powerBtn = document.getElementById('powerVM');
        if (powerBtn) {
            powerBtn.addEventListener('click', () => {
                this.toggleVMPower();
            });
        }

        const restartBtn = document.getElementById('restartVM');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.restartVM();
            });
        }

        const saveVMBtn = document.getElementById('saveVM');
        if (saveVMBtn) {
            saveVMBtn.addEventListener('click', () => {
                this.saveVMState();
            });
        }

        // Console tabs
        document.querySelectorAll('.console-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchConsoleTab(tab.dataset.tab);
            });
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

        const sendCommandBtn = document.getElementById('sendCommand');
        if (sendCommandBtn) {
            sendCommandBtn.addEventListener('click', () => {
                this.sendTerminalCommand();
            });
        }

        // Quick commands
        document.querySelectorAll('.cmd-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (terminalInput) {
                    terminalInput.value = btn.dataset.command;
                    this.sendTerminalCommand();
                }
            });
        });

        // Output controls
        const clearOutputBtn = document.getElementById('clearOutput');
        if (clearOutputBtn) {
            clearOutputBtn.addEventListener('click', () => {
                this.clearOutputLog();
            });
        }

        const copyOutputBtn = document.getElementById('copyOutput');
        if (copyOutputBtn) {
            copyOutputBtn.addEventListener('click', () => {
                this.copyOutputLog();
            });
        }

        // Range inputs
        this.setupRangeInputs();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter to send command
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendTerminalCommand();
            }
            
            // Escape to clear input
            if (e.key === 'Escape' && terminalInput) {
                terminalInput.value = '';
                terminalInput.focus();
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

        // Settings reset
        const resetSettingsBtn = document.getElementById('resetSettings');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => {
                this.resetSettings();
            });
        }
    }

    setupRangeInputs() {
        // Linux RAM
        const linuxRam = document.getElementById('linuxRam');
        const linuxRamValue = document.getElementById('linuxRamValue');
        if (linuxRam && linuxRamValue) {
            linuxRam.addEventListener('input', (e) => {
                linuxRamValue.textContent = `${e.target.value} MB`;
            });
            linuxRamValue.textContent = `${linuxRam.value} MB`;
        }

        // Linux Storage
        const linuxStorage = document.getElementById('linuxStorage');
        const linuxStorageValue = document.getElementById('linuxStorageValue');
        if (linuxStorage && linuxStorageValue) {
            linuxStorage.addEventListener('input', (e) => {
                linuxStorageValue.textContent = `${e.target.value} MB`;
            });
            linuxStorageValue.textContent = `${linuxStorage.value} MB`;
        }

        // JS RAM
        const jsRam = document.getElementById('jsRam');
        const jsRamValue = document.getElementById('jsRamValue');
        if (jsRam && jsRamValue) {
            jsRam.addEventListener('input', (e) => {
                jsRamValue.textContent = `${e.target.value} MB`;
            });
            jsRamValue.textContent = `${jsRam.value} MB`;
        }

        // Python RAM
        const pythonRam = document.getElementById('pythonRam');
        const pythonRamValue = document.getElementById('pythonRamValue');
        if (pythonRam && pythonRamValue) {
            pythonRam.addEventListener('input', (e) => {
                pythonRamValue.textContent = `${e.target.value} MB`;
            });
            pythonRamValue.textContent = `${pythonRam.value} MB`;
        }

        // Font size
        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSize && fontSizeValue) {
            fontSize.addEventListener('input', (e) => {
                fontSizeValue.textContent = `${e.target.value}px`;
                document.documentElement.style.fontSize = `${e.target.value}px`;
            });
        }

        // Max RAM
        const maxRam = document.getElementById('maxRam');
        const maxRamValue = document.getElementById('maxRamValue');
        if (maxRam && maxRamValue) {
            maxRam.addEventListener('input', (e) => {
                maxRamValue.textContent = `${e.target.value} MB`;
            });
        }
    }

    showVMCreation() {
        const modal = document.getElementById('vmCreationModal');
        if (modal) {
            modal.classList.add('active');
            
            // Reset to step 1
            this.showCreationStep(1);
            
            // Select Linux by default
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
        
        const reviewType = document.getElementById('reviewType');
        if (reviewType) {
            reviewType.textContent = 
                type === 'linux' ? 'Linux VM' : 
                type === 'javascript' ? 'JavaScript VM' : 
                'Python VM';
        }
        
        const reviewName = document.getElementById('reviewName');
        if (reviewName) {
            reviewName.textContent = 
                document.getElementById('vmName')?.value || 'my-vm-1';
        }
        
        if (type === 'linux') {
            const ram = document.getElementById('linuxRamValue')?.textContent || '256 MB';
            const storage = document.getElementById('linuxStorageValue')?.textContent || '500 MB';
            const distro = document.getElementById('linuxDistro')?.selectedOptions[0]?.text || 'Alpine Linux (5MB)';
            
            const reviewRam = document.getElementById('reviewRam');
            const reviewStorage = document.getElementById('reviewStorage');
            const reviewConfig = document.getElementById('reviewConfig');
            
            if (reviewRam) reviewRam.textContent = ram;
            if (reviewStorage) reviewStorage.textContent = storage;
            if (reviewConfig) reviewConfig.textContent = distro;
        } else if (type === 'javascript') {
            const ram = document.getElementById('jsRamValue')?.textContent || '128 MB';
            const version = document.getElementById('jsVersion')?.selectedOptions[0]?.text || 'Node.js 18 LTS';
            
            const reviewRam = document.getElementById('reviewRam');
            const reviewStorage = document.getElementById('reviewStorage');
            const reviewConfig = document.getElementById('reviewConfig');
            
            if (reviewRam) reviewRam.textContent = ram;
            if (reviewStorage) reviewStorage.textContent = 'N/A';
            if (reviewConfig) reviewConfig.textContent = version;
        } else if (type === 'python') {
            const ram = document.getElementById('pythonRamValue')?.textContent || '128 MB';
            const version = document.getElementById('pythonVersion')?.selectedOptions[0]?.text || 'Python 3.11';
            
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
        } else if (type === 'javascript') {
            config = {
                type: 'javascript',
                version: document.getElementById('jsVersion')?.value || '18',
                ram: parseInt(document.getElementById('jsRam')?.value || '128'),
                packages: document.getElementById('jsPackages')?.value.split(',').map(p => p.trim()).filter(p => p) || []
            };
        } else if (type === 'python') {
            config = {
                type: 'python',
                version: document.getElementById('pythonVersion')?.value || '3.11',
                ram: parseInt(document.getElementById('pythonRam')?.value || '128'),
                packages: document.getElementById('pythonPackages')?.value.split(',').map(p => p.trim()).filter(p => p) || []
            };
        }
        
        // Close modal
        if (modal) modal.classList.remove('active');
        
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
        
        // Update last opened
        vm.lastOpened = new Date().toISOString();
        
        // Update UI
        const currentVMName = document.getElementById('currentVMName');
        if (currentVMName) currentVMName.textContent = vm.name;
        
        const vmInfoType = document.getElementById('vmInfoType');
        if (vmInfoType) {
            vmInfoType.textContent = 
                vm.type === 'linux' ? 'Linux VM' : 
                vm.type === 'javascript' ? 'JavaScript VM' : 
                'Python VM';
        }
        
        const vmInfoCreated = document.getElementById('vmInfoCreated');
        if (vmInfoCreated) {
            vmInfoCreated.textContent = new Date(vm.createdAt).toLocaleDateString();
        }
        
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
        this.addTerminalLine('Starting virtual machine...', 'welcome');
        this.logSystem(`Starting ${vm.name} (${vm.type} VM)`);
        
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
            this.addTerminalLine('Virtual machine started successfully', 'info');
            this.logSystem(`${vm.name} started successfully`);
            
        } catch (error) {
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
        }
    }

    updateVMStatus(status) {
        const statusIcon = document.getElementById('vmStatusIcon');
        const statusText = document.getElementById('vmStatusText');
        const connectionStatus = document.querySelector('#connectionStatus span');
        
        if (statusIcon) {
            statusIcon.className = 'fas fa-circle';
        }
        
        if (statusText) {
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        if (connectionStatus) {
            connectionStatus.textContent = status;
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
        
        // Add to terminal output
        this.addTerminalLine(`$ ${command}`, 'command');
        
        // Clear input
        if (input) input.value = '';
        
        // Process command
        try {
            const result = await this.vmManager.processCommand(this.currentVM, command);
            
            if (result.success) {
                if (result.output) {
                    this.addTerminalLine(result.output, 'output');
                }
                
                // Log successful command
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
        
        // Store in VM logs
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
        }).catch(err => {
            console.error('Failed to copy:', err);
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
        if (terminalInput) {
            terminalInput.disabled = tabName !== 'terminal';
            if (tabName === 'terminal') terminalInput.focus();
        }
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
        
        // Update uptime
        if (vm.lastOpened) {
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
        if (vm.status === 'running') {
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
        
        // In a real app, this would save the VM state
        setTimeout(() => {
            this.addTerminalLine('VM state saved successfully', 'success');
            this.showToast('VM state saved', 'success');
        }, 1000);
    }

    updateDashboardStats() {
        // Update available RAM (simulated)
        const totalVMs = this.vmInstances.size;
        const runningVMs = Array.from(this.vmInstances.values())
            .filter(vm => vm.status === 'running').length;
        
        // Update UI
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
            
            const createFirstVM = document.getElementById('createFirstVM');
            if (createFirstVM) {
                createFirstVM.addEventListener('click', () => {
                    this.showVMCreation();
                });
            }
            
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
            
            const createFromList = document.getElementById('createFromList');
            if (createFromList) {
                createFromList.addEventListener('click', () => {
                    this.showVMCreation();
                });
            }
            
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
            
            // Reset UI elements
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

    loadSavedData() {
        // Load settings
        const savedSettings = localStorage.getItem('vm_app_settings');
        if (savedSettings) {
            try {
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
            } catch (e) {
                console.error('Error loading settings:', e);
            }
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

// VM Manager - Handles different VM types
class VMManager {
    constructor(app) {
        this.app = app;
        this.vms = new Map();
        this.linuxEmulator = null;
    }

    async createLinuxVM(vm) {
        this.app.logSystem(`Creating Linux VM with ${vm.config.ram}MB RAM and ${vm.config.storage}MB storage`, 'info');
        
        // Check if v86 is available
        if (typeof window.V86 === 'undefined') {
            this.app.logSystem('v86 emulator not loaded. Please check your internet connection.', 'error');
            throw new Error('v86 emulator not available');
        }
        
        try {
            const config = {
                wasm_path: "https://copy.sh/v86/wasm/v86.wasm",
                memory_size: vm.config.ram * 1024 * 1024,
                vga_memory_size: 2 * 1024 * 1024,
                screen_container: document.createElement('div'),
                bios: { url: "https://copy.sh/v86/bios/seabios.bin" },
                vga_bios: { url: "https://copy.sh/v86/bios/vgabios.bin" },
                cdrom: { url: this.getLinuxImage(vm.config.distro) },
                autostart: true
            };

            if (vm.config.network) {
                config.network_adapter = true;
            }

            this.linuxEmulator = new window.V86(config);
            
            const vmInstance = {
                type: 'linux',
                emulator: this.linuxEmulator,
                vm: vm,
                buffer: ''
            };
            
            this.vms.set(vm.id, vmInstance);
            
            // Setup serial output
            this.linuxEmulator.add_listener("serial0-output-byte", (byte) => {
                const char = String.fromCharCode(byte);
                vmInstance.buffer += char;
                
                // When we get a newline, output the buffer
                if (char === '\n' || vmInstance.buffer.length > 100) {
                    this.app.addTerminalLine(vmInstance.buffer.trim(), 'output');
                    vmInstance.buffer = '';
                }
            });
            
            this.app.logSystem('Linux VM emulator initialized', 'success');
            
            return vmInstance;
            
        } catch (error) {
            this.app.logSystem(`Failed to create Linux VM: ${error.message}`, 'error');
            throw error;
        }
    }

    async createJSVM(vm) {
        this.app.logSystem(`Creating JavaScript VM with Node.js ${vm.config.version}`, 'info');
        
        const jsVM = {
            type: 'javascript',
            context: {
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
                    }
                },
                setTimeout,
                setInterval,
                clearTimeout,
                clearInterval,
                Math,
                JSON,
                Date,
                Array,
                Object,
                String,
                Number,
                Boolean,
                RegExp,
                Error,
                Promise
            },
            vm: vm,
            variables: {}
        };
        
        // Add some Node.js-like globals
        jsVM.context.global = jsVM.context;
        jsVM.context.globalThis = jsVM.context;
        jsVM.context.process = {
            env: { NODE_ENV: 'development' },
            argv: [],
            version: `v${vm.config.version}.0.0`,
            versions: { node: vm.config.version },
            platform: 'browser',
            cwd: () => '/',
            exit: () => this.app.logSystem('Process exited', 'info')
        };
        
        // Load packages if specified
        if (vm.config.packages && vm.config.packages.length > 0) {
            this.app.logSystem(`Loading packages: ${vm.config.packages.join(', ')}`, 'info');
            
            // Simulate loading packages
            vm.config.packages.forEach(pkg => {
                jsVM.context[pkg] = `Package '${pkg}' would be loaded here`;
            });
        }
        
        this.vms.set(vm.id, jsVM);
        
        this.app.addTerminalLine(`JavaScript VM initialized with Node.js ${vm.config.version}`, 'info');
        this.app.addTerminalLine('Type JavaScript code to execute it', 'info');
        this.app.addTerminalLine('Try: console.log("Hello, World!") or 2 + 2', 'info');
        
        return jsVM;
    }

    async createPythonVM(vm) {
        this.app.logSystem(`Creating Python VM ${vm.config.version}`, 'info');
        
        const pythonVM = {
            type: 'python',
            vm: vm,
            variables: {},
            history: []
        };
        
        // Check if Pyodide is available
        if (window.pyodide) {
            pythonVM.pyodide = window.pyodide;
            this.app.logSystem('Using Pyodide for Python execution', 'info');
            
            // Load packages if specified
            if (vm.config.packages && vm.config.packages.length > 0) {
                this.app.logSystem(`Loading Python packages: ${vm.config.packages.join(', ')}`, 'info');
                
                try {
                    for (const pkg of vm.config.packages) {
                        if (pkg.trim()) {
                            await window.pyodide.loadPackage(pkg.trim());
                            this.app.logSystem(`Loaded package: ${pkg}`, 'success');
                        }
                    }
                } catch (error) {
                    this.app.logSystem(`Failed to load some packages: ${error.message}`, 'warning');
                }
            }
        } else {
            this.app.logSystem('Pyodide not available, using basic Python interpreter', 'info');
        }
        
        this.vms.set(vm.id, pythonVM);
        
        this.app.addTerminalLine(`Python VM initialized ${window.pyodide ? 'with Pyodide' : 'with basic interpreter'}`, 'info');
        this.app.addTerminalLine('Type Python code to execute it', 'info');
        this.app.addTerminalLine('Try: print("Hello, World!") or 2 + 2', 'info');
        
        return pythonVM;
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
            
            return { success: false, error: 'Unknown VM type' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processLinuxCommand(vmData, command) {
        if (!vmData.emulator) {
            return { success: false, error: 'Linux emulator not available' };
        }
        
        try {
            // Special commands
            if (command === 'clear') {
                this.app.clearTerminal();
                return { success: true };
            }
            
            if (command === 'help') {
                const help = `
Available in Linux VM:
• Basic commands will be sent to the emulator
• Special: clear, help
Note: The emulator may take time to boot and respond
                `.trim();
                return { success: true, output: help };
            }
            
            // Send command to emulator
            for (let i = 0; i < command.length; i++) {
                vmData.emulator.serial0_send(command.charCodeAt(i));
            }
            
            // Send Enter key
            vmData.emulator.serial0_send(13); // Enter
            
            return { success: true, output: 'Command sent to Linux VM' };
            
        } catch (error) {
            return { success: false, error: `Failed to send command: ${error.message}` };
        }
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
Available in JavaScript VM:
• JavaScript expressions: 2 + 2, Math.PI, [1,2,3].map(x => x*2)
• Console output: console.log("Hello"), console.error("Error")
• Variable assignment: let x = 10; x * 2
• Functions: function greet() { return "Hello" }; greet()
• Object creation: const obj = { name: "test", value: 42 }
• Array operations: [1,2,3].filter(x => x > 1)
• Special: clear, help
                `.trim();
                return { success: true, output: help };
            }
            
            // Try to evaluate the command
            let result;
            
            // First try as expression
            try {
                const fn = new Function('sandbox', `
                    with(sandbox) {
                        return eval(${JSON.stringify(command)});
                    }
                `);
                result = fn(sandbox);
            } catch (evalError) {
                // If eval fails, try as a statement
                try {
                    const fn = new Function('sandbox', `
                        with(sandbox) {
                            ${command}
                        }
                    `);
                    result = fn(sandbox);
                } catch (statementError) {
                    return { success: false, error: statementError.message };
                }
            }
            
            // Handle the result
            if (result !== undefined && result !== null) {
                let output;
                if (typeof result === 'object') {
                    try {
                        output = JSON.stringify(result, null, 2);
                    } catch (e) {
                        output = result.toString();
                    }
                } else {
                    output = String(result);
                }
                return { success: true, output: output };
            }
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async processPythonCommand(vmData, command) {
        try {
            // Special commands
            if (command === 'clear') {
                this.app.clearTerminal();
                return { success: true };
            }
            
            if (command === 'help') {
                const help = `
Available in Python VM:
• Python expressions: 2 + 2, [x**2 for x in range(5)]
• Print output: print("Hello"), print(f"Value: {42}")
• Variable assignment: x = 10; y = 20; x + y
• Functions: def greet(): return "Hello"; greet()
• Import modules: import math; math.sqrt(16)
• List operations: [1,2,3,4,5][1:4]
• Special: clear, help
                `.trim();
                return { success: true, output: help };
            }
            
            let result;
            
            if (vmData.pyodide) {
                // Use Pyodide
                try {
                    result = await vmData.pyodide.runPythonAsync(command);
                } catch (pyodideError) {
                    return { success: false, error: pyodideError.message };
                }
            } else {
                // Basic Python interpreter fallback
                result = this.processBasicPython(command);
            }
            
            // Handle the result
            if (result !== undefined && result !== null) {
                return { success: true, output: String(result) };
            }
            
            return { success: true };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    processBasicPython(code) {
        // Very basic Python interpreter for fallback
        const lines = code.split('\n');
        let result = '';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
                const content = trimmed.substring(6, trimmed.length - 1);
                result += eval(content) + '\n';
            } else if (trimmed.includes('=')) {
                // Variable assignment
                const [varName, value] = trimmed.split('=').map(s => s.trim());
                // Store variable (in a real implementation, you'd track this)
                result += `${varName} = ${eval(value)}\n`;
            } else {
                try {
                    const evalResult = eval(trimmed);
                    if (evalResult !== undefined) {
                        result += String(evalResult) + '\n';
                    }
                } catch (e) {
                    // Ignore eval errors for now
                }
            }
        }
        
        return result.trim() || undefined;
    }

    stopVM(vmId) {
        const vmData = this.vms.get(vmId);
        if (!vmData) return;
        
        if (vmData.type === 'linux' && vmData.emulator) {
            try {
                vmData.emulator.stop();
                this.app.logSystem('Linux VM stopped', 'info');
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
        
        return images[distro] || images.alpine;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.vmApp = new VMApp();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.VMApp = VMApp;
    window.VMManager = VMManager;
}
