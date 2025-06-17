// Connect to Socket.io
const socket = io();

// DOM elements
const leadForm = document.getElementById('lead-form');
const messageForm = document.getElementById('message-form');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message');
const leadNameDisplay = document.getElementById('lead-name');
const classificationBadge = document.getElementById('classification-badge');
const classificationStatus = document.getElementById('classification-status');
const metadataList = document.getElementById('metadata-list');
const classificationsListElement = document.getElementById('classifications-list');
const chatInput = document.querySelector('.chat-input');
const chatPlaceholder = document.querySelector('.chat-placeholder');
const industrySelect = document.getElementById('industry');

// Current conversation state
let currentConversation = {
    id: null,
    leadName: '',
    messages: [],
    metadata: {}
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load recent classifications
    loadRecentClassifications();
});

// Submit lead form
leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const source = document.getElementById('source').value;
    const initialMessage = document.getElementById('initial-message').value;
    const industry = industrySelect.value;
    
    // Create lead data
    const leadData = {
        name,
        phone,
        source,
        initialMessage,
        industry
    };
    
    // Reset UI
    resetChat();
    
    // Emit new lead event
    socket.emit('new-lead', leadData);
    
    // Update UI
    leadNameDisplay.textContent = name;
    currentConversation.leadName = name;
    
    // Show chat input
    chatInput.classList.remove('hidden');
    chatPlaceholder.classList.add('hidden');
});

// Submit message form
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add message to UI
    addMessageToUI('user', message);
    
    // Send message to server
    socket.emit('user-message', {
        conversationId: currentConversation.id,
        message
    });
    
    // Clear input
    messageInput.value = '';
});

// Socket events
socket.on('bot-message', (data) => {
    console.log("Received bot message:", data); // Add this debugging line
    
    // Set conversation ID if not set
    if (!currentConversation.id && data.conversationId) {
        currentConversation.id = data.conversationId;
        console.log("Set conversation ID to:", currentConversation.id); // Add this debugging line
    }
    
    // Add message to UI
    addMessageToUI('bot', data.message);
    
    // Scroll to bottom
    scrollToBottom();
});

socket.on('classification', (data) => {
    // Update classification badge
    classificationBadge.classList.remove('hidden', 'hot', 'cold', 'invalid');
    classificationBadge.classList.add(data.classification.status.toLowerCase());
    classificationStatus.textContent = data.classification.status;
    
    // Show classification details
    const reasons = data.classification.reasons.join(', ');
    alert(`Lead classified as: ${data.classification.status}\nConfidence: ${data.classification.confidence * 100}%\nReasons: ${reasons}`);
    
    // Refresh classifications list
    loadRecentClassifications();
});

socket.on('metadata-update', (data) => {
    // Update metadata display
    updateMetadataDisplay(data.metadata);
    
    // Update current conversation metadata
    currentConversation.metadata = data.metadata;
});

socket.on('error', (data) => {
    alert(`Error: ${data.message}`);
});

// Helper functions
function addMessageToUI(sender, text) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    // Create text element
    const messageText = document.createElement('p');
    messageText.textContent = text;
    
    // Create timestamp
    const timestamp = document.createElement('div');
    timestamp.classList.add('timestamp');
    const now = new Date();
    timestamp.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Append elements
    messageDiv.appendChild(messageText);
    messageDiv.appendChild(timestamp);
    
    // Add to chat
    chatMessages.appendChild(messageDiv);
    
    // Add to current conversation
    currentConversation.messages.push({
        sender,
        text,
        timestamp: now
    });
    
    // Scroll to bottom
    scrollToBottom();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function resetChat() {
    // Clear chat messages
    chatMessages.innerHTML = '';
    
    // Reset current conversation
    currentConversation = {
        id: null,
        leadName: '',
        messages: [],
        metadata: {}
    };
    
    // Reset classification badge
    classificationBadge.classList.add('hidden');
    classificationStatus.textContent = 'Unclassified';
    
    // Reset metadata
    metadataList.innerHTML = '<p class="metadata-placeholder">No data extracted yet</p>';
}

function updateMetadataDisplay(metadata) {
    // Clear existing metadata
    metadataList.innerHTML = '';
    
    // Check if there's any metadata
    if (Object.keys(metadata).length === 0) {
        metadataList.innerHTML = '<p class="metadata-placeholder">No data extracted yet</p>';
        return;
    }
    
    // Add each metadata item
    for (const [key, value] of Object.entries(metadata)) {
        if (value) {
            const item = document.createElement('div');
            item.classList.add('metadata-item');
            
            const label = document.createElement('strong');
            label.textContent = formatMetadataLabel(key);
            
            const valueSpan = document.createElement('span');
            valueSpan.textContent = formatMetadataValue(key, value);
            
            item.appendChild(label);
            item.appendChild(valueSpan);
            metadataList.appendChild(item);
        }
    }
}

function formatMetadataLabel(key) {
    // Format camelCase to Title Case with spaces
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase());
}

function formatMetadataValue(key, value) {
    // Format values based on key
    if (key === 'budget') {
        return `₹${value}L`;
    } else if (key === 'timeline') {
        return `${value} months`;
    } else {
        return value;
    }
}

function loadRecentClassifications() {
    // Fetch classifications from API
    fetch('/api/classifications')
        .then(response => response.json())
        .then(data => {
            // Sort by timestamp descending
            const sortedData = data.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
            // Take only the last 5
            const recentClassifications = sortedData.slice(0, 5);
            
            // Clear existing list
            classificationsListElement.innerHTML = '';
            
            // Add each classification
            recentClassifications.forEach(classification => {
                const item = document.createElement('div');
                item.classList.add('classification-item', classification.status.toLowerCase());
                
                const header = document.createElement('h4');
                header.textContent = classification.lead.name;
                
                const badge = document.createElement('span');
                badge.classList.add('classification-badge', classification.status.toLowerCase());
                badge.textContent = classification.status;
                header.appendChild(badge);
                
                const source = document.createElement('p');
                source.textContent = `Source: ${classification.lead.source}`;
                
                item.appendChild(header);
                item.appendChild(source);
                classificationsListElement.appendChild(item);
                
                // Add click event to load conversation
                item.addEventListener('click', () => {
                    alert('Conversation loading feature not implemented in this demo.');
                });
            });
            
            // If no classifications
            if (recentClassifications.length === 0) {
                classificationsListElement.innerHTML = '<p>No classifications yet</p>';
            }
        })
        .catch(error => {
            console.error('Error loading classifications:', error);
            classificationsListElement.innerHTML = '<p>Error loading classifications</p>';
        });
}