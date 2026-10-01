// Local PNG export. No uploads or links are generated.
const pageSize = 18;
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export function tradeSummary(model) {
  const left = model.left.total;
  const right = model.right.total;
  const empty = !model.left.entries.length && !model.right.entries.length && !model.left.tickets && !model.right.tickets;
  const gain = right - left;
  const tied = Math.abs(gain) <= Math.max(1, Math.abs(left), Math.abs(right)) * Number.EPSILON * 4;
  const suffix = model.left.unpriced || model.right.unpriced ? ' O/C and unpriced items excluded.' : '';
  if (empty) return { verdict: 'fair', title: 'FAIR TRADE', detail: 'Add items or tickets to compare offers.', color: '#ba9aff' };
  if (tied) return { verdict: 'fair', title: 'FAIR TRADE', detail: 'Known values are equal.' + suffix, color: '#ba9aff' };
  return { verdict: gain > 0 ? 'win' : 'lose', title: gain > 0 ? 'W — WIN FOR YOU' : 'L — LOSS FOR YOU', detail: `You ${gain > 0 ? 'receive' : 'give'} ${numberFormat.format(Math.abs(gain))} more in listed value.` + suffix, color: gain > 0 ? '#7cddb0' : '#ff96a6' };
}

function browserImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('An item image could not be loaded. Please refresh and try again.'));
    img.src = url;
  });
}
export function tradePageCount(model) {
  return Math.max(1, Math.ceil(Math.max(model.left.entries.length, model.right.entries.length) / pageSize));
}
export async function renderTradePage(model, page = 0, adapters = {}) {
  const createCanvas = adapters.createCanvas || ((w,h) => { const c = document.createElement('canvas'); c.width=w; c.height=h; return c; });
  const loadImage = adapters.loadImage || browserImage;
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready;
  const pages = tradePageCount(model);
  if (!Number.isInteger(page) || page < 0 || page >= pages) throw new Error('Invalid export page.');
  const chunks = ['left','right'].map(side => model[side].entries.slice(page*pageSize, (page+1)*pageSize));
  const rows = Math.max(1, Math.ceil(Math.max(...chunks.map(list=>list.length))/3));
  const panelHeight = 130 + rows*192 + 108;
  const canvas = createCanvas(1600, panelHeight+372);
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  const cache = new Map();
  for (const entry of chunks.flat()) if (entry.image && !cache.has(entry.image)) cache.set(entry.image, loadImage(entry.image));
  await Promise.all(cache.values());
  const font = '"Lilita One", "Arial Rounded MT Bold", Arial, sans-serif';
  function box(x,y,w,h,fill,stroke,r=20) { ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=fill; ctx.fill(); if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();} }
  function text(value,x,y,size=22,color='#f5f0ff',weight=600) { ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign='left';ctx.fillText(String(value),x,y); }
  function fit(value,x,y,maxWidth,size=22,color='#f5f0ff') { ctx.font=`700 ${size}px ${font}`;let label=String(value);while(ctx.measureText(label).width>maxWidth && label.length>1)label=label.slice(0,-2)+'…';text(label,x,y,size,color,700); }
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,'#16101f');bg.addColorStop(1,'#08131b');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  box(32,32,1536,124,'#151220','#45315e');
  text('PET UNIVERSE VALUES',58,66,18,'#b794ef',800);
  text('Trade Snapshot',58,117,42,'#fff',800);
  text('petuniverse-values.pl',1110,79,24,'#e5d4fb',700);
  text(model.timestamp,1110,117,18,'#b4a7c3',500);
  for (let sideIndex=0;sideIndex<2;sideIndex++) {
    const side=sideIndex?'right':'left';const offer=model[side];const entries=chunks[sideIndex];const x=32+sideIndex*784,y=180;
    box(x,y,752,panelHeight,'#100e18','#45315e');
    text(sideIndex?'OTHER OFFER':'MY OFFER',x+24,y+42,28,'#f5f0ff',800);
    text(sideIndex?'What you receive':'What you give',x+24,y+72,20,'#b5a7c5',500);
    text(`${offer.entries.reduce((sum,e)=>sum+e.qty,0)} items`,x+568,y+42,20,'#be9ceb');
    if (!entries.length) {box(x+24,y+106,704,172,'#181320','#352943');text('No items on this page',x+48,y+182,26,'#c6b6d7');}
    for (let i=0;i<entries.length;i++) {
      const entry=entries[i];const cx=x+24+(i%3)*240,cy=y+100+Math.floor(i/3)*192;
      box(cx,cy,224,178,'#1b1527',entry.color || '#684197',14);
      text(`×${entry.qty}`,cx+14,cy+29,20,'#dfc7ff',800);
      text(entry.variantLabel,cx+76,cy+29,15,'#bcb0c9',600);
      if(entry.image) {const img=await cache.get(entry.image);const factor=Math.min(112/img.width,92/img.height);ctx.drawImage(img,cx+(224-img.width*factor)/2,cy+36+(92-img.height*factor)/2,img.width*factor,img.height*factor);}
      fit(entry.name,cx+14,cy+144,196,18);
      fit(entry.valueLabel,cx+14,cy+167,196,18,'#eed9a1');
    }
    const footerY=y+panelHeight-84;
    box(x+24,footerY,704,62,'#20182c','#49305e',12);
    text(`Tickets: ${numberFormat.format(offer.tickets)}`,x+40,footerY+25,18,'#c9b9d8');
    text(`Total: ${numberFormat.format(offer.total)}${offer.unpriced?' + unpriced items':''}`,x+40,footerY+49,22,'#fff',800);
  }
  const summary=tradeSummary(model),sy=panelHeight+202;
  box(32,sy,1536,104,'#181320','#674594');
  text(summary.title,56,sy+42,30,summary.color,800);
  text(summary.detail,56,sy+77,22,'#d1c4df',500);
  text(`Values at export time • ${model.timestamp}`,40,height-25,17,'#a99ab9',500);
  text(`Page ${page+1} / ${pages}`,1400,height-25,17,'#a99ab9',500);
  return canvas;
}
