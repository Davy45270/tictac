import {it,expect} from 'vitest';
import {ids,expressions,animations} from '../src/characters/model';
import {characterSvg} from '../src/characters/svg';
for(const id of ids)it(`${id}: SVG for every expression, animation and motion preference`,()=>{
 for(const expression of expressions)for(const animation of animations)for(const motion of ['full','reduce'] as const){
  const svg=characterSvg(id,expression,animation,motion);expect(svg.startsWith('<svg xmlns=')).toBe(true);expect(svg.endsWith('</svg>')).toBe(true);expect(svg).not.toMatch(/NaN|undefined|Infinity/);expect(svg).toContain('viewBox="0 0 240 240"');
  const stack: string[]=[];
  for(const match of svg.matchAll(/<([^>]+)>/g)){
   const tag=match[1]!,name=/^\/?([a-z]+)/.exec(tag)?.[1];expect(name).toBeDefined();
   if(tag.startsWith('/'))expect(stack.pop()).toBe(name);
   else {
    const attributes=tag.slice(name!.length).replace(/\/$/,'').replace(/[a-zA-Z][a-zA-Z0-9:-]*="[^"]*"/g,'').trim();expect(attributes).toBe('');
    if(!tag.endsWith('/'))stack.push(name!);
   }
  }
  expect(stack).toEqual([]);
  const opens=(svg.match(/<(?:circle|ellipse|path|polygon|polyline) /g)??[]).length;expect(opens).toBeGreaterThan(10);
 }
});
