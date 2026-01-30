import { serializeNode } from './cleanNode';

// Handle Codegen Event
figma.codegen.on('generate', (event) => {
  const { node, language } = event;
  
  if (language === 'json') {
    // 使用自定义的清洗逻辑
    const cleanData = serializeNode(node);

    return [
      {
        title: 'Clean JSON (for LLM)',
        language: 'JSON',
        code: JSON.stringify(cleanData, null, 2)
      }
    ];
  }

  return [];
});
