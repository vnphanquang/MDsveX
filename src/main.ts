import MarkdownIt from 'markdown-it';
import { HTML_OPEN_CLOSE_TAG_RE } from './regex';

const svelteBlock = [
  [/^<(svelte:head)(?=(\s|>|$))/i, /<\/(script|pre|style)>/i, true],
  [new RegExp(HTML_OPEN_CLOSE_TAG_RE.source + '\\s*$'), /^$/, false],
];

function svelte_block(state, startLine, endLine, silent) {
  var i,
    nextLine,
    token,
    lineText,
    pos = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine];

  if (state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }

  if (!state.md.options.html) {
    return false;
  }

  if (state.src.charCodeAt(pos) !== 0x3c /* < */) {
    return false;
  }

  lineText = state.src.slice(pos, max);

  for (i = 0; i < svelteBlock.length; i++) {
    //@ts-ignore
    if (svelteBlock[i][0].test(lineText)) {
      break;
    }
  }

  if (i === svelteBlock.length) {
    return false;
  }

  if (silent) {
    return svelteBlock[i][2];
  }

  nextLine = startLine + 1;

  //@ts-ignore
  if (!svelteBlock[i][1].test(lineText)) {
    for (; nextLine < endLine; nextLine++) {
      if (state.sCount[nextLine] < state.blkIndent) {
        break;
      }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      lineText = state.src.slice(pos, max);

      //@ts-ignore
      if (svelteBlock[i][1].test(lineText)) {
        if (lineText.length !== 0) {
          nextLine++;
        }
        break;
      }
    }
  }

  state.line = nextLine;

  token = state.push('html_block', '', 0);
  token.map = [startLine, nextLine];
  token.content = state.getLines(startLine, nextLine, state.blkIndent, true);

  return true;
}

function svelteRenderer(tokens, idx) {
  return tokens[idx].content;
}

export function parse(markdownString: string): string {
  const md = new MarkdownIt({ html: true });

  md.block.ruler.before('table', 'svelte_block', svelte_block);
  md.renderer.rules['svelte_block'] = svelteRenderer;

  const html = md.render(markdownString);
  return html;
}
