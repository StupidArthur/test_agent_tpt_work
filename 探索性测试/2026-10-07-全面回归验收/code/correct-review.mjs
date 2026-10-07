import fs from 'node:fs';
const p=new URL('finish.mjs',import.meta.url);let s=fs.readFileSync(p,'utf8');
s=s.replace('原引用两次自动恢复的 after=false，未证明切换；补证 true→false→true 且列表保持可见。','原记录 before/restored 均为 false，引用正确；原始返回已有 false→true→false，补证也支持切换与恢复。');
s=s.replace('G13-09原断言引用错误，已补取真正的状态变化与恢复。','G13-09已核对原始引用正确，补证支持切换与恢复；不把相同的初值和恢复值误判为未切换。');
s=s.replace('G13-09读取自动恢复后的字段；','');
fs.writeFileSync(p,s);
