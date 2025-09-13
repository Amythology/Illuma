// Global variables
const API_BASE = '/api';
let currentUser = null;
let authToken = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadAuthState();
});

// Authentication functions
function loadAuthState() {
    authToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    window.location.href = 'index.html';
}

// API helper function
async function apiCall(endpoint, options = {}) {
    try {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (authToken) {
            config.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        if (response.status === 401) {
            logout();
            return { success: false, message: 'Authentication required' };
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error occurred' };
    }
}

// Public functions for home page
async function loadPublicStats() {
    try {
        const [transactionsResponse, analyticsResponse] = await Promise.all([
            fetch(`${API_BASE}/transactions`),
            fetch(`${API_BASE}/transactions/analytics/summary`)
        ]);
        
        const transactionsData = await transactionsResponse.json();
        
        if (transactionsData.success) {
            const transactions = transactionsData.data;
            
            // Update stats
            document.getElementById('totalTransactions').textContent = transactions.length;
            
            const totalFunds = transactions.reduce((sum, t) => sum + t.amount, 0);
            document.getElementById('totalFunds').textContent = `₹${totalFunds.toLocaleString('en-IN')}`;
            
            const approved = transactions.filter(t => t.status === 'approved').length;
            document.getElementById('approvedCount').textContent = approved;
            
            const pending = transactions.filter(t => t.status === 'pending').length;
            document.getElementById('pendingCount').textContent = pending;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadPublicTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions?limit=12`);
        const data = await response.json();
        
        if (data.success) {
            displayTransactions(data.data, 'transactionsList');
        }
    } catch (error) {
        const container = document.getElementById('transactionsList');
        if (container) {
            container.innerHTML = '<p>Failed to load transactions.</p>';
        }
    }
}

function displayTransactions(transactions, containerId) {
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No transactions found.</p>';
        return;
    }
    
    container.innerHTML = transactions.map(transaction => `
        <div class="transaction-card ${transaction.status}">
            <h3>${transaction.title}</h3>
            <p class="amount">₹${transaction.amount.toLocaleString('en-IN')}</p>
            <p class="description">${transaction.description}</p>
            <p class="department">${transaction.fromDepartment} → ${transaction.toDepartment}</p>
            <p class="category">Category: ${transaction.category}</p>
            <p class="stats">👍 ${transaction.approvals} | 🚩 ${transaction.flags}</p>
            <span class="status-badge status-${transaction.status}">${transaction.status}</span>
            <p class="date">Created: ${new Date(transaction.createdAt).toLocaleDateString('en-IN')}</p>
        </div>
    `).join('');
}

// Filter functions
async function filterTransactions() {
    const status = document.getElementById('statusFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    
    let params = [];
    if (status) params.push(`status=${status}`);
    if (category) params.push(`category=${category}`);
    
    const queryString = params.length ? '?' + params.join('&') : '';
    
    try {
        const response = await fetch(`${API_BASE}/transactions${queryString}`);
        const data = await response.json();
        
        if (data.success) {
            displayTransactions(data.data, 'transactionsList');
        }
    } catch (error) {
        console.error('Filter error:', error);
    }
}

// Message display function
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at top of main content or form container
    const target = document.querySelector('.auth-container') || 
                   document.querySelector('main') || 
                   document.body;
    
    target.insertBefore(messageDiv, target.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Load transactions function for navigation
function loadTransactions() {
    const transactionsSection = document.getElementById('transactions');
    if (transactionsSection) {
        transactionsSection.scrollIntoView({ behavior: 'smooth' });
        loadPublicTransactions();
    }
}
