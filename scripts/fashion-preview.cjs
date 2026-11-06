const {app,BrowserWindow}=require('electron');const fs=require('fs');require('../dist-electron/electron/main.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{await app.whenReady();await wait(2500);const ws=BrowserWindow.getAllWindows();const book=ws.find(w=>w.getTitle().endsWith('Book')),v=ws.find(w=>w.getTitle().endsWith('Vertical'));fs.mkdirSync('output/fashion',{recursive:true});const shot=async(w,n)=>fs.writeFileSync('output/fashion/'+n+'.png',(await w.webContents.capturePage()).toPNG());await book.webContents.executeJavaScript('window.exhibition.fashionAction("reset")');await wait(100);await shot(book,'book');await book.webContents.executeJavaScript('window.exhibition.fashionAction("lift")');await wait(4900);await v.webContents.executeJavaScript(`(async()=>{
 await document.fonts.ready;
 const images=[...document.querySelectorAll('.dress-canvas img')];
 if(images.length!==18)throw Error('Expected all 18 layered image instances, got '+images.length);
 for(const img of images){if(!img.complete||!img.naturalWidth)throw Error('Missing asset: '+img.src);}
 const canvas=document.querySelector('.dress-canvas'),r=canvas.getBoundingClientRect();
 if(Math.abs(r.width/r.height-1080/1920)>.001)throw Error('Dress canvas distorted');
 const slots=[['.dress-textile',576,609,435,430.33],['.dress-pavilion',10,930,251,436],['.dress-figure',104,1075,719,784]];
 for(const [selector,x,y,w,h] of slots){const n=document.querySelector(selector),b=n.getBoundingClientRect(),scale=r.width/1080;
 if(Math.abs((b.x-r.x)/scale-x)>1||Math.abs((b.y-r.y)/scale-y)>1||Math.abs(b.width/scale-w)>1||Math.abs(b.height/scale-h)>1)throw Error('Wrong design geometry: '+selector);}
 for(const font of ['300 104px "Cormorant Garamond"','400 35px Jost','600 17px Manrope','400 32px "Playfair Display SC"'])if(!document.fonts.check(font))throw Error('Font missing: '+font);
})()`);await shot(v,'red');await book.webContents.executeJavaScript('window.exhibition.fashionAction("switch")');await wait(1450);await v.webContents.executeJavaScript(`(async()=>{
 const figure=document.querySelector('.dress-white-crop img'),texture=document.querySelector('.dress-textile');
 await Promise.all([figure.decode(),texture.decode()]);
 if(!figure.src.endsWith('/chikankari-portrait.png')||!texture.src.endsWith('/ivory-textile.png'))throw Error('White look uses incorrect assets');
 const canvas=document.querySelector('.dress-canvas').getBoundingClientRect(),scale=canvas.width/1080;
 for(const [selector,x,y,w,h] of [['.dress-white-crop',104,1075,719,784],['.dress-textile',576,609,435,430.33]]){
 const b=document.querySelector(selector).getBoundingClientRect();
 if(Math.abs((b.x-canvas.x)/scale-x)>1||Math.abs((b.y-canvas.y)/scale-y)>1||Math.abs(b.width/scale-w)>1||Math.abs(b.height/scale-h)>1)throw Error('Incorrect white look geometry: '+selector);
 }
 if(document.querySelector('[data-art-look]').dataset.artLook!=='white')throw Error('White switch did not settle');
})()`);await shot(v,'white');await book.webContents.executeJavaScript('window.exhibition.fashionAction("next")');await wait(800);await shot(v,'reverse-exit');await wait(2200);const state=await book.webContents.executeJavaScript('window.exhibition.getSnapshot()');if(!state.fashion.nextChapter)throw Error('Next chapter did not open');await shot(book,'next-chapter');console.log('Mask switch and reverse exit to next chapter captured');app.exit(0)})().catch(e=>{console.error(e);app.exit(1)});

