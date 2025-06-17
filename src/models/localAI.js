const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence } = require("@langchain/core/runnables");
const { PromptTemplate } = require("@langchain/core/prompts");
const { NlpManager } = require('node-nlp');

// Initialize NLP manager for intent classification and entity extraction
const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Add intents and entities for real estate
function setupNLP() {
  // Real estate intents
  manager.addDocument('en', 'I want to buy a property', 'intent.buy');
  manager.addDocument('en', 'I am looking for a house', 'intent.buy');
  manager.addDocument('en', 'I need to purchase a flat', 'intent.buy');
  manager.addDocument('en', 'I want to rent an apartment', 'intent.rent');
  manager.addDocument('en', 'I need a place to rent', 'intent.rent');
  manager.addDocument('en', 'I am just looking around', 'intent.browse');
  manager.addDocument('en', 'Just browsing options', 'intent.browse');
  manager.addDocument('en', 'Show me what you have', 'intent.browse');
  
  // Entities
  manager.addNamedEntityText('location', 'Mumbai', ['en'], ['mumbai', 'bombay']);
  manager.addNamedEntityText('location', 'Delhi', ['en'], ['delhi', 'new delhi']);
  manager.addNamedEntityText('location', 'Bangalore', ['en'], ['bangalore', 'bengaluru']);
  manager.addNamedEntityText('location', 'Pune', ['en'], ['pune']);
  manager.addNamedEntityText('location', 'Hyderabad', ['en'], ['hyderabad']);
  
  manager.addNamedEntityText('property_type', 'Flat', ['en'], ['flat', 'apartment']);
  manager.addNamedEntityText('property_type', '1BHK', ['en'], ['1bhk', '1 bhk', 'one bedroom']);
  manager.addNamedEntityText('property_type', '2BHK', ['en'], ['2bhk', '2 bhk', 'two bedroom']);
  manager.addNamedEntityText('property_type', '3BHK', ['en'], ['3bhk', '3 bhk', 'three bedroom']);
  manager.addNamedEntityText('property_type', 'Villa', ['en'], ['villa', 'bungalow']);
  manager.addNamedEntityText('property_type', 'Plot', ['en'], ['plot', 'land']);
  
  manager.addNamedEntityText('purpose', 'Personal', ['en'], ['personal', 'live in', 'stay', 'residence']);
  manager.addNamedEntityText('purpose', 'Investment', ['en'], ['investment', 'invest', 'rental income']);
  
  // Train the model
  return manager.train();
}

// Setup NLP on module load
let nlpReady = setupNLP();

/**
 * Process a message with NLP to extract intent and entities
 */
async function processWithNLP(message) {
  await nlpReady; // Ensure NLP is trained
  
  const result = await manager.process('en', message);
  return {
    intent: result.intent,
    entities: result.entities.reduce((acc, entity) => {
      acc[entity.entity] = entity.option || entity.utterance;
      return acc;
    }, {})
  };
}

/**
 * Generate responses based on conversation state using rule-based AI
 */
async function generateResponse(industry, lead, conversation, userMessage) {
  // Process message with NLP
  const nlpResult = await processWithNLP(userMessage);
  
  // Extract the conversation history for context
  const history = conversation.map(msg => 
    `${msg.sender === 'bot' ? 'Assistant' : 'User'}: ${msg.text}`
  ).join('\n');
  
  // Create a prompt template based on industry
  const promptTemplate = new PromptTemplate({
    template: `You are a professional sales assistant for {industry_name}.
Your job is to qualify leads by asking relevant questions and providing helpful information.

User: {lead_name}
Industry: {industry_name}
User intent: {intent}
Extracted entities: {entities}

Previous conversation:
{history}

User's latest message: {user_message}

Based on the conversation so far and extracted information, respond in a friendly, professional manner.
Focus on gathering information about {qualifying_areas}.
Ask one question at a time to avoid overwhelming the user.

Your response:`,
    inputVariables: [
      'industry_name',
      'lead_name',
      'intent',
      'entities',
      'history',
      'user_message',
      'qualifying_areas'
    ],
  });
  
  // Create a rule-based AI sequence
  const chain = RunnableSequence.from([
    promptTemplate,
    generateRuleBasedResponse(industry, lead, conversation, userMessage, nlpResult),
    new StringOutputParser(),
  ]);
  
  try {
    // Generate the response
    const response = await chain.invoke({
      industry_name: industry.name,
      lead_name: lead.name,
      intent: nlpResult.intent || 'unknown',
      entities: JSON.stringify(nlpResult.entities),
      history: history,
      user_message: userMessage,
      qualifying_areas: industry.qualifyingAreas?.join(', ') || 'user needs'
    });
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Could you please try again?";
  }
}

/**
 * Generate a rule-based response based on conversation context
 */
function generateRuleBasedResponse(industry, lead, conversation, userMessage, nlpResult) {
  return async (prompt) => {
    // Get user messages only
    const userMessages = conversation.filter(msg => msg.sender === 'user');
    
    // Determine conversation stage
    let stage = 'introduction';
    if (userMessages.length === 0) {
      stage = 'greeting';
    } else if (userMessages.length === 1) {
      stage = 'initial_question';
    } else if (userMessages.length < 4) {
      stage = 'information_gathering';
    } else {
      stage = 'qualification';
    }
    
    // Extract intent and entities
    const { intent, entities } = nlpResult;
    
    // Process message based on industry
    if (industry.id === 'real_estate') {
      return generateRealEstateResponse(stage, userMessage, intent, entities, conversation, lead);
    } else if (industry.id === 'software') {
      return generateSoftwareResponse(stage, userMessage, intent, entities, conversation, lead);
    }
    
    // Default generic response
    return generateGenericResponse(stage, userMessage, lead);
  };
}

