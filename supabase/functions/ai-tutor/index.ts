import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, messages, context, mode } = await req.json();
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = `You are an expert AI tutor for an adaptive learning platform called AdaptLearn. You help students with their doubts and learning needs.

Your capabilities:
1. **Doubt Clarification**: Answer questions clearly with step-by-step explanations
2. **Concept Breakdown**: Break complex topics into simple, digestible parts
3. **Examples & Analogies**: Use real-world examples to make concepts relatable
4. **Study Strategies**: Provide tips for better understanding and retention
5. **Analysis**: Identify knowledge gaps and suggest areas for improvement

Guidelines:
- Be patient, friendly, and encouraging
- Use markdown formatting for better readability (bullet points, code blocks, headers)
- When explaining code or formulas, use proper code blocks
- If a concept is complex, break it into numbered steps
- Ask clarifying questions if the doubt is unclear
- Provide related topics the student might want to explore

Current context: ${context || 'General learning assistance'}`;

    if (mode === 'analyze') {
      systemPrompt = `You are an AI learning analyst. Analyze the student's conversation and provide insights.

Your analysis should include:
1. **Topics Covered**: List the main topics discussed
2. **Understanding Level**: Assess the student's grasp (Beginner/Intermediate/Advanced)
3. **Knowledge Gaps**: Identify areas that need more attention
4. **Strengths**: Note concepts the student understands well
5. **Recommendations**: Suggest next topics to study or resources
6. **Study Tips**: Personalized advice based on their learning style

Format your response with clear markdown headings and bullet points.
Be constructive and encouraging in your feedback.`;
    }

    // Build messages array with conversation history
    const chatMessages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (messages && Array.isArray(messages)) {
      messages.forEach((msg: { role: string; content: string }) => {
        chatMessages.push({ role: msg.role, content: msg.content });
      });
    } else if (message) {
      chatMessages.push({ role: 'user', content: message });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: chatMessages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-tutor function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
