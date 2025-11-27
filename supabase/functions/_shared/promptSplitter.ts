/**
 * Splits a video prompt into 2 continuous scenes with consistency instructions
 * Each scene maintains the same characters, colors, style, and context
 */
export function splitPromptIntoScenes(originalPrompt: string): { scene1: string; scene2: string; baseContext: string } {
  // Extract key elements for consistency
  const baseContext = extractBaseContext(originalPrompt);
  
  // Scene 1: First half (8 seconds) - Establishing shot
  const scene1 = `${baseContext} SCENE 1 (First 8 seconds): ${originalPrompt}. Focus on establishing the scene, characters, and initial action. Maintain consistent lighting, color palette, and visual style.`;
  
  // Scene 2: Continuation (next 8 seconds) - Action progression
  const scene2 = `${baseContext} SCENE 2 (Continuation, seconds 8-16): Continue from the previous scene with the SAME characters, SAME visual style, SAME color palette, and SAME lighting. ${extractActionProgression(originalPrompt)}. Ensure seamless visual continuity with Scene 1.`;
  
  return { scene1, scene2, baseContext };
}

/**
 * Extracts base context for consistency across scenes
 */
function extractBaseContext(prompt: string): string {
  const contextParts: string[] = [];
  
  // Extract characters/subjects
  const subjectMatch = prompt.match(/\b(A|An|The)\s+([^,\.]+(?:and [^,\.]+)?)/i);
  if (subjectMatch) {
    contextParts.push(`Consistent character(s): ${subjectMatch[0]}`);
  }
  
  // Extract setting/environment
  const settingIndicators = ['in', 'under', 'on', 'beside', 'through', 'across'];
  for (const indicator of settingIndicators) {
    const regex = new RegExp(`${indicator}\\s+([^,\.]+)`, 'i');
    const match = prompt.match(regex);
    if (match) {
      contextParts.push(`Setting: ${match[0]}`);
      break;
    }
  }
  
  // Extract visual style/mood
  const styleWords = prompt.match(/\b(cinematic|dramatic|epic|intense|ethereal|mystical|vibrant|dark|bright|moody|surreal|realistic|stylized)\b/gi);
  if (styleWords && styleWords.length > 0) {
    contextParts.push(`Visual style: ${styleWords.join(', ')}`);
  }
  
  return contextParts.length > 0 ? contextParts.join('. ') + '.' : '';
}

/**
 * Extracts and continues the action progression
 */
function extractActionProgression(prompt: string): string {
  // Look for action verbs and continue the narrative
  const actionVerbs = prompt.match(/\b(tossed|navigates|emerges|writhing|swoops|pans|fixates|creaking|ascending|descending|moving|falling|rising|turning|spinning|exploding|collapsing)\b/gi);
  
  if (actionVerbs && actionVerbs.length > 0) {
    return `Continue the action with escalating intensity. The ${actionVerbs[0]} motion intensifies as the scene progresses toward its climax`;
  }
  
  // Fallback: general continuation
  return 'The action continues with increasing intensity, building toward a dramatic climax while maintaining all visual elements from the previous scene';
}
