/* BIG BROTHER — Purchase History Mobile V1 */
(function(){
'use strict';
const BASE_PREVIEW_WIDTH=794;
function $(id){return document.getElementById(id)}
function setup(){
  const page=document.querySelector('.page');
  const summary=document.querySelector('.summary');
  const top=document.querySelector('.top');
  if(!page||!summary||!top)return;

  const head=document.createElement('div');
  head.className='bb-mobile-head';
  head.innerHTML='<div><h1>Purchase History</h1><p>Purchase records · Promotion Qty · Supabase</p></div><button type="button" class="secondary bb-head-refresh">↻ Refresh</button>';
  page.insertBefore(head,page.firstChild);

  const directCards=Array.from(page.children).filter(el=>el.classList&&el.classList.contains('card'));
  const statusCard=directCards[0];
  const historyCard=directCards[1];
  if(statusCard)statusCard.classList.add('bb-status-card');
  if(historyCard)historyCard.classList.add('bb-history-list');

  const filters=document.querySelector('.filters');
  const overlay=document.createElement('div');
  overlay.className='bb-filter-overlay';
  const sheet=document.createElement('div');
  sheet.className='bb-filter-sheet';
  sheet.innerHTML='<div class="bb-filter-sheet-head"><strong>Filters</strong><button type="button" class="bb-filter-sheet-close" aria-label="Close filters">×</button></div>';
  if(filters)sheet.appendChild(filters);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  const toolbar=document.createElement('div');
  toolbar.className='bb-mobile-toolbar';
  toolbar.innerHTML='<button type="button" class="bb-filter-btn">☷ Filters</button><button type="button" class="bb-refresh-btn">↻ Refresh</button>';
  if(historyCard)page.insertBefore(toolbar,historyCard);else page.appendChild(toolbar);

  const openFilters=()=>overlay.classList.add('show');
  const closeFilters=()=>overlay.classList.remove('show');
  toolbar.querySelector('.bb-filter-btn').addEventListener('click',openFilters);
  sheet.querySelector('.bb-filter-sheet-close').addEventListener('click',closeFilters);
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeFilters()});

  const refresh=()=>{const b=$('refreshBtn');if(b&&!b.disabled)b.click()};
  head.querySelector('.bb-head-refresh').addEventListener('click',refresh);
  toolbar.querySelector('.bb-refresh-btn').addEventListener('click',refresh);

  const clear=$('clearBtn');
  if(clear)clear.addEventListener('click',()=>setTimeout(closeFilters,30));

  const tbody=$('tbody');
  const markRows=()=>{
    if(!tbody)return;
    Array.from(tbody.children).forEach(row=>{
      const cell=row.children[0];
      row.classList.toggle('bb-empty',row.children.length===1&&cell&&cell.hasAttribute('colspan'));
    });
  };
  if(tbody){new MutationObserver(markRows).observe(tbody,{childList:true,subtree:false});markRows()}

  installPreviewScaling();
}

function fitPreview(){
  const modal=$('modal');
  const stage=$('detailContent');
  if(!modal||!modal.classList.contains('show')||!stage)return;
  const paper=stage.querySelector(':scope > .invoice-sheet');
  if(!paper)return;
  const modalBox=modal.querySelector('.modalbox');
  const available=Math.max(260,Math.min(window.innerWidth-16,(modalBox?.clientWidth||window.innerWidth)-16));
  const scale=Math.min(1,available/BASE_PREVIEW_WIDTH);
  stage.style.setProperty('--bb-preview-scale',String(scale));
  const naturalHeight=Math.max(paper.scrollHeight,paper.offsetHeight,1);
  stage.style.width=Math.ceil(BASE_PREVIEW_WIDTH*scale)+'px';
  stage.style.height=Math.ceil(naturalHeight*scale)+'px';
}

function installPreviewScaling(){
  if(typeof window.preview==='function'&&!window.preview.__bbMobileWrapped){
    const original=window.preview;
    const wrapped=async function(purchaseId){
      const result=await original(purchaseId);
      requestAnimationFrame(fitPreview);
      setTimeout(fitPreview,100);
      setTimeout(fitPreview,350);
      return result;
    };
    wrapped.__bbMobileWrapped=true;
    window.preview=wrapped;
  }
  window.addEventListener('resize',fitPreview,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(fitPreview,120),{passive:true});
  const modal=$('modal');
  if(modal){
    new MutationObserver(()=>{if(modal.classList.contains('show'))requestAnimationFrame(fitPreview)}).observe(modal,{attributes:true,attributeFilter:['class']});
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
