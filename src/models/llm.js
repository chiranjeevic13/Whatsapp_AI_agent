const { NlpManager } = require('node-nlp');

// Initialize the NLP manager
const manager = new NlpManager({ languages: ['en'] });

// Train the model with some basic responses
async function initializeModel() {
  // Add some basic intents and responses
  manager.addDocument('en', 'hello', 'greeting.hello');
  manager.addDocument('en', 'hi', 'greeting.hello');
  manager.addDocument('en', 'hey', 'greeting.hello');
  
  manager.addAnswer('en', 'greeting.hello', 'Hello! How can I help you today?');
  
  // Train the model
  await manager.train();
  console.log('NLP model trained successfully');
}

// Initialize the model
initializeModel().catch(console.error);

/**
 * Generate a response based on the conversation context
 * @param {Object} industry - Industry configuration
 * @param {Object} lead - Lead information
 * @param {Array} conversation - Previous conversation history
 * @param {String} userMessage - Latest user message
 * @returns {Promise<String>} AI response
 */
async function generateResponse(industry, lead, conversation, userMessage) {
  try {
    // Get the last few messages for context
    const recentMessages = conversation.slice(-3);
    const context = recentMessages.map(msg => msg.text).join(' ');

    // Process the message with NLP
    const response = await manager.process('en', userMessage);
    
    // If we have a specific answer, use it
    if (response.answer) {
      return response.answer;
    }

    // Otherwise, generate a contextual response
    const industryInfo = `I'm your ${industry.name} assistant. `;
    const leadInfo = `I see you're ${lead.name} from ${lead.source}. `;
    
    // Generate a response based on the industry's qualifying areas
    const qualifyingAreas = industry.qualifyingAreas;
    const randomArea = qualifyingAreas[Math.floor(Math.random() * qualifyingAreas.length)];
    
    return `${industryInfo}${leadInfo}Could you tell me more about your ${randomArea}?`;
  } catch (error) {
    console.error('Error generating response:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Could you please try again?";
  }
}

module.exports = {
  generateResponse
};