/**
 * Generate real estate specific responses
 */
function generateRealEstateResponse(stage, userMessage, intent, entities, conversation, lead) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check for specific entities
  const hasLocation = entities.location;
  const hasPropertyType = entities.property_type;
  const hasPurpose = entities.purpose;
  
  // Extract specific real estate information
  let budget = extractBudget(lowerMessage);
  let timeline = extractTimeline(lowerMessage);
  
  // Check for specific keywords
  const isLookingFor = lowerMessage.includes('looking for') || lowerMessage.includes('want to buy') || 
                      lowerMessage.includes('need a') || lowerMessage.includes('searching for');
  
  // Generate appropriate response based on conversation stage and extracted info
  if (stage === 'greeting') {
    return `Hi ${lead.name}! Thanks for reaching out to GrowEasy Realtors. I'm your personal real estate assistant. Could you share which city or area you're interested in?`;
  }
  
  if (stage === 'initial_question') {
    if (hasLocation) {
      return `Great! ${entities.location} is a wonderful area. Are you looking for a flat, villa, or plot? Also, is this for investment or personal use?`;
    } else {
      return "Which city or location are you interested in for your property search?";
    }
  }
  
  if (hasLocation && !hasPropertyType) {
    return `What type of property are you looking for in ${entities.location}? (e.g., apartment, villa, plot)`;
  }
  
  if (hasPropertyType && !budget) {
    return `What's your budget range for the ${entities.property_type}?`;
  }
  
  if (budget && !timeline) {
    return "Great! What's your timeline for moving in or making the purchase?";
  }
  
  if (timeline && !hasPurpose) {
    return "Is this property for your personal use or as an investment?";
  }
  
  if (hasLocation && hasPropertyType && budget && timeline) {
    return `Would you like to schedule a site visit to see some ${entities.property_type} properties in ${entities.location} that match your budget of ${budget}L and timeline of ${timeline} months?`;
  }
  
  // Default response if we can't determine the exact stage
  if (intent === 'intent.buy') {
    return "That's great that you're looking to buy! Could you share more details about your requirements?";
  }
  
  if (intent === 'intent.rent') {
    return "I understand you're looking to rent. What's your monthly budget and preferred location?";
  }
  
  if (intent === 'intent.browse') {
    return "No problem! I'm happy to show you some options. Could you give me an idea of what areas you're interested in?";
  }
  
  // Generic fallback
  return "Could you tell me more about your property requirements? I'm here to help find the perfect match for you.";
}

/**
 * Generate software specific responses
 */
function generateSoftwareResponse(stage, userMessage, intent, entities, conversation, lead) {
  // Similar structure to real estate but customized for software industry
  if (stage === 'greeting') {
    return `Hi ${lead.name}! I'm your GrowEasy software solutions consultant. What industry is your business in?`;
  }
  
  if (stage === 'initial_question') {
    return "Thanks for sharing that. What specific challenges are you looking to solve with our software?";
  }
  
  if (stage === 'information_gathering') {
    const previousBotMessages = conversation
      .filter(msg => msg.sender === 'bot')
      .map(msg => msg.text.toLowerCase());
    
    if (previousBotMessages.some(msg => msg.includes('challenges') || msg.includes('solve'))) {
      return "Are you currently using any software solution for this?";
    }
    
    if (previousBotMessages.some(msg => msg.includes('currently using') || msg.includes('software solution'))) {
      return "What's your timeline for implementing a new solution?";
    }
    
    if (previousBotMessages.some(msg => msg.includes('timeline'))) {
      return "And what's your budget range for this project?";
    }
    
    return "Are you the decision maker for this purchase, or will others be involved in the decision?";
  }
  
  if (stage === 'qualification') {
    return "Would you be interested in scheduling a demo of our software to see how it can address your needs?";
  }
  
  // Generic fallback
  return "Thank you for sharing that information. Is there anything specific about our software solutions that you'd like to know?";
}

/**
 * Generate generic responses
 */
function generateGenericResponse(stage, userMessage, lead) {
  if (stage === 'greeting') {
    return `Hello ${lead.name}! How can I assist you today?`;
  }
  
  if (stage === 'initial_question') {
    return "Could you tell me more about what you're looking for?";
  }
  
  if (stage === 'information_gathering') {
    return "Thanks for sharing that information. What other details can you provide to help me understand your needs better?";
  }
  
  if (stage === 'qualification') {
    return "Based on what you've told me, I think we can help you. Would you like to schedule a call with one of our specialists?";
  }
  
  return "I appreciate your interest. How else can I help you today?";
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
  
  return null;
}

/**
 * Generate an initial greeting based on industry and lead info
 */
function generateInitialGreeting(industry, leadName) {
  if (industry.id === 'real_estate') {
    return `Hi ${leadName}! Thanks for reaching out. I'm your GrowEasy real estate assistant. Could you share which city/location you're looking for?`;
  } else if (industry.id === 'software') {
    return `Hi ${leadName}! I'm your GrowEasy software solutions consultant. What industry is your business in?`;
  } else {
    return `Hi ${leadName}! Thanks for contacting us. How can I assist you today?`;
  }
}

module.exports = {
  generateResponse,
  generateInitialGreeting,
  processWithNLP
};