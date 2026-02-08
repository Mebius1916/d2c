/**
 * Converts style objects into CSS strings.
 */

// Helper to convert camelCase to kebab-case
function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Format a single style object into CSS declaration body
 * e.g. { color: "red", fontSize: "16px" } -> "color: red; font-size: 16px;"
 */
export function formatStyleBody(style: Record<string, any>): string {
  if (!style) return "";
  
  return Object.entries(style)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      // Handle special cases
      if (key === 'mode') {
        // layout.mode -> display: flex, flexDirection: ...
        if (value === 'column') return 'display: flex; flex-direction: column;';
        if (value === 'row') return 'display: flex; flex-direction: row;';
        return '';
      }
      
      if (key === 'sizing') {
        // sizing handled by layout logic or width/height props
        return ''; 
      }

      if (key === 'dimensions') {
        // dimensions usually mean fixed width/height
        let dims = '';
        if (value.width) dims += `width: ${value.width}px; `;
        if (value.height) dims += `height: ${value.height}px; `;
        return dims;
      }

      if (key === 'locationRelativeToParent') return ''; // Absolute positioning handled separately

      return `${toKebabCase(key)}: ${value};`;
    })
    .join(" ");
}

/**
 * Generate global CSS stylesheet from globalVars
 */
export function generateGlobalCSS(globalVars: Record<string, any>): string {
  const styles = globalVars.styles || {};
  let css = "";

  Object.entries(styles).forEach(([id, styleBody]) => {
    // Sanitize ID for CSS class name
    const className = id.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // For arrays (like fills), we might need special handling, but for now assume simplified object
    // In our DSL, fills is often an array of objects.
    // If styleBody is array (e.g. fills), we skip for now or need complex logic.
    // But layout/text styles are objects.
    
    if (Array.isArray(styleBody)) {
        // Handle Fills array: Backgrounds
        // Simplification: take the first visible solid/gradient
        // Real impl needs to stack backgrounds
        const backgrounds = styleBody.map((fill: any) => {
            if (typeof fill === 'string') return `background: ${fill};`; // Simple color string
            if (fill.type === 'IMAGE') return `background-image: url(${fill.imageRef}); background-size: ${fill.scaleMode === 'FIT' ? 'contain' : 'cover'};`;
            if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') return `background: ${fill.gradient};`;
            return '';
        }).join(" ");
        
        css += `.${className} { ${backgrounds} }\n`;
    } else {
        css += `.${className} { ${formatStyleBody(styleBody as Record<string, any>)} }\n`;
    }
  });

  return css;
}
