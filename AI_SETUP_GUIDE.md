# AI Service Configuration Examples

# To use Puter.js (Free GPT-4.1 Nano):
USE_PUTER_AI=true

# To use Local Ollama API:
USE_LOCAL_AI=true
LOCAL_AI_URL=http://84.32.32.11:11434/api/generate
LOCAL_AI_MODEL=gpt-oss:20b

# To use OpenAI (requires API key):
OPENAI_API_KEY=your_openai_api_key_here

# Note: Only set one at a time. Priority: Puter.js > Local > OpenAI
