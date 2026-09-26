/* BIG BROTHER — Purchase Invoice Edit V1
   Admin-only edit from Purchase History.
   Item/QTY/price edits are locked after any Purchase stock has been received. */
(function(){
'use strict';

const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const clean=v=>String(v==null?'':v).trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt4=v=>num(v).toFixed(4);
const fmt2=v=>num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

let currentPurchaseId='';
let editState=null;
let isAdmin=false;

function rpcCall(name,args={}){
  if(typeof window.rpc!=='function')throw new Error('Purchase History RPC is unavailable.');
  return window.rpc(name,args);
}

function addStyles(){
  if(document.getElementById('bbPurchaseEditStyle'))return;
  const s=document.createElement('style');
  s.id='bbPurchaseEditStyle';
  s.textContent=`
#bbPurchaseEditModal{position:fixed;inset:0;z-index:1000002;background:rgba(16,34,57,.48);display:none;align-items:flex-start;justify-content:center;padding:20px;overflow:auto}
#bbPurchaseEditModal.show{display:flex}
#bbPurchaseEditCard{width:min(1080px,100%);margin:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(20,45,80,.28);overflow:hidden}
.bb-pe-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:16px 18px;border-bottom:1px solid #dfe7f0}
.bb-pe-head h2{margin:0;color:#174a91;font-size:20px}.bb-pe-sub{margin-top:3px;color:#6b7280;font-size:11px;font-weight:700}
.bb-pe-close{border:0;background:#eef3f8;color:#174a91;border-radius:9px;padding:8px 11px;font-weight:900;cursor:pointer}
.bb-pe-body{padding:16px 18px 18px}.bb-pe-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
.bb-pe-field label{display:block;margin-bottom:5px;color:#42566f;font-size:9px;font-weight:900;text-transform:uppercase}
.bb-pe-field input,.bb-pe-field select,.bb-pe-field textarea{width:100%;box-sizing:border-box;border:1px solid #ced9e6;border-radius:8px;padding:9px 10px;background:#fff;color:#1c2f45;font:700 12px Arial}
.bb-pe-field textarea{min-height:70px;resize:vertical}.bb-pe-wide{grid-column:1/-1}
.bb-pe-lock{margin:13px 0;border:1px solid #f1d393;background:#fff9e9;color:#835b06;border-radius:10px;padding:10px 12px;font-size:10px;font-weight:800;line-height:1.45}
.bb-pe-ok{margin:13px 0;border:1px solid #bee4cd;background:#f0fbf5;color:#176c4a;border-radius:10px;padding:10px 12px;font-size:10px;font-weight:800}
.bb-pe-section{margin-top:16px}.bb-pe-section-title{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;color:#174a91;font-size:13px;font-weight:900}
.bb-pe-add{border:0;border-radius:8px;background:#174a91;color:#fff;padding:8px 11px;font-size:10px;font-weight:900;cursor:pointer}
.bb-pe-table-wrap{overflow:auto;border:1px solid #dce5ef;border-radius:10px}.bb-pe-table{width:100%;border-collapse:collapse;min-width:850px}.bb-pe-table th{background:#174a91;color:#fff;font-size:9px;text-transform:uppercase;padding:8px}.bb-pe-table td{border-top:1px solid #e5ebf2;padding:7px}
.bb-pe-table input,.bb-pe-table select{width:100%;box-sizing:border-box;border:1px solid #d0dae6;border-radius:7px;padding:7px;font:700 11px Arial;background:#fff}
.bb-pe-remove{border:0;background:#fff0ee;color:#b42318;border-radius:7px;padding:7px 9px;font-weight:900;cursor:pointer}
.bb-pe-summary{display:flex;justify-content:flex-end;margin-top:12px}.bb-pe-summary-box{width:min(370px,100%);border:1px solid #dce5ef;border-radius:10px;overflow:hidden}.bb-pe-srow{display:flex;justify-content:space-between;padding:9px 11px;border-bottom:1px solid #e7edf4;font-size:11px;font-weight:800}.bb-pe-srow:last-child{border-bottom:0}.bb-pe-srow.total{background:#edf5ff;color:#174a91;font-size:14px}
.bb-pe-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.bb-pe-actions button{border:0;border-radius:9px;padding:10px 14px;font-weight:900;cursor:pointer}.bb-pe-cancel{background:#edf2f7;color:#36506d}.bb-pe-save{background:#174a91;color:#fff}
.bb-pe-status{min-height:17px;margin-top:9px;text-align:right;font-size:10px;font-weight:800;color:#176c4a}.bb-pe-status.bad{color:#b42318}
#bbPurchaseEditBtn{background:#174a91;color:#fff;border:0;border-radius:7px;padding:7px 12px;font-weight:900;cursor:pointer}
@media(max-width:760px){#bbPurchaseEditModal{padding:8px}.bb-pe-grid{grid-template-columns:1fr 1fr}.bb-pe-body{padding:12px}.bb-pe-head{padding:13px}.bb-pe-actions{position:sticky;bottom:0;background:#fff;padding-top:10px}.bb-pe-field.bb-pe-wide{grid-column:1/-1}}
@media(max-width:480px){.bb-pe-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

function addModal(){
  if(document.getElementById('bbPurchaseEditModal'))return;
  const modal=document.createElement('div');
  modal.id='bbPurchaseEditModal';
  modal.innerHTML=`
    <div id="bbPurchaseEditCard">
      <div class="bb-pe-head">
        <div><h2>Edit Purchase Invoice</h2><div id="bbPeSub" class="bb-pe-sub"></div></div>
        <button type="button" class="bb-pe-close" id="bbPeClose">✕ Close</button>
      </div>
      <div class="bb-pe-body">
        <div class="bb-pe-grid">
          <div class="bb-pe-field"><label>Purchase ID</label><input id="bbPePurchaseId" readonly></div>
          <div class="bb-pe-field"><label>Client</label><input id="bbPeClient" readonly></div>
          <div class="bb-pe-field"><label>Currency</label><input id="bbPeCurrency" readonly></div>
          <div class="bb-pe-field"><label>Purchase Date</label><input id="bbPeDate" type="date"></div>
          <div class="bb-pe-field"><label>Client Invoice No.</label><input id="bbPeInvoiceNo" type="text"></div>
          <div class="bb-pe-field"><label>Purchaser</label><select id="bbPePurchaser"></select></div>
          <div class="bb-pe-field"><label>Payment Term</label><input id="bbPePaymentTerm" type="text"></div>
          <div class="bb-pe-field bb-pe-wide"><label>Note</label><textarea id="bbPeNote"></textarea></div>
        </div>

        <div id="bbPeRule"></div>

        <div class="bb-pe-section">
          <div class="bb-pe-section-title"><span>Purchase Items</span><button id="bbPeAdd" class="bb-pe-add" type="button">+ Add Product</button></div>
          <div class="bb-pe-table-wrap">
            <table class="bb-pe-table">
              <thead><tr><th style="width:34px">#</th><th>Product</th><th style="width:110px">Purchase QTY</th><th style="width:110px">Promotion QTY</th><th style="width:125px">Unit Price</th><th style="width:115px">Amount</th><th style="width:55px"></th></tr></thead>
              <tbody id="bbPeItems"></tbody>
            </table>
          </div>
          <div class="bb-pe-summary">
            <div class="bb-pe-summary-box">
              <div class="bb-pe-srow"><span>Subtotal</span><strong id="bbPeSubtotal">0.00</strong></div>
              <div class="bb-pe-srow"><span>Discount</span><span><input id="bbPeDiscount" type="number" min="0" step="0.01" style="width:120px;text-align:right"></span></div>
              <div class="bb-pe-srow total"><span>Grand Total</span><strong id="bbPeGrand">0.00</strong></div>
              <div class="bb-pe-srow"><span>Already Paid</span><strong id="bbPePaid">0.00</strong></div>
              <div class="bb-pe-srow"><span>New Payable</span><strong id="bbPePayable">0.00</strong></div>
            </div>
          </div>
        </div>

        <div class="bb-pe-actions">
          <button type="button" class="bb-pe-cancel" id="bbPeCancel">Cancel</button>
          <button type="button" class="bb-pe-save" id="bbPeSave">Save Changes</button>
        </div>
        <div id="bbPeStatus" class="bb-pe-status"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  modal.addEventListener('click',e=>{if(e.target===modal)closeEditor()});
  document.getElementById('bbPeClose').onclick=closeEditor;
  document.getElementById('bbPeCancel').onclick=closeEditor;
  document.getElementById('bbPeAdd').onclick=()=>{if(editState?.canEditLines){editState.items.push({productCode:'',qty:1,promotionQty:0,unitPrice:0});renderItems()}};
  document.getElementById('bbPeDiscount').addEventListener('input',updateTotals);
  document.getElementById('bbPeItems').addEventListener('input',handleItemInput);
  document.getElementById('bbPeItems').addEventListener('change',handleItemChange);
  document.getElementById('bbPeItems').addEventListener('click',handleItemClick);
  document.getElementById('bbPeSave').onclick=saveEditor;
}

function ensureEditButton(){
  const modal=document.getElementById('modal');
  if(!modal)return false;
  const head=modal.querySelector('.modalhead');
  if(!head)return false;
  const actions=head.lastElementChild;
  if(!actions)return false;
  let btn=document.getElementById('bbPurchaseEditBtn');
  if(!btn){
    btn=document.createElement('button');
    btn.id='bbPurchaseEditBtn';
    btn.type='button';
    btn.textContent='✏️ Edit';
    btn.hidden=true;
    btn.onclick=()=>openEditor(currentPurchaseId);
    actions.insertBefore(btn,actions.firstChild);
  }
  btn.hidden=!isAdmin||!currentPurchaseId;
  return true;
}

function productOptions(selected){
  const products=editState?.catalog||[];
  return '<option value="">Select Product</option>'+products.map(p=>`<option value="${esc(p.productCode)}" ${p.productCode===selected?'selected':''}>${esc(p.productName)} — ${esc(p.productCode)}</option>`).join('');
}

function renderItems(){
  const body=document.getElementById('bbPeItems');
  if(!body||!editState)return;
  const locked=!editState.canEditLines;
  body.innerHTML=editState.items.map((item,i)=>`
    <tr data-i="${i}">
      <td>${i+1}</td>
      <td>${locked
        ? '<strong>'+esc(item.productName||item.productCode)+'</strong><div style="font-size:9px;color:#6b7280;margin-top:2px">'+esc(item.productCode)+'</div>'
        : '<select class="bb-pe-product" data-i="'+i+'">'+productOptions(item.productCode)+'</select>'}
      </td>
      <td><input class="bb-pe-qty" data-i="${i}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(item.qty)}" ${locked?'disabled':''}></td>
      <td><input class="bb-pe-promo" data-i="${i}" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(item.promotionQty||0)}" ${locked?'disabled':''}></td>
      <td><input class="bb-pe-price" data-i="${i}" type="number" min="0" step="0.0001" inputmode="decimal" value="${fmt4(item.unitPrice)}" ${locked?'disabled':''}></td>
      <td style="text-align:right;font-weight:900">${fmt2(num(item.qty)*num(item.unitPrice))}</td>
      <td>${locked?'':'<button class="bb-pe-remove" data-remove="'+i+'" type="button">✕</button>'}</td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:18px;color:#6b7280">No items</td></tr>';

  document.getElementById('bbPeAdd').hidden=locked;
  document.getElementById('bbPeDiscount').disabled=locked;
  updateTotals();
}

function handleItemInput(e){
  const i=Number(e.target.dataset.i);
  if(!Number.isInteger(i)||!editState?.items[i])return;
  const item=editState.items[i];
  if(e.target.classList.contains('bb-pe-qty'))item.qty=Math.max(0,num(e.target.value));
  if(e.target.classList.contains('bb-pe-promo'))item.promotionQty=Math.max(0,num(e.target.value));
  if(e.target.classList.contains('bb-pe-price'))item.unitPrice=Math.max(0,num(e.target.value));
  updateTotals();
  const tr=e.target.closest('tr');
  if(tr)tr.children[5].textContent=fmt2(num(item.qty)*num(item.unitPrice));
}

function handleItemChange(e){
  if(!e.target.classList.contains('bb-pe-product'))return;
  const i=Number(e.target.dataset.i);
  const item=editState?.items[i];
  if(!item)return;
  item.productCode=clean(e.target.value);
  const p=(editState.catalog||[]).find(x=>x.productCode===item.productCode);
  if(p){
    item.productName=p.productName;
    item.unit=p.unit||'';
    item.unitPrice=num(p.purchasePrice);
  }
  renderItems();
}

function handleItemClick(e){
  const b=e.target.closest('[data-remove]');
  if(!b||!editState?.canEditLines)return;
  editState.items.splice(Number(b.dataset.remove),1);
  renderItems();
}

function updateTotals(){
  if(!editState)return;
  const subtotal=editState.items.reduce((s,x)=>s+num(x.qty)*num(x.unitPrice),0);
  let discount=Math.max(0,num(document.getElementById('bbPeDiscount')?.value));
  discount=Math.min(discount,subtotal);
  const grand=Math.max(0,subtotal-discount);
  const paid=num(editState.purchase.amountPaid);
  const payable=Math.max(0,grand-paid);
  document.getElementById('bbPeSubtotal').textContent=fmt2(subtotal);
  document.getElementById('bbPeGrand').textContent=fmt2(grand);
  document.getElementById('bbPePaid').textContent=fmt2(paid);
  document.getElementById('bbPePayable').textContent=fmt2(payable);
  return {subtotal,discount,grand,paid,payable};
}

function setStatus(msg,bad=false){
  const el=document.getElementById('bbPeStatus');
  if(!el)return;
  el.textContent=msg||'';
  el.classList.toggle('bad',!!bad);
}

async function openEditor(id){
  if(!isAdmin)return;
  id=clean(id);
  if(!id)return;
  addModal();
  setStatus('Loading Purchase…');
  document.getElementById('bbPurchaseEditModal').classList.add('show');
  try{
    const d=await rpcCall('bb_purchase_edit_prepare',{p_purchase_id:id});
    editState={
      purchase:d.purchase||{},
      items:(d.items||[]).map(x=>({
        purchaseItemId:x.purchaseItemId||'',
        productCode:x.productCode||'',
        productName:x.productName||'',
        unit:x.unit||'',
        qty:num(x.purchaseQty??x.qty),
        promotionQty:num(x.promotionQty),
        unitPrice:num(x.unitPrice)
      })),
      canEditLines:d.canEditLines===true,
      catalog:Array.isArray(d.clientCatalog?.products)?d.clientCatalog.products:[],
      staff:Array.isArray(d.staff)?d.staff:[]
    };

    const p=editState.purchase;
    document.getElementById('bbPeSub').textContent=(p.clientName||'')+' • '+(p.clientInvoiceNumber||p.purchaseId||'');
    document.getElementById('bbPePurchaseId').value=p.purchaseId||id;
    document.getElementById('bbPeClient').value=(p.clientName||'')+(p.clientCode?' — '+p.clientCode:'');
    document.getElementById('bbPeCurrency').value=p.currency||'USD';
    document.getElementById('bbPeDate').value=p.purchaseDate||'';
    document.getElementById('bbPeInvoiceNo').value=p.clientInvoiceNumber||'';
    document.getElementById('bbPePaymentTerm').value=p.paymentTerm||'';
    document.getElementById('bbPeNote').value=p.note||'';
    document.getElementById('bbPeDiscount').value=num(p.discount).toFixed(2);

    const purchaser=document.getElementById('bbPePurchaser');
    purchaser.innerHTML='<option value="">—</option>'+editState.staff.map(s=>`<option value="${esc(s.staffId)}" ${s.staffId===p.purchaserStaffId?'selected':''}>${esc(s.staffName)} — ${esc(s.staffId)}</option>`).join('');

    const rule=document.getElementById('bbPeRule');
    if(editState.canEditLines){
      rule.className='bb-pe-ok';
      rule.textContent='No Purchase stock has been received yet. Product, QTY, Promotion QTY, Supplier Price and Discount can be edited.';
    }else{
      rule.className='bb-pe-lock';
      rule.textContent='🔒 '+(d.lineEditReason||'Stock has already been received. Item values are locked to protect Stock and COGS.')+' Header information can still be edited.';
    }

    renderItems();
    setStatus('');
  }catch(error){
    setStatus(error?.message||String(error),true);
  }
}

function closeEditor(){
  document.getElementById('bbPurchaseEditModal')?.classList.remove('show');
  editState=null;
}

async function saveEditor(){
  if(!editState)return;
  const save=document.getElementById('bbPeSave');
  save.disabled=true;
  const old=save.textContent;
  save.textContent='Saving…';
  setStatus('');
  try{
    const totals=updateTotals();
    if(!clean(document.getElementById('bbPeInvoiceNo').value))throw new Error('Client Invoice No. is required.');

    if(editState.canEditLines){
      if(!editState.items.length)throw new Error('At least one Purchase item is required.');
      for(const item of editState.items){
        if(!clean(item.productCode))throw new Error('Select Product for every line.');
        if(num(item.qty)<=0)throw new Error('Purchase QTY must be greater than 0.');
        if(num(item.unitPrice)<=0)throw new Error('Supplier Unit Price must be greater than 0.');
      }
      if(totals.grand+0.000001<totals.paid){
        throw new Error('New Grand Total cannot be lower than Amount Already Paid.');
      }
    }

    const payload={
      purchaseDate:document.getElementById('bbPeDate').value,
      clientInvoiceNumber:clean(document.getElementById('bbPeInvoiceNo').value),
      purchaserStaffId:clean(document.getElementById('bbPePurchaser').value)||null,
      paymentTerm:clean(document.getElementById('bbPePaymentTerm').value),
      note:clean(document.getElementById('bbPeNote').value),
      editLines:editState.canEditLines
    };
    if(editState.canEditLines){
      payload.discount=num(document.getElementById('bbPeDiscount').value);
      payload.items=editState.items.map(x=>({
        productCode:x.productCode,
        qty:num(x.qty),
        promotionQty:num(x.promotionQty),
        unitPrice:Number(num(x.unitPrice).toFixed(4))
      }));
    }

    const result=await rpcCall('bb_purchase_edit_save',{
      p_purchase_id:editState.purchase.purchaseId,
      p_payload:payload
    });

    setStatus(result.message||'Purchase updated successfully.');
    const id=editState.purchase.purchaseId;
    if(typeof window.loadPurchases==='function')await window.loadPurchases();
    closeEditor();
    if(typeof window.preview==='function')await window.preview(id);
  }catch(error){
    setStatus(error?.message||String(error),true);
  }finally{
    save.disabled=false;
    save.textContent=old;
  }
}

function wrapPreview(){
  if(typeof window.preview!=='function'||window.preview.__bbPurchaseEditWrapped)return;
  const original=window.preview;
  const wrapped=async function(id){
    currentPurchaseId=clean(id);
    const result=await original.apply(this,arguments);
    ensureEditButton();
    return result;
  };
  wrapped.__bbPurchaseEditWrapped=true;
  window.preview=wrapped;
}

async function detectAdmin(){
  try{
    const p=await rpcCall('bb_current_access_profile');
    isAdmin=p?.user?.isAdmin===true;
  }catch(_){
    isAdmin=false;
  }
  ensureEditButton();
}

function boot(){
  addStyles();
  addModal();
  wrapPreview();
  ensureEditButton();
  detectAdmin();
  setTimeout(()=>{wrapPreview();ensureEditButton()},400);
  setTimeout(()=>{wrapPreview();ensureEditButton()},1400);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.BB_PURCHASE_EDIT_BUILD='20260926-v1';
})();