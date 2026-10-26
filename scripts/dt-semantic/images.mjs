export function cardSources(src){
  const stem=src.replace('assets/products/','assets/responsive/').replace(/\.webp$/,'');
  return `srcset="${stem}-320.webp 320w, ${stem}-640.webp 640w" sizes="(max-width:580px) calc((100vw - 47px)/2), (max-width:960px) 45vw, 360px"`;
}
