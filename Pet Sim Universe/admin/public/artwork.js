// Artwork preparation runs on the owner's device, not in the Worker's CPU budget.
// PNG output keeps transparency. Originals are scaled only when required.
export async function prepareArtwork(file) {
  if(!file || file.type!=='image/png' || file.size>16777216) throw new Error('Choose a PNG smaller than 16 MB.');
  let image;
  try {image=await createImageBitmap(file);} catch {throw new Error('This PNG could not be decoded. Choose another image.');}
  try {
    if(!image.width || !image.height || image.width>8192 || image.height>8192) throw new Error('PNG dimensions must be at most 8192 pixels per side.');
    let scale=Math.min(1,512/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    for(let attempt=0;attempt<8;attempt++) {
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      const context=canvas.getContext('2d');if(!context)throw new Error('Your browser could not prepare artwork.');
      context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if(blob && blob.size<=131072) {
        const preview=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Artwork read failed.'));reader.readAsDataURL(blob);});
        return {content:preview.split(',')[1],preview,width:canvas.width,height:canvas.height};
      }
      scale*=0.72;
    }
    throw new Error('Artwork could not fit the upload limit. Use a simpler transparent PNG.');
  } finally {image.close();}
}
