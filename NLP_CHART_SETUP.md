# NLP Chart Generation Setup Guide

## Overview
The NLP Chart Generation feature allows users to create charts using natural language descriptions instead of manually selecting APIs and columns. This feature is now integrated into the Explorer.

## Features Implemented

### 1. NLP API Endpoint (`/api/nlp-chart`)
- **Purpose**: Processes natural language queries and generates chart configurations
- **Current Implementation**: Basic pattern matching for testing (no external AI API required)
- **Input**: Natural language query (e.g., "Show me DEX volume over time")
- **Output**: Chart configuration with suggested APIs, columns, and chart type

### 2. NLP Input Component (`NLPChartInput.tsx`)
- **Purpose**: Provides a chat-like interface for users to input natural language queries
- **Features**:
  - Auto-completing suggestions
  - Auto-resizing textarea
  - Loading states
  - Error handling

### 3. Explorer Integration (`ExplorerDataView.tsx`)
- **Purpose**: Integrates NLP functionality directly into the existing chart creation flow
- **Features**:
  - NLP input in empty state
  - NLP input in "Add Visualization" tab
  - Uses existing VisualizationModal with pre-populated configuration
  - Shows AI-generated banner with reasoning and recommended APIs

### 4. Enhanced Visualization Modal (`VisualizationModal.tsx`)
- **Purpose**: Extended existing modal to support NLP-generated configurations
- **Features**:
  - Accepts NLP-generated configuration
  - Shows "AI Generated Chart" banner
  - Displays reasoning and recommended APIs
  - Seamless integration with existing chart creation flow

## Current Implementation (Testing Mode)

The current implementation uses basic pattern matching instead of actual AI:

```typescript
// Basic pattern matching for testing
function generateBasicResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Basic chart type detection
  let chartType = 'bar';
  if (lowerQuery.includes('line') || lowerQuery.includes('trend')) {
    chartType = 'line';
  }
  
  // Basic data category detection
  let suggestedCategory = 'overview';
  if (lowerQuery.includes('dex')) {
    suggestedCategory = 'dex';
  }
  
  return JSON.stringify({
    chartType,
    suggestedCategory,
    // ... other fields
  });
}
```

## Upgrading to Real AI API

To use a real AI API (OpenAI, Grok, etc.), replace the `callFreeAI` function in `/api/nlp-chart/route.ts`:

### Option 1: OpenAI API
```typescript
async function callFreeAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Option 2: Ollama (Local AI)
```typescript
async function callFreeAI(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: prompt,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

### Option 3: Grok API
```typescript
async function callFreeAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

## Environment Variables

Add these to your `.env.local` file:

```bash
# For OpenAI
OPENAI_API_KEY=your_openai_api_key

# For Grok
GROK_API_KEY=your_grok_api_key

# For other APIs
AI_API_ENDPOINT=your_ai_api_endpoint
AI_API_KEY=your_ai_api_key
```

## Usage

1. **Access the Feature**:
   - Go to the Explorer page
   - If no data is selected, you'll see the NLP input prominently displayed
   - Or click the "+ Add Visualization" tab to access AI chart generation

2. **Create a Chart**:
   - Enter a natural language description (e.g., "Show me DEX volume over time")
   - The existing visualization modal will open with AI-generated configuration
   - Review and customize the configuration if needed
   - Click "Save" to create the chart

3. **Example Queries**:
   - "Show me DEX volume over time"
   - "Create a bar chart of NFT marketplace fees"
   - "Display stablecoin market cap trends"
   - "Show DeFi protocol revenue by category"

## Future Enhancements

1. **Conversational Editing**: Allow users to refine charts through follow-up questions
2. **Better Context**: Improve API context understanding for more accurate suggestions
3. **Multi-step Queries**: Handle complex queries that require multiple charts
4. **Chart Preview**: Show actual chart preview in the modal
5. **Query History**: Save and reuse previous queries

## Testing

The current implementation provides a good foundation for testing:

1. The pattern matching works for basic queries
2. API matching is functional
3. Integration with existing explorer is seamless
4. Uses existing chart creation flow

### Test the NLP API

You can test the NLP API by:

1. Starting your Next.js development server (`npm run dev`)
2. Going to the Explorer page
3. Entering natural language queries to see the generated charts

The API endpoint is available at `/api/nlp-chart` for direct testing if needed.

## File Structure

```
app/
├── api/nlp-chart/route.ts                  # NLP API endpoint
├── explorer/
│   ├── components/
│   │   ├── NLPChartInput.tsx              # Input component
│   │   ├── ExplorerDataView.tsx           # Updated with NLP integration
│   │   ├── VisualizationModal.tsx         # Enhanced to support NLP configs
│   │   └── ...
│   └── ExplorerClient.tsx                 # Cleaned up NLP modal references
└── ...
```

## Notes

- The current implementation is fully functional for testing
- No external dependencies required for basic functionality
- Easy to upgrade to real AI APIs when ready
- Maintains all existing explorer functionality
- Responsive design that works on all screen sizes 