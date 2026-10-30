import {it,expect} from 'vitest';
import {say,formatDigital,type Locale,type Style} from '../src/engine/text';
const cases: [number,number,Locale,Style,string][]=[
 [3,0,'fr','12','trois heures'],[3,15,'fr','12','trois heures et quart'],[3,30,'fr','12','trois heures et demie'],[3,45,'fr','12','quatre heures moins le quart'],[3,55,'fr','12','quatre heures moins cinq'],[12,0,'fr','12','midi'],[0,0,'fr','12','minuit'],[12,30,'fr','12','midi et demi'],[15,30,'fr','24','quinze heures trente'],
 [3,0,'en','12',"three o'clock"],[3,15,'en','12','quarter past three'],[3,30,'en','12','half past three'],[3,45,'en','12','quarter to four'],[3,55,'en','12','five to four'],[12,0,'en','12','noon'],[0,0,'en','12','midnight'],[15,30,'en','24','fifteen thirty']
];
for(const [h,m,locale,style,text] of cases)it(`${locale} ${h}:${m} ${style}`,()=>expect(say({h,m},locale,style)).toBe(text));
it('digital formats',()=>{expect(formatDigital({h:15,m:30})).toBe('3:30');expect(formatDigital({h:15,m:30},'24')).toBe('15:30');expect(formatDigital({h:0,m:0},'24')).toBe('00:00');});
