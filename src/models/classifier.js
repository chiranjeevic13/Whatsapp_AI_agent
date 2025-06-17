/**
 * Classifies a lead based on conversation history and extracted metadata
 * @param {Array} conversation - Conversation history
 * @param {Object} metadata - Extracted metadata
 * @param {Object} industryConfig - Configuration for the industry
 * @returns {Object} Classification result
 */
function classifyLead(conversation, metadata, industryConfig) {
    // Default to cold
    let classification = 'Cold';
    let confidence = 0.5;
    let reasons = [];
  
    // Check for invalid lead patterns first
    if (isInvalidLead(conversation, metadata)) {
      return {
        status: 'Invalid',
        confidence: 0.9,
        reasons: getInvalidReasons(conversation, metadata)
      };
    }
  
    // Calculate hot lead score
    const hotScore = calculateHotScore(metadata, industryConfig);
    
    // Calculate cold lead score
    const coldScore = calculateColdScore(metadata, conversation, industryConfig);
    
    // Determine final classification
    if (hotScore.score > coldScore.score && hotScore.score > 0.6) {
      classification = 'Hot';
      confidence = hotScore.score;
      reasons = hotScore.reasons;
    } else {
      classification = 'Cold';
      confidence = coldScore.score;
      reasons = coldScore.reasons;
    }
  
    return {
      status: classification,
      confidence: parseFloat(confidence.toFixed(2)),
      reasons
    };
  }
  
  /**
   * Check if the lead is invalid
   */
  function isInvalidLead(conversation, metadata) {
    // Count user messages
    const userMessages = conversation.filter(msg => msg.sender === 'user');
    
    // Check for gibberish/test messages
    const hasGibberish = userMessages.some(msg => {
      const text = msg.text.toLowerCase();
      return (
        /^[a-z]{1,3}$/.test(text) || // Single letters
        /^[0-9]+$/.test(text) || // Only numbers
        /^(test|asdf|qwerty|123)/.test(text) || // Test keywords
        text.length < 2 // Too short to be meaningful
      );
    });
    
    // Check for consistent gibberish
    const allGibberish = userMessages.length > 1 && 
      userMessages.every(msg => msg.text.length < 5 || /^[0-9]+$/.test(msg.text));
    
    // Check for unresponsiveness (only 1 message after multiple bot messages)
    const unresponsive = userMessages.length === 1 && conversation.length > 4;
    
    return hasGibberish || allGibberish || unresponsive;
  }
  
  /**
   * Get reasons for invalid classification
   */
  function getInvalidReasons(conversation, metadata) {
    const reasons = [];
    const userMessages = conversation.filter(msg => msg.sender === 'user');
    
    if (userMessages.some(msg => /^[a-z]{1,3}$/.test(msg.text.toLowerCase()) || 
        /^[0-9]+$/.test(msg.text) || 
        /^(test|asdf|qwerty|123)/.test(msg.text.toLowerCase()))) {
      reasons.push("Contains gibberish or test messages");
    }
    
    if (userMessages.length === 1 && conversation.length > 4) {
      reasons.push("Unresponsive to questions");
    }
    
    if (userMessages.length > 1 && userMessages.every(msg => msg.text.length < 5 || /^[0-9]+$/.test(msg.text))) {
      reasons.push("Consistently providing non-meaningful responses");
    }
    
    return reasons;
  }
  
  /**
   * Calculate hot lead score
   */
  function calculateHotScore(metadata, industryConfig) {
    let score = 0;
    let totalFactors = 0;
    const reasons = [];
    
    // For real estate industry
    if (industryConfig.id === 'real_estate') {
      // Check budget clarity
      if (metadata.budget && metadata.budget > 0) {
        score += 1;
        totalFactors++;
        reasons.push(`Clear budget: ${metadata.budget}`);
      }
      
      // Check location specificity
      if (metadata.location && metadata.location.length > 3 && metadata.location !== 'not sure') {
        score += 1;
        totalFactors++;
        reasons.push(`Specific location: ${metadata.location}`);
      }
      
      // Check timeline urgency (under 6 months is considered urgent)
      if (metadata.timeline && metadata.timeline <= 6) {
        score += 1;
        totalFactors++;
        reasons.push(`Urgent timeline: ${metadata.timeline} months`);
      }
      
      // Check purpose clarity
      if (metadata.purpose && (metadata.purpose === 'personal use' || metadata.purpose === 'investment')) {
        score += 1;
        totalFactors++;
        reasons.push(`Clear purpose: ${metadata.purpose}`);
      }
      
      // Check property type clarity
      if (metadata.propertyType && metadata.propertyType.length > 0) {
        score += 1;
        totalFactors++;
        reasons.push(`Specific property type: ${metadata.propertyType}`);
      }
    }
    
    // For software industry
    else if (industryConfig.id === 'software') {
      // Check budget clarity
      if (metadata.budget && metadata.budget > 0) {
        score += 1;
        totalFactors++;
        reasons.push(`Has budget: ${metadata.budget}`);
      }
      
      // Check timeline urgency
      if (metadata.timeline && metadata.timeline <= 3) {
        score += 1;
        totalFactors++;
        reasons.push(`Urgent timeline: ${metadata.timeline} months`);
      }
      
      // Check decision authority
      if (metadata.decisionMaker === true || metadata.decisionMaker === 'yes') {
        score += 1;
        totalFactors++;
        reasons.push('Is a decision maker');
      }
      
      // Check company size
      if (metadata.companySize && metadata.companySize > 50) {
        score += 1;
        totalFactors++;
        reasons.push(`Good company size: ${metadata.companySize} employees`);
      }
    }
    
    // Generic factors for any industry
    if (metadata.intent === 'buy' || metadata.intent === 'purchase') {
      score += 1;
      totalFactors++;
      reasons.push('Clear buying intent');
    }
    
    // Calculate final score
    const finalScore = totalFactors > 0 ? score / totalFactors : 0;
    
    return {
      score: finalScore,
      reasons
    };
  }
  
  /**
   * Calculate cold lead score
   */
  function calculateColdScore(metadata, conversation, industryConfig) {
    let score = 0;
    let totalFactors = 0;
    const reasons = [];
    
    // Check vague responses
    if (!metadata.budget || metadata.budget <= 0) {
      score += 1;
      totalFactors++;
      reasons.push('No clear budget provided');
    }
    
    if (!metadata.location || metadata.location === 'not sure' || metadata.location === 'anywhere') {
      score += 1;
      totalFactors++;
      reasons.push('No specific location preference');
    }
    
    // Check browsing intent
    if (metadata.intent === 'browsing' || metadata.intent === 'just looking') {
      score += 1;
      totalFactors++;
      reasons.push('Just browsing, no clear intent');
    }
    
    // Check timeline (over 12 months is considered distant)
    if (metadata.timeline && metadata.timeline > 12) {
      score += 1;
      totalFactors++;
      reasons.push(`Distant timeline: ${metadata.timeline} months`);
    }
    
    // Check engagement level
    const userMessages = conversation.filter(msg => msg.sender === 'user');
    const shortResponses = userMessages.filter(msg => msg.text.split(' ').length < 4);
    
    if (shortResponses.length / userMessages.length > 0.7 && userMessages.length > 2) {
      score += 1;
      totalFactors++;
      reasons.push('Mostly short, low-engagement responses');
    }
    
    // Calculate final score
    const finalScore = totalFactors > 0 ? score / totalFactors : 0;
    
    return {
      score: finalScore,
      reasons
    };
  }
  
  module.exports = {
    classifyLead
  };