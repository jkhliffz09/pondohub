import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
test('native view containers never receive raw JSX text nodes', async () => {
  const offenders: string[] = [];
  async function scan(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = path.join(dir, entry.name);
      if (entry.isDirectory()) await scan(name);
      else if (name.endsWith('.tsx')) {
        const source = ts.createSourceFile(
          name,
          await readFile(name, 'utf8'),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        function visit(node: ts.Node) {
          if (ts.isJsxElement(node)) {
            const tag = node.openingElement.tagName.getText(source);
            if (
              [
                'View',
                'ScrollView',
                'Pressable',
                'SafeAreaView',
                'KeyboardAvoidingView',
                'Row',
                'Card',
                'LinearGradient',
              ].includes(tag)
            ) {
              for (const child of node.children) {
                if (
                  ts.isJsxText(child) &&
                  (child.text.trim() || (child.text.length && !child.text.includes('\n')))
                ) {
                  const { line } = source.getLineAndCharacterOfPosition(child.getStart(source));
                  offenders.push(`${name}:${line + 1}`);
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
  }
  await scan('apps/mobile/src');
  assert.deepEqual(
    offenders,
    [],
    'Wrap strings in a Text component to avoid native render crashes.',
  );
});
