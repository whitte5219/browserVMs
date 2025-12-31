// Main VM Manager Application
class VMManager {
    constructor() {
        this.vms = new Map();
        this.currentVM = null;
        this.emulator = null;
        this.isRunning = false;
        this.commandHistory = [];
        this.historyIndex = -1;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
        this.loadSavedVMs();
        this.startPerformanceMonitor();
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Fullscreen toggle
        document.getElementById('fullscreenToggle').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // VM Creation
        document.getElementById('createVM').addEventListener('click', () => {
            this.showVMModal();
        });

        document.getElementById('startVM').addEventListener('click', () => {
            this.createVM();
        });

        document.getElementById('cancelVM').addEventListener('click', () => {
            this.hideVMModal();
        });

        document.querySelector('.close-modal').addEventListener('click', () => {
            this.hideVMModal();
        });

        // VM Controls
        document.getElementById('powerBtn').addEventListener('click', () => {
            this.toggleVMPower();
        });

        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartVM();
        });

        document.getElementById('saveVM').addEventListener('click', () => {
            this.saveVMState();
        });

        // Terminal Controls
        document.getElementById('clearTerminal').addEventListener('click', () => {
            this.clearTerminal();
        });

        document.getElementById('copyTerminal').addEventListener('click', () => {
            this.copyTerminal();
        });

        document.getElementById('terminalInput').addEventListener('keydown', (e) => {
            this.handleTerminalInput(e);
        });

        document.getElementById('fullscreenConsole').addEventListener('click', () => {
            this.toggleFullscreenConsole();
        });

        // RAM Slider
        const ramSlider = document.getElementById('ramSlider');
        const ramValue = document.getElementById('ramValue');
        const ramSelect = document.getElementById('ramSelect');

        ramSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            ramValue.textContent = `${value} MB`;
            
            if (value !== 'auto') {
                ramSelect.value = value;
            }
        });

        ramSelect.addEventListener('change', (e) => {
            if (e.target.value === 'auto') {
                const autoRam = this.calculateAutoRAM();
                ramSlider.value = autoRam;
                ramValue.textContent = `${autoRam} MB`;
            } else {
                ramSlider.value = e.target.value;
                ramValue.textContent = `${e.target.value} MB`;
            }
        });

        // Storage Slider
        const storageSlider = document.getElementById('storageSize');
        const storageValue = document.getElementById('storageValue');

        storageSlider.addEventListener('input', (e) => {
            storageValue.textContent = `${e.target.value} MB`;
        });

        // Quick command buttons
        document.querySelectorAll('.quick-commands code').forEach(button => {
            button.addEventListener('click', (e) => {
                const command = e.target.textContent;
                document.getElementById('terminalInput').value = command;
                document.getElementById('terminalInput').focus();
            });
        });

        // Quick command suggestions
        const quickCommands = [
            'help',
            'ls -la',
            'pwd',
            'uname -a',
            'echo "Browser Linux"',
            'date',
            'whoami',
            'df -h',
            'free -m',
            'ps aux'
        ];

        // Load VM button
        document.getElementById('loadVM').addEventListener('click', () => {
            this.loadVMState();
        });

        // Help button
        document.getElementById('helpBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });

        // GitHub button
        document.getElementById('githubBtn').addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://github.com', '_blank');
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSettings();
        });

        // Prevent form submission
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => e.preventDefault());
        });

        // Auto-calculate RAM on load
        const autoRam = this.calculateAutoRAM();
        ramSlider.value = autoRam;
        ramValue.textContent = `${autoRam} MB`;
    }

    showVMModal() {
        document.getElementById('vmConfigModal').classList.add('active');
    }

    hideVMModal() {
        document.getElementById('vmConfigModal').classList.remove('active');
    }

    calculateAutoRAM() {
        // Calculate RAM based on available browser memory
        const performance = window.performance;
        const memory = performance.memory;
        
        if (memory) {
            const available = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
            const mbAvailable = Math.floor(available / (1024 * 1024));
            
            // Suggest RAM based on available memory (capped at 1GB)
            if (mbAvailable > 1024) return 1024;
            if (mbAvailable > 512) return 512;
            if (mbAvailable > 256) return 256;
            if (mbAvailable > 128) return 128;
            return 64;
        }
        
        return 256; // Default fallback
    }

    async createVM() {
        const vmName = document.getElementById('vmName').value || 'linux-vm-1';
        const distro = document.getElementById('distroSelect').value;
        const ram = parseInt(document.getElementById('ramSelect').value === 'auto' ? 
            document.getElementById('ramSlider').value : document.getElementById('ramSelect').value);
        const storage = parseInt(document.getElementById('storageSize').value);
        const network = document.getElementById('networkEnabled').checked;

        // Validate inputs
        if (ram < 64) {
            this.showMessage('RAM must be at least 64MB', 'error');
            return;
        }

        // Hide modal
        this.hideVMModal();

        // Show loading state
        this.showMessage(`Creating ${vmName}...`, 'info');

        // Create VM instance
        const vmId = Date.now().toString();
        const vm = {
            id: vmId,
            name: vmName,
            distro: distro,
            ram: ram,
            storage: storage,
            network: network,
            status: 'creating',
            createdAt: new Date().toISOString()
        };

        // Add to VM list
        this.addVMToList(vm);

        // Initialize emulator
        await this.initEmulator(vm);

        // Update UI
        this.updateVMStatus(vmId, 'running');
        this.showMessage(`${vmName} started successfully!`, 'success');
    }

    addVMToList(vm) {
        const vmInstances = document.getElementById('vmInstances');
        const vmElement = document.createElement('div');
        vmElement.className = 'vm-instance';
        vmElement.dataset.vmId = vm.id;
        
        vmElement.innerHTML = `
            <h5>${vm.name}</h5>
            <div class="vm-details">
                <span>${vm.distro}</span>
                <span>${vm.ram}MB</span>
            </div>
        `;

        vmElement.addEventListener('click', () => {
            this.switchVM(vm.id);
        });

        vmInstances.appendChild(vmElement);
        this.vms.set(vm.id, vm);
        
        // Update running count
        document.querySelector('.vm-list h4').textContent = 
            `Running VMs (${this.vms.size})`;
    }

    async initEmulator(vm) {
        // Stop existing emulator if running
        if (this.emulator) {
            this.emulator.stop();
        }

        // Create v86 instance
        const emulatorConfig = {
            wasm_path: "https://copy.sh/v86/build/v86.wasm",
            memory_size: vm.ram * 1024 * 1024,
            vga_memory_size: 8 * 1024 * 1024,
            screen_container: document.getElementById('terminalOutput'),
            bios: {
                url: "https://copy.sh/v86/build/bios.bin"
            },
            vga_bios: {
                url: "https://copy.sh/v86/build/vgabios.bin"
            }
        };

        // Select appropriate disk image based on distro
        let diskImage = '';
        switch(vm.distro) {
            case 'alpine':
                diskImage = 'https://copy.sh/v86/images/alpine.iso.bin';
                break;
            case 'debian':
                diskImage = 'https://copy.sh/v86/images/linux.iso';
                break;
            case 'ubuntu':
                diskImage = 'https://copy.sh/v86/images/linux.iso';
                break;
            case 'arch':
                diskImage = 'https://github.com/ivandavidov/minimal-linux-images/raw/master/archlinux-buildroot-x86_64.iso';
                break;
            default:
                diskImage = 'https://copy.sh/v86/images/linux.iso';
        }

        emulatorConfig.cdrom = {
            url: diskImage
        };

        if (vm.network) {
            emulatorConfig.network_adapter = true;
        }

        // Initialize emulator
        try {
            this.emulator = new window.V86(emulatorConfig);
            this.currentVM = vm.id;
            
            // Set up emulator events
            this.emulator.add_listener("emulator-ready", () => {
                console.log('Emulator ready');
                this.isRunning = true;
                this.updateVMStatus(vm.id, 'running');
                
                // Enable terminal input
                document.getElementById('terminalInput').disabled = false;
                document.getElementById('terminalInput').focus();
                
                // Update terminal prompt
                this.updateTerminalPrompt(vm.name);
            });

            this.emulator.add_listener("serial0-output-char", (char) => {
                this.writeToTerminal(char);
            });

            // Boot the VM
            this.emulator.run();
            
        } catch (error) {
            console.error('Failed to initialize emulator:', error);
            this.showMessage('Failed to start VM. Please try again.', 'error');
        }
    }

    writeToTerminal(char) {
        const terminalOutput = document.getElementById('terminalOutput');
        if (typeof char === 'string') {
            terminalOutput.textContent += char;
        } else if (char.char) {
            terminalOutput.textContent += char.char;
        }
        
        // Auto-scroll to bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    handleTerminalInput(e) {
        if (!this.isRunning || !this.emulator) return;

        const input = document.getElementById('terminalInput');
        
        switch(e.key) {
            case 'Enter':
                const command = input.value.trim();
                if (command) {
                    // Add to history
                    this.commandHistory.unshift(command);
                    this.historyIndex = -1;
                    
                    // Display command in terminal
                    this.writeToTerminal(`\n$ ${command}\n`);
                    
                    // Send to emulator
                    this.sendCommand(command);
                    
                    // Clear input
                    input.value = '';
                    
                    // Update process list
                    this.updateProcessList(command);
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (this.commandHistory.length > 0 && this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    input.value = this.commandHistory[this.historyIndex];
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    input.value = this.commandHistory[this.historyIndex];
                } else if (this.historyIndex === 0) {
                    this.historyIndex--;
                    input.value = '';
                }
                break;
                
            case 'Tab':
                e.preventDefault();
                this.autoCompleteCommand(input.value);
                break;
        }
    }

    sendCommand(command) {
        if (!this.emulator) return;
        
        // Convert command to character codes and send to emulator
        for (let i = 0; i < command.length; i++) {
            this.emulator.serial0_send(command.charCodeAt(i));
        }
        
        // Send Enter key
        this.emulator.serial0_send(13); // Enter key
    }

    autoCompleteCommand(currentInput) {
        const commands = [
            'ls', 'cd', 'pwd', 'cat', 'echo', 'grep', 'ps', 'kill',
            'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'chmod', 'chown',
            'sudo', 'apt', 'yum', 'pacman', 'df', 'du', 'free',
            'top', 'htop', 'nano', 'vim', 'ssh', 'scp', 'wget', 'curl'
        ];
        
        const matches = commands.filter(cmd => 
            cmd.startsWith(currentInput.toLowerCase())
        );
        
        if (matches.length === 1) {
            document.getElementById('terminalInput').value = matches[0] + ' ';
        } else if (matches.length > 1) {
            // Show suggestions
            this.writeToTerminal('\n' + matches.join('  ') + '\n');
        }
    }

    updateTerminalPrompt(vmName) {
        const prompt = document.querySelector('.prompt');
        prompt.textContent = `guest@${vmName}:~$ `;
    }

    updateVMStatus(vmId, status) {
        const vm = this.vms.get(vmId);
        if (!vm) return;
        
        vm.status = status;
        
        // Update status indicator
        const statusIndicator = document.getElementById('vmStatus');
        const connectionStatus = document.querySelector('#connectionStatus span');
        
        if (status === 'running') {
            statusIndicator.classList.add('running');
            statusIndicator.classList.remove('stopped');
            connectionStatus.textContent = 'Online';
            document.querySelector('#connectionStatus i').className = 'fas fa-circle online';
            document.getElementById('currentVMName').textContent = vm.name;
            
            // Update VM instance UI
            const vmElement = document.querySelector(`[data-vm-id="${vmId}"]`);
            if (vmElement) {
                vmElement.classList.add('active');
            }
        } else {
            statusIndicator.classList.remove('running');
            statusIndicator.classList.add('stopped');
            connectionStatus.textContent = 'Offline';
            document.querySelector('#connectionStatus i').className = 'fas fa-circle';
        }
    }

    toggleVMPower() {
        if (!this.currentVM) {
            this.showMessage('No VM selected', 'warning');
            return;
        }
        
        const vm = this.vms.get(this.currentVM);
        if (vm.status === 'running') {
            this.stopVM();
        } else {
            this.startVM();
        }
    }

    stopVM() {
        if (this.emulator) {
            this.emulator.stop();
            this.isRunning = false;
            this.updateVMStatus(this.currentVM, 'stopped');
            document.getElementById('terminalInput').disabled = true;
            this.showMessage('VM stopped', 'info');
        }
    }

    startVM() {
        if (this.currentVM) {
            const vm = this.vms.get(this.currentVM);
            this.initEmulator(vm);
        }
    }

    restartVM() {
        if (this.currentVM) {
            const vm = this.vms.get(this.currentVM);
            this.stopVM();
            setTimeout(() => {
                this.initEmulator(vm);
            }, 1000);
        }
    }

    switchVM(vmId) {
        if (this.currentVM === vmId) return;
        
        this.currentVM = vmId;
        const vm = this.vms.get(vmId);
        
        // Update UI
        document.querySelectorAll('.vm-instance').forEach(el => {
            el.classList.remove('active');
        });
        
        const activeVM = document.querySelector(`[data-vm-id="${vmId}"]`);
        if (activeVM) {
            activeVM.classList.add('active');
        }
        
        // Restart emulator with this VM
        if (vm.status === 'running') {
            this.initEmulator(vm);
        } else {
            document.getElementById('currentVMName').textContent = vm.name;
            this.updateTerminalPrompt(vm.name);
            this.showMessage(`Switched to ${vm.name}. VM is not running.`, 'info');
        }
    }

    clearTerminal() {
        const terminalOutput = document.getElementById('terminalOutput');
        terminalOutput.innerHTML = '';
    }

    copyTerminal() {
        const terminalOutput = document.getElementById('terminalOutput');
        const text = terminalOutput.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            this.showMessage('Terminal content copied to clipboard', 'success');
        });
    }

    toggleFullscreenConsole() {
        const terminalContainer = document.querySelector('.terminal-container');
        
        if (!document.fullscreenElement) {
            terminalContainer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    toggleTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const icon = themeToggle.querySelector('i');
        
        if (document.body.hasAttribute('data-theme')) {
            document.body.removeAttribute('data-theme');
            icon.className = 'fas fa-moon';
            localStorage.setItem('vm-theme', 'dark');
        } else {
            document.body.setAttribute('data-theme', 'light');
            icon.className = 'fas fa-sun';
            localStorage.setItem('vm-theme', 'light');
        }
    }

    updateStats() {
        // Update memory usage
        if (performance.memory) {
            const usedMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
            const totalMB = Math.round(performance.memory.jsHeapSizeLimit / (1024 * 1024));
            
            document.getElementById('memoryUsage').textContent = `${usedMB}/${totalMB} MB`;
            
            // Update progress bar
            const percentage = (usedMB / totalMB) * 100;
            document.getElementById('memoryBar').style.width = `${percentage}%`;
        }
        
        // Update storage usage
        const totalStorage = Array.from(this.vms.values())
            .reduce((sum, vm) => sum + vm.storage, 0);
        document.getElementById('storageUsage').textContent = `${totalStorage} MB`;
        
        // Update VM monitor stats if VM is running
        if (this.isRunning && this.currentVM) {
            const vm = this.vms.get(this.currentVM);
            
            // Simulate CPU usage
            const cpuUsage = Math.floor(Math.random() * 30) + 5;
            document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
            
            // Update memory display
            const usedMemory = Math.floor(vm.ram * 0.3 + Math.random() * vm.ram * 0.2);
            document.getElementById('vmMemory').textContent = `${usedMemory}/${vm.ram} MB`;
            
            // Update disk usage
            const usedStorage = Math.floor(vm.storage * 0.4 + Math.random() * vm.storage * 0.1);
            document.getElementById('diskUsage').textContent = `${usedStorage} MB`;
            
            // Update network status
            document.getElementById('networkStatus').textContent = 
                vm.network ? 'Connected' : 'Disabled';
        }
    }

    updateProcessList(command) {
        const processList = document.getElementById('processList');
        const processes = [
            'bash', 'init', 'systemd', 'login', 'getty',
            'dhclient', 'sshd', 'cron', 'rsyslogd'
        ];
        
        // Add the current command as a process
        const cmdName = command.split(' ')[0];
        if (!processes.includes(cmdName) && cmdName.length > 0) {
            processes.unshift(cmdName);
        }
        
        // Update process list display
        processList.innerHTML = '';
        
        processes.slice(0, 5).forEach(proc => {
            const procEl = document.createElement('div');
            procEl.className = 'process-item';
            procEl.innerHTML = `
                <span class="process-name">${proc}</span>
                <span class="process-pid">${Math.floor(Math.random() * 1000) + 1000}</span>
            `;
            processList.appendChild(procEl);
        });
    }

    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Remove after delay
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    saveVMState() {
        if (!this.currentVM) {
            this.showMessage('No VM to save', 'warning');
            return;
        }
        
        const vm = this.vms.get(this.currentVM);
        const state = {
            ...vm,
            savedAt: new Date().toISOString(),
            commandHistory: this.commandHistory.slice(0, 20)
        };
        
        localStorage.setItem(`vm-${vm.id}`, JSON.stringify(state));
        this.showMessage(`VM "${vm.name}" state saved`, 'success');
    }

    loadVMState() {
        const savedVMs = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('vm-')) {
                try {
                    const vm = JSON.parse(localStorage.getItem(key));
                    savedVMs.push(vm);
                } catch (e) {
                    console.error('Failed to parse saved VM:', e);
                }
            }
        }
        
        if (savedVMs.length === 0) {
            this.showMessage('No saved VMs found', 'info');
            return;
        }
        
        // Show saved VMs for selection
        this.showSavedVMs(savedVMs);
    }

    showSavedVMs(vms) {
        // Simple implementation - load the first saved VM
        if (vms.length > 0) {
            const vm = vms[0];
            this.vms.set(vm.id, vm);
            this.addVMToList(vm);
            this.switchVM(vm.id);
            this.showMessage(`Loaded saved VM: ${vm.name}`, 'success');
        }
    }

    loadSavedVMs() {
        // Load theme preference
        const savedTheme = localStorage.getItem('vm-theme');
        if (savedTheme === 'light') {
            document.body.setAttribute('data-theme', 'light');
            document.getElementById('themeToggle').querySelector('i').className = 'fas fa-sun';
        }
    }

    showHelp() {
        const helpText = `
Available Commands:
• Basic: ls, cd, pwd, cat, echo, mkdir, rm, cp, mv
• System: ps, top, df, free, uname, whoami
• Network: ping, wget, curl, ssh, scp
• Package Managers: apt (Debian/Ubuntu), pacman (Arch), apk (Alpine)

VM Controls:
• Click "New VM" to create a virtual machine
• Adjust RAM and storage using sliders
• Use the terminal to interact with your VM
• Save VM state to resume later

Tips:
• Press Tab for command auto-completion
• Use Up/Down arrows for command history
• Click quick commands to insert them
        `;
        
        this.writeToTerminal('\n' + helpText + '\n');
    }

    showSettings() {
        this.showMessage('Settings dialog coming soon!', 'info');
    }

    startPerformanceMonitor() {
        setInterval(() => {
            this.updateStats();
        }, 2000);
    }
}

// Custom toast styles
const style = document.createElement('style');
style.textContent = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: var(--card-bg);
    color: var(--text-color);
    border-radius: 8px;
    border-left: 4px solid var(--primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-family: var(--font-sans);
}

.toast-success {
    border-left-color: var(--success-color);
}

.toast-error {
    border-left-color: var(--danger-color);
}

.toast-warning {
    border-left-color: var(--warning-color);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.process-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.1);
    margin-bottom: 0.25rem;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
}

.process-name {
    color: var(--text-color);
}

.process-pid {
    color: var(--text-muted);
}
`;
document.head.appendChild(style);

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.vmManager = new VMManager();
});

// Add some CSS for the toast
document.head.insertAdjacentHTML('beforeend', `
<style>
#terminalOutput {
    white-space: pre-wrap;
    word-break: break-all;
}
</style>
`);
