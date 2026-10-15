const PDFLIB_URL='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';
const FONTKIT_URL='https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/+esm';
const ZIP_URL='https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';

function parseXml(source){
  const doc=new DOMParser().parseFromString(source,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('The EPUB contains invalid XML.');
  return doc;
}

function resolveEntry(base,href){
  const url=new URL(href,new URL(base,'https://epub.invalid/'));
  if(url.origin!=='https://epub.invalid') throw new Error('External EPUB chapters are not supported.');
  return decodeURIComponent(url.pathname.slice(1));
}

export async function epubBlocks(buffer){
  const {default:JSZip}=await import(ZIP_URL);
  const zip=await JSZip.loadAsync(buffer);
  async function read(path){
    const entry=zip.file(path);
    if(!entry) throw new Error(`Missing EPUB file: ${path}`);
    return entry.async('string');
  }
  const container=parseXml(await read('META-INF/container.xml'));
  const root=container.getElementsByTagNameNS('*','rootfile')[0];
  const packagePath=root?.getAttribute('full-path');
  if(!packagePath) throw new Error('The EPUB has no book package.');
  const packageDoc=parseXml(await read(packagePath));
  const manifest=new Map([...packageDoc.getElementsByTagNameNS('*','item')]
    .map(item=>[item.getAttribute('id'),item]));
  const blocks=[];
  for(const ref of packageDoc.getElementsByTagNameNS('*','itemref')){
    if(ref.getAttribute('linear')==='no') continue;
    const item=manifest.get(ref.getAttribute('idref'));
    if(!item) throw new Error('The EPUB reading order references a missing chapter.');
    if(!['application/xhtml+xml','text/html'].includes(item.getAttribute('media-type')))
      throw new Error('This EPUB contains a chapter format that is not supported.');
    const doc=new DOMParser().parseFromString(await read(resolveEntry(packagePath,item.getAttribute('href'))),'text/html');
    doc.querySelectorAll('script,style,noscript,nav,svg').forEach(el=>el.remove());
    // Walk text once, so nested paragraphs/list items are never duplicated.
    let text='';
    let heading=false;
    const flush=()=>{
      const value=text.replace(/[\u00ad\u200b\u2060\ufeff]/g,'').replace(/\s+/g,' ').trim();
      if(value) blocks.push({text:value,heading});
      text='';
    };
    function walk(node){
      if(node.nodeType===3){text+=node.textContent;return;}
      if(node.nodeType!==1) return;
      const tag=node.localName.toLowerCase();
      const boundary=/^(h[1-6]|p|div|section|article|li|blockquote|pre|tr|figcaption)$/.test(tag);
      const previous=heading;
      if(boundary){flush();heading=/^h[1-6]$/.test(tag);}
      if(tag==='br') text+=' ';
      if(tag==='img' && node.getAttribute('alt')) text+=` [Image: ${node.getAttribute('alt')}] `;
      for(const child of node.childNodes) walk(child);
      if(tag==='td'||tag==='th') text+=' ';
      if(boundary){flush();heading=previous;}
    }
    walk(doc.body);
    flush();
  }
  if(!blocks.length) throw new Error('No readable text was found. DRM-protected and image-only EPUBs are not supported.');
  return blocks;
}

export function preparePdfText(value,supported,missing=new Set()){
  // EPUBs often contain discretionary hyphens and invisible layout controls.
  // They do not need glyphs in the newly laid-out PDF.
  const text=value.normalize('NFC')
    .replace(/[\u00ad\u200b\u2060\ufeff]/g,'')
    .replace(/[\u0000-\u001f\u007f\s]/g,' ');
  return [...text].map(ch=>{
    if(supported.has(ch.codePointAt(0))) return ch;
    const code=`U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')}`;
    missing.add(code);
    // Preserve an explicit, searchable identifier instead of dropping text
    // or preventing the rest of the book from opening.
    return `[${code}]`;
  }).join('');
}

export async function blocksToPdf(blocks,title,{onMissingCharacters=()=>{}}={}){
  if(!blocks.length) throw new Error('No readable text was found in this file.');
  const [{PDFDocument,rgb},{default:fontkit}]=await Promise.all([import(PDFLIB_URL),import(FONTKIT_URL)]);
  const doc=await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  const fonts=await Promise.all(['Regular','Bold'].map(async weight=>{
    const response=await fetch(new URL(`./assets/NotoSans-${weight}.ttf`,import.meta.url));
    if(!response.ok) throw new Error('Could not load the PDF font. Please reconnect and try again.');
    return doc.embedFont(await response.arrayBuffer(),{subset:true});
  }));
  const characterSets=fonts.map(font=>new Set(font.getCharacterSet()));
  // Load the fallback only for books that need glyphs beyond Noto Sans.
  const needsFallback=blocks.some(block=>[...block.text.normalize('NFC')]
    .some(ch=>!/[\s\u00ad\u200b\u2060\ufeff\u0000-\u001f\u007f]/.test(ch) &&
      !characterSets[block.heading?1:0].has(ch.codePointAt(0))));
  let mathFont=null;
  if(needsFallback){
    const response=await fetch(new URL('./assets/NotoSansMath-Regular.ttf',import.meta.url));
    if(!response.ok) throw new Error('Could not load the mathematical PDF font. Please reconnect and try again.');
    mathFont=await doc.embedFont(await response.arrayBuffer(),{subset:true});
  }
  const mathCharacters=new Set(mathFont?.getCharacterSet()||[]);
  const supportedSets=characterSets.map(set=>new Set([...set,...mathCharacters]));
  const missing=new Set();
  const width=595.28,height=841.89,margin=54;
  let page,y;
  function newPage(){page=doc.addPage([width,height]);y=height-margin;}
  newPage();
  for(const block of blocks){
    const font=fonts[block.heading?1:0],size=block.heading?17:11;
    const lineHeight=size*1.5;
    const text=preparePdfText(block.text,supportedSets[block.heading?1:0],missing);
    function runs(value){
      const result=[];
      for(const ch of value){
        const selected=characterSets[block.heading?1:0].has(ch.codePointAt(0))?font:mathFont;
        const last=result[result.length-1];
        if(last?.font===selected) last.text+=ch;
        else result.push({font:selected,text:ch});
      }
      return result;
    }
    function textWidth(value){
      return runs(value).reduce((sum,run)=>sum+run.font.widthOfTextAtSize(run.text,size),0);
    }
    if(block.heading && y<margin+lineHeight*3) newPage();
    let line='';
    function draw(){
      if(!line) return;
      if(y-lineHeight<margin) newPage();
      let x=margin;
      for(const run of runs(line)){
        page.drawText(run.text,{x,y:y-size,size,font:run.font,color:rgb(.08,.08,.08)});
        x+=run.font.widthOfTextAtSize(run.text,size);
      }
      y-=lineHeight;line='';
    }
    for(const word of text.split(/\s+/).filter(Boolean)){
      const candidate=line?`${line} ${word}`:word;
      if(textWidth(candidate)<=width-margin*2){line=candidate;continue;}
      draw();
      // Wrap long URLs/words as well as ordinary prose.
      for(const ch of word){
        if(line && textWidth(line+ch)>width-margin*2) draw();
        line+=ch;
      }
    }
    draw();y-=block.heading?10:8;
  }
  const bytes=await doc.save();
  if(missing.size) onMissingCharacters([...missing]);
  return bytes;
}
