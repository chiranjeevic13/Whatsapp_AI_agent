const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generateResponse, generateInitialGreeting, processWithNLP } = require('../models/localAI');
const { classifyLead } = require('../models/classifier');
const { getIndustryConfig } = require('../utils/configLoader');

// Store active conversations
const conversations = new Map();

/**
 * Initialize a new conversation with a lead
 */
async function initializeConversation(socketId, leadData) {
  // Generate a unique ID for the conversation
  const conversationId = uuidv4();
  
  // Get the industry configuration
  const industryConfig = getIndustryConfig(leadData.industry || 'real_estate');
  
  if (!industryConfig) {
    throw new Error(`Industry configuration not found for ${leadData.industry}`);
  }
  
  // Create a new conversation object
  const conversation = {
    id: conversationId,
    socketId,
    lead: {
      name: leadData.name,
      phone: leadData.phone || 'Not provided',
      source: leadData.source || 'Direct',
      initialMessage: leadData.initialMessage
    },
    industry: industryConfig,
    messages: [],
    metadata: {},
    status: 'active',
    startTime: new Date(),
    lastUpdateTime: new Date()
  };
  
  // Store the conversation
  conversations.set(conversationId, conversation);
  
  // Generate the initial greeting
  const greeting = await generateInitialGreeting(industryConfig, leadData.name);
  
  // Add the greeting to the conversation
  addMessage(conversationId, 'bot', greeting);
  
  // If there's an initial message, process it
  if (leadData.initialMessage && leadData.initialMessage.trim()) {
    await processUserMessage(socketId, {
      conversationId,
      message: leadData.initialMessage
    });
  }
  
  return {
    conversationId,
    greeting
  };
}

/**
 * Process a user message and generate a response
 */
async function processUserMessage(socketId, data) {
  const { conversationId, message } = data;
  
  // Get the conversation
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  // Check if it's from the correct socket
  if (conversation.socketId !== socketId) {
    throw new Error('Unauthorized access to conversation');
  }
  
  // Add the user message to the conversation
  addMessage(conversationId, 'user', message);
  
  // Extract metadata from the conversation
  await updateMetadata(conversationId);
  
  // Check if we should classify the lead
  const shouldClassify = shouldClassifyLead(conversation);
  
  // Generate a response
  const botResponse = await generateResponse(
    conversation.industry,
    conversation.lead,
    conversation.messages,
    message
  );
  
  // Add the bot response to the conversation
  addMessage(conversationId, 'bot', botResponse);
  
  // If we should classify, do it now
  let classification = null;
  if (shouldClassify) {
    classification = await finalizeConversation(conversationId);
  }
  
  return {
    botResponse,
    classification
  };
}

/**
 * Add a message to a conversation
 */
function addMessage(conversationId, sender, text) {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  // Create the message object
  const message = {
    id: uuidv4(),
    sender,
    text,
    timestamp: new Date()
  };
  
  // Add to conversation
  conversation.messages.push(message);
  conversation.lastUpdateTime = new Date();
  
  return message;
}

/**
 * Update metadata for a conversation
 */
async function updateMetadata(conversationId) {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  // Get the latest user message
  const userMessages = conversation.messages.filter(msg => msg.sender === 'user');
  if (userMessages.length === 0) {
    return conversation.metadata;
  }
  
  const latestUserMessage = userMessages[userMessages.length - 1].text;
  
  // Process with NLP to extract entities
  const nlpResult = await processWithNLP(latestUserMessage);
  
  // Extract additional metadata
  let updatedMetadata = { ...conversation.metadata };
  
  if (nlpResult.entities.location) {
    updatedMetadata.location = nlpResult.entities.location;
  }
  
  if (nlpResult.entities.property_type) {
    updatedMetadata.propertyType = nlpResult.entities.property_type;
  }
  
  if (nlpResult.entities.purpose) {
    updatedMetadata.purpose = nlpResult.entities.purpose;
  }
  
  if (nlpResult.intent) {
    if (nlpResult.intent === 'intent.buy') {
      updatedMetadata.intent = 'buy';
    } else if (nlpResult.intent === 'intent.rent') {
      updatedMetadata.intent = 'rent';
    } else if (nlpResult.intent === 'intent.browse') {
      updatedMetadata.intent = 'browsing';
    }
  }
  
  // Extract budget and timeline
  const lowerMessage = latestUserMessage.toLowerCase();
  const budget = extractBudget(lowerMessage);
  const timeline = extractTimeline(lowerMessage);
  
  if (budget) updatedMetadata.budget = budget;
  if (timeline) updatedMetadata.timeline = timeline;
  
  // Update the conversation metadata
  conversation.metadata = updatedMetadata;
  
  return conversation.metadata;
}

/**
 * Determine if we should classify the lead
 */
