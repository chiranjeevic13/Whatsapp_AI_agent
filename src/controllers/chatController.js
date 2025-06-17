const chatService = require('../services/chatService');

/**
 * Handle a new lead
 */
async function handleNewLead(io, socketId, leadData) {
  try {
    // Validate lead data
    if (!leadData.name) {
      throw new Error('Lead name is required');
    }
    
    // Initialize conversation
    const result = await chatService.initializeConversation(socketId, leadData);
    
    // Send greeting to the client
    io.to(socketId).emit('bot-message', {
      conversationId: result.conversationId,
      message: result.greeting
    });
    
    return result;
  } catch (error) {
    console.error('Error handling new lead:', error);
    io.to(socketId).emit('error', {
      message: 'Failed to process your request'
    });
  }
}

/**
 * Handle a user message
 */
async function handleUserMessage(io, socketId, data) {
    try {
        console.log("Received user message data:", data); // Add this debugging line
        
        // Validate message data
        if (!data || !data.message) {
            throw new Error('Message content is required');
        }
        
        if (!data.conversationId) {
            throw new Error('Conversation ID is missing - please start a new conversation');
        }
        
        // Process the message
        const result = await chatService.processUserMessage(socketId, data);
        
        // Send response to the client
        io.to(socketId).emit('bot-message', {
            conversationId: data.conversationId,
            message: result.botResponse
        });
        
        // If we have a classification, send it too
        if (result.classification) {
            io.to(socketId).emit('classification', {
                conversationId: data.conversationId,
                classification: result.classification
            });
        }
        
        return result;
    } catch (error) {
        console.error('Error handling user message:', error);
        io.to(socketId).emit('error', {
            message: error.message || 'Failed to process your message'
        });
    }
}
module.exports = {
  handleNewLead,
  handleUserMessage
};