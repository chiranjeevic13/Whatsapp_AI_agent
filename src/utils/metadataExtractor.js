/**
 * Extract metadata from conversation
 * @param {Array} conversation - Conversation history
 * @param {Object} industryConfig - Industry configuration
 * @returns {Object} Extracted metadata
 */
function extractMetadata(conversation, industryConfig) {
    const metadata = {};
    const userMessages = conversation
      .filter(msg => msg.sender === 'user')
      .map(msg => msg.text.toLowerCase());
    
    // Extract based on industry-specific patterns
    if (industryConfig.id === 'real_estate') {
      // Extract location
      metadata.location = extractLocation(userMessages);
      
      // Extract budget
      metadata.budget = extractBudget(userMessages);
      
      // Extract property type
      metadata.propertyType = extractPropertyType(userMessages);
      
      // Extract timeline
      metadata.timeline = extractTimeline(userMessages);
      
      // Extract purpose
      metadata.purpose = extractPurpose(userMessages);
      
      // Extract intent
      metadata.intent = extractIntent(userMessages);
    } 
    // Add other industries as needed
    else if (industryConfig.id === 'software') {
      metadata.budget = extractBudget(userMessages);
      metadata.timeline = extractTimeline(userMessages);
      metadata.companySize = extractCompanySize(userMessages);
      metadata.decisionMaker = extractDecisionMaker(userMessages);
      metadata.intent = extractIntent(userMessages);
    }
    
    return metadata;
  }
  
  /**
   * Extract location from messages
   */
  function extractLocation(messages) {
    for (const msg of messages) {
      // Check for direct location mentions
      if (msg.includes('looking in') || msg.includes('interested in') || msg.includes('location')) {
        const parts = msg.split(/looking in|interested in|location|area/);
        if (parts.length > 1) {
          const locationPart = parts[1].trim().replace(/^[^\w]+|[^\w]+$/g, '');
          if (locationPart && locationPart.length > 2) {
            return locationPart;
          }
        }
      }
      
      // Check for city names (simplified approach)
          // Check for city names (simplified approach)
    const cityRegex = /\b(mumbai|delhi|bangalore|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|surat|new york|london|toronto|los angeles|chicago|san francisco)\b/i;
    const cityMatch = msg.match(cityRegex);
    
    if (cityMatch) {
      return cityMatch[0].charAt(0).toUpperCase() + cityMatch[0].slice(1);
    }
    
    // Check for mentions of neighborhoods
    if (msg.includes('near') || msg.includes('around')) {
      const parts = msg.split(/near|around/);
      if (parts.length > 1) {
        const locationPart = parts[1].trim().replace(/^[^\w]+|[^\w]+$/g, '');
        if (locationPart && locationPart.length > 2 && !locationPart.includes('not sure')) {
          return locationPart;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract budget from messages
 */
function extractBudget(messages) {
  for (const msg of messages) {
    // Check for budget mentions
    if (msg.includes('budget') || msg.includes('afford') || msg.includes('price') || msg.includes('cost')) {
      // Find numbers with L/Lakhs/Cr/Crores (Indian format)
      const indianFormatMatch = msg.match(/(\d+(?:\.\d+)?)\s*(l|lakh|lakhs|cr|crore|crores)/i);
      if (indianFormatMatch) {
        const number = parseFloat(indianFormatMatch[1]);
        const unit = indianFormatMatch[2].toLowerCase();
        
        if (unit.startsWith('l')) {
          return number; // Already in lakhs
        } else if (unit.startsWith('cr')) {
          return number * 100; // Convert crores to lakhs
        }
      }
      
      // Find numbers with K/M/$ (Western format)
      const westernFormatMatch = msg.match(/(\d+(?:\.\d+)?)\s*(k|thousand|m|million|\$)/i);
      if (westernFormatMatch) {
        const number = parseFloat(westernFormatMatch[1]);
        const unit = westernFormatMatch[2].toLowerCase();
        
        if (unit === 'k' || unit === 'thousand') {
          return number / 10; // Convert thousands to lakhs (rough approximation)
        } else if (unit === 'm' || unit === 'million') {
          return number * 10; // Convert millions to lakhs (rough approximation)
        } else if (unit === '$') {
          return number / 100000; // Convert dollars to lakhs (rough approximation)
        }
      }
      
      // Just find any number
      const numberMatch = msg.match(/(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        const number = parseFloat(numberMatch[1]);
        // If the number is very large, assume it's in raw currency (e.g., 7500000)
        if (number > 100000) {
          return number / 100000; // Convert to lakhs
        }
        return number;
      }
    }
    
    // Check for max mentions
    if (msg.includes('max') && msg.includes('up to')) {
      const numberMatch = msg.match(/(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        return parseFloat(numberMatch[1]);
      }
    }
  }
  
  return null;
}

/**
 * Extract property type from messages
 */
function extractPropertyType(messages) {
  const propertyTypes = {
    'flat': 'Apartment/Flat',
    'apartment': 'Apartment/Flat',
    '1bhk': '1BHK',
    '2bhk': '2BHK',
    '3bhk': '3BHK',
    '4bhk': '4BHK',
    'studio': 'Studio Apartment',
    'villa': 'Villa',
    'house': 'House',
    'bungalow': 'Bungalow',
    'plot': 'Plot/Land',
    'land': 'Plot/Land',
    'commercial': 'Commercial',
    'office': 'Office Space',
    'shop': 'Shop/Retail'
  };
  
  for (const msg of messages) {
    for (const [keyword, type] of Object.entries(propertyTypes)) {
      if (msg.includes(keyword)) {
        return type;
      }
    }
  }
  
  return null;
}

/**
 * Extract timeline from messages
 */
function extractTimeline(messages) {
  for (const msg of messages) {
    // Check for timeline mentions with numbers
    const timelineRegex = /(\d+)\s*(month|months|week|weeks|year|years|day|days)/i;
    const match = msg.match(timelineRegex);
    
    if (match) {
      const number = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      if (unit.startsWith('month')) {
        return number;
      } else if (unit.startsWith('week')) {
        return Math.ceil(number / 4); // Convert weeks to months
      } else if (unit.startsWith('year')) {
        return number * 12; // Convert years to months
      } else if (unit.startsWith('day')) {
        return Math.ceil(number / 30); // Convert days to months
      }
    }
    
    // Check for specific timeline phrases
    if (msg.includes('asap') || msg.includes('as soon as possible') || msg.includes('right away')) {
      return 1; // ASAP means 1 month
    }
    
    if (msg.includes('next month') || msg.includes('within a month')) {
      return 1;
    }
    
    if (msg.includes('couple of months') || msg.includes('few months')) {
      return 3;
    }
    
    if (msg.includes('end of the year') || msg.includes('by year end')) {
      // Estimate months remaining in the year
      const currentMonth = new Date().getMonth() + 1; // 1-12
      return 12 - currentMonth + 1;
    }
  }
  
  return null;
}

/**
 * Extract purpose from messages
 */
function extractPurpose(messages) {
  for (const msg of messages) {
    if (msg.includes('personal') || msg.includes('live in') || msg.includes('staying') || 
        msg.includes('residence') || msg.includes('home')) {
      return 'personal use';
    }
    
    if (msg.includes('invest') || msg.includes('rental') || msg.includes('return') ||
        msg.includes('income') || msg.includes('flip')) {
      return 'investment';
    }
  }
  
  return null;
}

/**
 * Extract intent from messages
 */
function extractIntent(messages) {
  // Start with full messages
  for (const msg of messages) {
    const fullMsg = msg.toLowerCase();
    
    // Check for buying intent
    if (fullMsg.includes('want to buy') || fullMsg.includes('looking to buy') || 
        fullMsg.includes('interested in buying') || fullMsg.includes('purchase')) {
      return 'buy';
    }
    
    // Check for renting intent
    if (fullMsg.includes('want to rent') || fullMsg.includes('looking to rent') || 
        fullMsg.includes('interested in renting') || fullMsg.includes('lease')) {
      return 'rent';
    }
    
    // Check for browsing intent
    if (fullMsg.includes('just browsing') || fullMsg.includes('just looking') || 
        fullMsg.includes('gathering information') || fullMsg.includes('exploring options')) {
      return 'browsing';
    }
    
    // Check for selling intent
    if (fullMsg.includes('want to sell') || fullMsg.includes('looking to sell') || 
        fullMsg.includes('interested in selling')) {
      return 'sell';
    }
  }
  
  // If no clear intent found, check for single words
  const allText = messages.join(' ').toLowerCase();
  if (allText.includes('buy')) return 'buy';
  if (allText.includes('rent')) return 'rent';
  if (allText.includes('browsing') || allText.includes('looking around')) return 'browsing';
  
  return null;
}

/**
 * Extract company size (for software industry)
 */
function extractCompanySize(messages) {
  for (const msg of messages) {
    // Look for company size mentions
    const sizeRegex = /(\d+)\s*(employee|employees|people|staff)/i;
    const match = msg.match(sizeRegex);
    
    if (match) {
      return parseInt(match[1]);
    }
    
    // Look for size ranges
    if (msg.includes('small company') || msg.includes('startup')) {
      return 20;
    }
    
    if (msg.includes('medium') || msg.includes('mid-size')) {
      return 100;
    }
    
    if (msg.includes('large') || msg.includes('enterprise')) {
      return 500;
    }
  }
  
  return null;
}

/**
 * Extract decision maker status (for software industry)
 */
function extractDecisionMaker(messages) {
  for (const msg of messages) {
    if (msg.includes('i decide') || msg.includes('i am the decision') || 
        msg.includes('i make the decision') || msg.includes('my decision')) {
      return true;
    }
    
    if (msg.includes('need approval') || msg.includes('need to consult') || 
        msg.includes('team decision') || msg.includes('not my decision')) {
      return false;
    }
  }
  
  return null;
}

module.exports = {
  extractMetadata
};