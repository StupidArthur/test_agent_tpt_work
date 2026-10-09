const fs=require('fs'),zlib=require('zlib');
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c&1)?(c>>>1)^0xedb88320:c>>>1}return (c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc])}
const w=32,h=24,raw=[];for(let y=0;y<h;y++){const row=Buffer.alloc(1+w*4);row[0]=0;for(let x=0;x<w;x++){const i=1+x*4;row[i]=(x*7)%256;row[i+1]=(y*10)%256;row[i+2]=180;row[i+3]=255}raw.push(row)}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(Buffer.concat(raw))),chunk('IEND',Buffer.alloc(0))]);
const out='夹具/round-attachment-fixtures-20261006/round-preview-20261006.png';fs.writeFileSync(out,png);console.log(out,png.length,crc32(png).toString(16));