function shouldClassifyLead(conversation) {
  // Get user messages
  const userMessages = conversation.messages.filter(msg => msg.sender === 'user');
  
  // If we have enough back-and-forth to make a decision
  if (userMessages.length >= 4) {
    // Check if we have critical metadata based on the industry
    const { metadata, industry } = conversation;
    
    if (industry.id === 'real_estate') {
      // For real estate, we need location, budget, and either timeline or property type
      return (
        (metadata.location || metadata.budget) && 
        (metadata.timeline || metadata.propertyType)
      );
    } 
    else if (industry.id === 'software') {
      // For software, we need budget and timeline
      return metadata.budget && metadata.timeline;
    }
    
    // Generic fallback - if we have 3+ user messages and it's been over 5 minutes
    const conversationDuration = (new Date() - conversation.startTime) / (1000 * 60);
    return userMessages.length >= 3 && conversationDuration > 5;
  }
  
  return false;
}

/**
 * Finalize a conversation with classification
 */
async function finalizeConversation(conversationId) {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }
  
  // Classify the lead
  const classification = classifyLead(
    conversation.messages, 
    conversation.metadata, 
    conversation.industry
  );
  
  // Update the conversation status
  conversation.status = 'classified';
  conversation.classification = classification;
  
  // Save the classification
  saveClassification(conversation);
  
  return classification;
}

/**
 * Save the classification to a file
 */
function saveClassification(conversation) {
  const classificationsDir = path.join(__dirname, '../../data');
  const classificationsFile = path.join(classificationsDir, 'classifications.json');
  
  // Create dir if it doesn't exist
  if (!fs.existsSync(classificationsDir)) {
    fs.mkdirSync(classificationsDir, { recursive: true });
  }
  
  // Read existing classifications
  let classifications = [];
  if (fs.existsSync(classificationsFile)) {
    try {
      classifications = JSON.parse(fs.readFileSync(classificationsFile, 'utf8'));
    } catch (err) {
      console.error('Error reading classifications file:', err);
      classifications = [];
    }
  }
  
  // Create classification record
  const record = {
    id: conversation.id,
    timestamp: new Date(),
    lead: conversation.lead,
    industry: conversation.industry.id,
    status: conversation.classification.status,
    confidence: conversation.classification.confidence,
    reasons: conversation.classification.reasons,
    metadata: conversation.metadata,
    transcript: conversation.messages.map(msg => ({
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp
    }))
  };
  
  // Add to classifications
  classifications.push(record);
  
  // Write back to file
  try {
    fs.writeFileSync(classificationsFile, JSON.stringify(classifications, null, 2));
  } catch (err) {
    console.error('Error writing classifications file:', err);
  }
  
  return record;
}

/**
 * Get a conversation by ID
 */
function getConversation(conversationId) {
  return conversations.get(conversationId);
}

/**
 * Get all active conversations
 */
function getAllConversations() {
  return Array.from(conversations.values());
}

/**
 * Extract budget from message text
 */
function extractBudget(message) {
  // Look for patterns like "50L", "50 lakhs", "1.5 crore", etc.
  const lakhsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:l|lakh|lakhs)/i);
  if (lakhsMatch) {
    return parseFloat(lakhsMatch[1]);
  }
  
  const croreMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i);
  if (croreMatch) {
    return parseFloat(croreMatch[1]) * 100; // Convert crore to lakhs
  }
  
  // Look for general numbers in the context of budget
  if (message.includes('budget') || message.includes('afford') || message.includes('spending')) {
    const numberMatch = message.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const num = parseFloat(numberMatch[1]);
      // If the number is very large, it's probably in raw currency (e.g., 7500000)
      if (num > 100000) {
        return num / 100000; // Convert to lakhs
      }
      return num;
    }
  }
  
  return null;
}

/**
 * Extract timeline from message text
 */
function extractTimeline(message) {
  // Look for patterns like "3 months", "1 year", etc.
  const monthsMatch = message.match(/(\d+)\s*month/i);
  if (monthsMatch) {
    return parseInt(monthsMatch[1]);
  }
  
  const yearsMatch = message.match(/(\d+)\s*year/i);
  if (yearsMatch) {
    return parseInt(yearsMatch[1]) * 12; // Convert years to months
  }
  
  // Check for immediate timeframes
  if (message.includes('immediately') || message.includes('asap') || message.includes('right away')) {
    return 1; // 1 month
  }
  
  // Check for relative timeframes
  if (message.includes('next month') || message.includes('within a month')) {
    return 1;
  }
  
  if (message.includes('few months') || message.includes('couple of months')) {
    return 3;
  }
  
  if (message.includes('end of year') || message.includes('by december')) {
    // Calculate months remaining in the year
    const now = new Date();
    const monthsRemaining = 12 - now.getMonth();
    return monthsRemaining > 0 ? monthsRemaining : 1;
  }
  
  return null;
}

module.exports = {
  initializeConversation,
  processUserMessage,
  getConversation,
  getAllConversations
};