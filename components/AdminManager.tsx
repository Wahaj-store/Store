'use client';
import {useEffect,useState} from 'react';
import {GripVertical,Trash2,Upload,Plus,Save,Image as ImageIcon,Search,ChevronLeft} from 'lucide-react';
import MediaPicker from './MediaPicker';

const tabs:any[]=[
  ['products','المنتجات'],
  ['categories','التصنيفات'],
  ['offers','العروض'],
  ['coupons','الكوبونات'],
  ['payments','الدفع'],
  ['shipping','الشحن'],
  ['homepage','Homepage Builder'],
  ['media','مكتبة الوسائط'],
  ['reviews','المراجعات'],
  ['customers','العملاء'],
  ['users','المستخدمون والصلاحيات'],
  ['orders','الطلبات'],
  ['analytics','التحليلات'],
  ['features','المزايا'],
  ['redirects','إعادة التوجيه'],
  ['relations','ترشيحات المنتجات'],
  ['gift-cards','بطاقات الهدايا'],
  ['security','الأمان والسجل'],
  ['contact','رسائل العملاء'],
  ['settings','الإعدادات']
];

const emptyProduct:any={name:'',slug:'',description:'',price:'',comparePrice:'',stock:0,sku:'',categoryId:'',status:'DRAFT',material:'',careInstructions:'',seoTitle:'',seoDescription:'',images:[],variants:[]};

async function api(url:string,method='GET',body?:any){
  const r=await fetch(url,{method,headers:body instanceof FormData?undefined:body?{'Content-Type':'application/json'}:undefined,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'حدث خطأ');
  return j;
}

export default function AdminManager(){
  const[tab,setTab]=useState('products');
  const[data,setData]=useState<any[]>([]);
  const[cats,setCats]=useState<any[]>([]);
  const[editing,setEditing]=useState<any>(null);
  const[msg,setMsg]=useState('');
  const[loading,setLoading]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const map:any={
        products:'/api/admin/products',
        categories:'/api/admin/categories',
        offers:'/api/admin/offers',
        coupons:'/api/admin/coupons',
        payments:'/api/admin/payments',
        shipping:'/api/admin/shipping',
        homepage:'/api/admin/homepage',
        features:'/api/admin/features',
        redirects:'/api/admin/redirects',
        relations:'/api/admin/relations',
        'gift-cards':'/api/admin/gift-cards',
        security:'/api/admin/security',
        media:'/api/admin/media',
        reviews:'/api/admin/reviews',
        customers:'/api/admin/customers',
        users:'/api/admin/users',
        orders:'/api/admin/orders',
        analytics:'/api/admin/analytics',
        contact:'/api/admin/contact',
        settings:'/api/admin/config'
      };
      const x=await api(map[tab]);
      setData(Array.isArray(x)?x:[x]);
    }catch(e:any){
      setMsg(e.message);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
    api('/api/admin/categories').then(setCats).catch(()=>{});
  },[tab]);

  async function save(v:any){
    try{
      const endpoint=tab==='products'?(v.id?`/api/admin/products/${v.id}`:'/api/admin/products'):`/api/admin/${tab}`;
      await api(endpoint,v.id?'PUT':'POST',v);
      setMsg('تم الحفظ بنجاح');
      setEditing(null);
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  }

  async function del(id:string){
    if(!confirm('تأكيد الحذف؟'))return;
    try{
      if(tab==='contact'){
        await api(`/api/admin/contact?id=${id}`,'DELETE');
      }else{
        await api(tab==='products'?`/api/admin/products/${id}`:`/api/admin/${tab}`,'DELETE',{id});
      }
      setMsg('تم الحذف');
      load();
    }catch(e:any){
      setMsg(e.message);
    }
  }

  async function upload(file:File){
    const fd=new FormData();
    fd.append('file',file);
    const j=await api('/api/admin/media','POST',fd);
    return j.url;
  }

  async function reorder(items:any[],endpoint:string){
    const ordered=items.map((x,i)=>({...x,sortOrder:i}));
    setData(ordered);
    await api(endpoint,'PUT',{reorder:true,items:ordered});
  }

  return (
    <div className="mt-7 grid gap-6 lg:grid-cols-[230px_1fr]" dir="rtl">
      <aside className="lux-card admin-nav p-2 h-fit lg:sticky lg:top-5">
        {tabs.map(([k,t])=>(
          <button 
            key={k} 
            onClick={()=>{setTab(k);setEditing(null);setMsg('')}} 
            className={`w-full rounded-md p-3 text-start ${tab===k?'bg-[#C8A96B] text-[#171513]':'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </aside>
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{tabs.find(x=>x[0]===tab)?.[1]}</h2>
            <p className="muted text-sm mt-1">تعديل مباشر لبيانات المتجر من قاعدة البيانات.</p>
          </div>
          {!editing&&['products','categories','offers','coupons','shipping','homepage','gift-cards','relations'].includes(tab)&&(
            <button className="btn btn-gold" onClick={()=>setEditing(tab==='products'?emptyProduct:{})}>
              <Plus size={17}/> إضافة
            </button>
          )}
        </div>
        {msg&&<div className="mt-4 rounded-md border border-[#C8A96B]/40 bg-[#C8A96B]/10 p-3 text-sm">{msg}</div>}
        {loading?(
          <div className="lux-card mt-6 p-10 text-center muted">جارٍ التحميل…</div>
        ):editing?(
          <Editor tab={tab} value={editing} cats={cats} onCancel={()=>setEditing(null)} onSave={save} upload={upload}/>
        ):(
          <Content tab={tab} data={data} onEdit={setEditing} onDelete={del} onRefresh={load} onReorder={reorder}/>
        )}
      </section>
    </div>
  );
}

function Editor({tab,value,cats,onCancel,onSave,upload}:any){
  const[v,setV]=useState({...value,images:value.images||[],variants:value.variants||[]});
  const set=(k:string,x:any)=>setV((p:any)=>({...p,[k]:x}));
  const addVar=()=>set('variants',[...v.variants,{name:'اللون',value:'',stock:0,price:''}]);
  
  if(tab==='settings')return <div className="lux-card mt-6 p-5"><Settings initial={value[0]||{}}/><button className="btn mt-4" onClick={onCancel}>عودة</button></div>;
  if(tab==='payments')return <div className="lux-card mt-6 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="اسم الطريقة" value={v.label} onChange={(x:any)=>set('label',x)}/><Field label="ترتيب الظهور" value={v.displayOrder||0} onChange={(x:any)=>set('displayOrder',x)} type="number"/><Field label="اسم الحساب" value={v.accountName||''} onChange={(x:any)=>set('accountName',x)}/><Field label="رقم/معرف الحساب" value={v.accountNumber||''} onChange={(x:any)=>set('accountNumber',x)}/><label className="md:col-span-2">الوصف<textarea className="input mt-1" value={v.description||''} onChange={e=>set('description',e.target.value)}/></label><label className="md:col-span-2">تعليمات الدفع<textarea className="input mt-1 min-h-24" value={v.instructions||''} onChange={e=>set('instructions',e.target.value)}/></label><label className="flex items-center gap-2"><input type="checkbox" checked={!!v.enabled} onChange={e=>set('enabled',e.target.checked)}/> مفعلة</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!v.proofRequired} onChange={e=>set('proofRequired',e.target.checked)}/> طلب إثبات دفع</label></div><div className="mt-5 flex gap-2"><button className="btn btn-gold" onClick={()=>onSave(v)}><Save size={17}/> حفظ</button><button className="btn" onClick={onCancel}>إلغاء</button></div></div>;
  
  const common:any={relations:[['type','نوع العلاقة'],['fromProductId','المنتج الأساسي'],['toProductId','المنتج المقترح'],['sortOrder','الترتيب']], 'gift-cards':[['code','كود البطاقة'],['amount','القيمة'],['expiresAt','تاريخ الانتهاء']],categories:[['name','اسم التصنيف'],['slug','Slug'],['description','الوصف'],['sortOrder','الترتيب']],offers:[['name','اسم العرض'],['type','نوع العرض'],['discountValue','قيمة الخصم'],['startsAt','يبدأ'],['endsAt','ينتهي']],coupons:[['code','الكود'],['value','قيمة الخصم'],['minOrder','الحد الأدنى'],['maxUses','عدد الاستخدامات']],shipping:[['governorate','المحافظة'],['city','المدينة'],['price','سعر الشحن'],['freeAbove','مجاني فوق']],homepage:[['type','نوع القسم'],['title','العنوان'],['subtitle','الوصف'],['ctaText','نص الزر'],['ctaUrl','رابط الزر'],['sortOrder','الترتيب']],redirects:[['fromPath','المسار القديم'],['toPath','المسار الجديد'],['statusCode','كود التحويل']]};
  
  if(tab==='offers')return <div className="lux-card mt-6 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="اسم العرض" value={v.name||''} onChange={(x:any)=>set('name',x)}/><label>نوع العرض<select className="input mt-1" value={v.type||'SEASONAL'} onChange={e=>set('type',e.target.value)}>{['FLASH_SALE','BUY_X_GET_Y','FREE_SHIPPING','FIRST_ORDER','SEASONAL'].map((x:any)=><option key={x}>{x}</option>)}</select></label><Field label="قيمة الخصم" value={v.discountValue||''} onChange={(x:any)=>set('discountValue',x)} type="number"/><Field label="يبدأ" value={v.startsAt||''} onChange={(x:any)=>set('startsAt',x)}/><Field label="ينتهي" value={v.endsAt||''} onChange={(x:any)=>set('endsAt',x)}/></div><div className="mt-5 flex gap-2"><button className="btn btn-gold" onClick={()=>onSave(v)}><Save size={17}/> حفظ</button><button className="btn" onClick={onCancel}>إلغاء</button></div></div>;
  if(tab==='redirects')return <div className="lux-card mt-6 p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="المسار القديم" value={v.fromPath||''} onChange={(x:any)=>set('fromPath',x)}/><Field label="المسار الجديد" value={v.toPath||''} onChange={(x:any)=>set('toPath',x)}/><Field label="كود التحويل" value={v.statusCode||301} onChange={(x:any)=>set('statusCode',x)} type="number"/></div><div className="mt-5 flex gap-2"><button className="btn btn-gold" onClick={()=>onSave(v)}><Save size={17}/> حفظ</button><button className="btn" onClick={onCancel}>إلغاء</button></div></div>;
  
  return <div className="lux-card mt-6 p-5"><div className="grid gap-4 md:grid-cols-2">{tab==='products'?<><Field label="اسم المنتج" value={v.name} onChange={(x:any)=>set('name',x)}/><Field label="Slug" value={v.slug} onChange={(x:any)=>set('slug',x)}/><Field label="SKU" value={v.sku} onChange={(x:any)=>set('sku',x)}/><Field label="السعر" value={v.price} onChange={(x:any)=>set('price',x)} type="number"/><Field label="السعر قبل الخصم" value={v.comparePrice} onChange={(x:any)=>set('comparePrice',x)} type="number"/><Field label="المخزون" value={v.stock} onChange={(x:any)=>set('stock',x)} type="number"/><label>التصنيف<select className="input mt-1" value={v.categoryId} onChange={e=>set('categoryId',e.target.value)}><option value="">اختر التصنيف</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>الحالة<select className="input mt-1" value={v.status} onChange={e=>set('status',e.target.value)}>{['DRAFT','PUBLISHED','HIDDEN','ARCHIVED'].map((x:any)=><option key={x}>{x}</option>)}</select></label><Field label="الخامة" value={v.material} onChange={(x:any)=>set('material',x)}/><Field label="تعليمات العناية" value={v.careInstructions} onChange={(x:any)=>set('careInstructions',x)}/><Field label="SEO Title" value={v.seoTitle} onChange={(x:any)=>set('seoTitle',x)}/><Field label="SEO Description" value={v.seoDescription} onChange={(x:any)=>set('seoDescription',x)}/><div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">{[['featured','مميز'],['newArrival','وصل حديثًا'],['bestSeller','الأكثر مبيعًا']].map(([k,l])=><label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!v[k]} onChange={e=>set(k,e.target.checked)}/>{l}</label>)}</div><label className="md:col-span-2">الوصف<textarea className="input mt-1 min-h-28" value={v.description||''} onChange={e=>set('description',e.target.value)}/></label><div className="md:col-span-2"><p className="mb-2 text-sm font-semibold">صور المنتج</p><div className="flex flex-wrap gap-3">{v.images.map((im:any,i:number)=><div key={i} className="relative"><img src={im.url} className="h-24 w-24 rounded-md object-cover"/><button className="absolute -top-2 -end-2 rounded-full bg-red-500 p-1 text-white" onClick={()=>set('images',v.images.filter((_:any,j:number)=>j!==i))}>×</button></div>)}<div className="flex items-center gap-2"><MediaPicker multiple value={v.images.map((x:any)=>x.url)} onChange={(urls:any)=>set('images',urls.map((url:string)=>({url,alt:v.name})))} /></div></div></div><div className="md:col-span-2"><div className="flex items-center justify-between"><b>Variants / الخيارات</b><button className="btn" onClick={addVar}>+ إضافة خيار</button></div>{v.variants.map((x:any,i:number)=><div className="mt-2 grid gap-2 md:grid-cols-5" key={i}><input className="input" placeholder="النوع" value={x.name} onChange={e=>{const a=[...v.variants];a[i].name=e.target.value;set('variants',a)}}/><input className="input" placeholder="القيمة" value={x.value} onChange={e=>{const a=[...v.variants];a[i].value=e.target.value;set('variants',a)}}/><input className="input" type="number" placeholder="المخزون" value={x.stock} onChange={e=>{const a=[...v.variants];a[i].stock=Number(e.target.value);set('variants',a)}}/><input className="input" type="number" placeholder="سعر خاص" value={x.price??""} onChange={e=>{const a=[...v.variants];a[i].price=e.target.value===''?null:Number(e.target.value);set('variants',a)}}/><input className="input" placeholder="SKU" value={x.sku||""} onChange={e=>{const a=[...v.variants];a[i].sku=e.target.value;set('variants',a)}}/><button className="btn border-red-400 text-red-500" onClick={()=>set('variants',v.variants.filter((_:any,j:number)=>j!==i))}>حذف</button></div>)}</div></>:common[tab]?.map((f:any)=><Field key={f[0]} label={f[1]} value={v[f[0]]??''} onChange={(x:any)=>set(f[0],x)}/TheField>)}</div>{tab==='categories'&&<div className="mt-4"><p className="text-sm mb-2">صورة التصنيف</p><MediaPicker value={v.imageUrl||""} onChange={(url:any)=>set('imageUrl',url)}/></div>}{tab==='offers'&&<Select label="النوع" value={v.type||'FLASH_SALE'} options={['FLASH_SALE','BUY_X_GET_Y','FREE_SHIPPING','FIRST_ORDER','SEASONAL']} onChange={(x:any)=>set('type',x)}/>} {tab==='coupons'&&<Select label="النوع" value={v.type||'PERCENTAGE'} options={['PERCENTAGE','FIXED']} onChange={(x:any)=>set('type',x)}/>} {tab==='homepage'&&<><Select label="الظهور" value={String(v.visible!==false)} options={['true','false']} onChange={(x:any)=>set('visible',x==='true')}/><div className="mt-4"><p className="text-sm mb-2">صورة القسم</p><MediaPicker value={v.imageUrl||""} onChange={(url:any)=>set('imageUrl',url)}/></div></>}<div className="mt-5 flex gap-2"><button className="btn btn-gold" onClick={()=>onSave(v)}><Save size={17}/> حفظ</button><button className="btn" onClick={onCancel}>إلغاء</button></div></div></div>;
}

function Field({label,value,onChange,type='text'}:any){return <label className="text-sm">{label}<input className="input mt-1" type={type} value={value??''} onChange={e=>onChange(e.target.value)}/></label>}
function Select({label,value,options,onChange}:any){return <label className="mt-4 block text-sm">{label}<select className="input mt-1" value={value} onChange={e=>onChange(e.target.value)}>{options.map((x:string)=><option key={x}>{x}</option>)}</select></label>}

function Content({tab,data,onEdit,onDelete,onRefresh,onReorder}:any){
  if(tab==='analytics')return <Analytics data={data[0]||{}}/>;
  if(tab==='media')return <Media data={data} onDelete={onDelete} onRefresh={onRefresh}/>;
  
  if(tab==='contact')return (
    <div className="mt-6 space-y-4">
      {data.map((msg:any)=>(
        <div key={msg.id} className="lux-card p-5 space-y-3">
          <div className="flex flex-wrap justify-between items-start gap-4 border-b pb-3">
            <div>
              <b className="text-base text-gray-900">{msg.name}</b>
              <div className="flex items-center gap-3 text-xs muted mt-1">
                <span dir="ltr">📞 {msg.phone}</span>
                <span>•</span>
                <span>{new Date(msg.createdAt).toLocaleString('ar-EG')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs bg-[#C8A96B]/10 text-[#C8A96B] font-medium">
                {msg.subject || 'استفسار عام'}
              </span>
              <button 
                className="btn border-red-400 text-red-500" 
                onClick={()=>onDelete(msg.id)}
                title="حذف الرسالة"
              >
                <Trash2 size={16}/>
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-700 bg-black/5 dark:bg-white/5 p-3 rounded-md leading-relaxed whitespace-pre-wrap">
            {msg.message}
          </p>
          <div className="flex justify-end">
            <a 
              href={`https://wa.me/${msg.phone}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-gold text-xs"
            >
              الرد عبر واتساب مباشرة
            </a>
          </div>
        </div>
      ))}
      {!data.length&&<div className="lux-card p-10 text-center muted">لا توجد رسائل واردة حتى الآن.</div>}
    </div>
  );

  if(tab==='payments')return <div className="mt-6 grid gap-3">{data.map((x:any)=><div className="lux-card p-4" key={x.method}><div className="flex flex-wrap items-center justify-between gap-3"><div><b>{x.label}</b><p className="muted text-xs">{x.description}</p></div><div className="flex gap-2"><button className={`btn ${x.enabled?'btn-gold':''}`} onClick={async()=>{await api('/api/admin/payments','PUT',{...x,enabled:!x.enabled});onRefresh()}}>{x.enabled?'مفعل':'متوقف'}</button><button className="btn" onClick={()=>onEdit(x)}>إدارة</button></div></div><p className="mt-3 text-xs muted">{x.accountNumber||'لم يتم ضبط الحساب'} {x.proofRequired?'• إثبات الدفع مطلوب':''}</p></div>)}</div>;
  if(tab==='features')return <div className="mt-6 grid gap-3">{data.map((x:any)=><div className="lux-card p-4 flex items-center justify-between" key={x.id}><div><b>{x.key}</b><p className="muted text-xs">{x.description||'ميزة قابلة للتفعيل'}</p></div><button className={`btn ${x.enabled?'btn-gold':''}`} onClick={async()=>{await api('/api/admin/features','PUT',{key:x.key,enabled:!x.enabled});onRefresh()}}>{x.enabled?'مفعل':'متوقف'}</button></div>)}</div>;
  if(tab==='security')return <div className="mt-6 space-y-2">{(data[0]?.logs||[]).map((x:any)=><div className="lux-card p-3" key={x.id}><b>{x.action}</b><span className="muted text-xs mr-3">{x.entity}</span><div className="muted text-xs mt-1">{new Date(x.createdAt).toLocaleString('ar-EG')}</div></div>)}</div>;
  if(tab==='reviews')return <Reviews data={data} onRefresh={onRefresh}/>;
  if(tab==='customers')return <Customers data={data}/>;
  if(tab==='users')return <div className="mt-6 space-y-2">{data.map((x:any)=><div className="lux-card p-4 flex flex-wrap items-center gap-3" key={x.id}><div className="flex-1"><b>{x.name||x.email}</b><p className="muted text-xs">{x.email}</p></div><select className="input max-w-48" value={x.role} onChange={async e=>{await api('/api/admin/users','PUT',{id:x.id,role:e.target.value,active:x.active});onRefresh()}}>{['OWNER','ADMIN','MANAGER','EDITOR','ORDER_MANAGER','VIEWER'].map(r=><option key={r}>{r}</option>)}</select><button className={`btn ${x.active?'btn-gold':''}`} onClick={async()=>{await api('/api/admin/users','PUT',{id:x.id,role:x.role,active:!x.active});onRefresh()}}>{x.active?'نشط':'موقوف'}</button></div>)}</div>;
  if(tab==='orders')return <Orders data={data} onRefresh={onRefresh}/>;
  if(tab==='homepage')return <Sortable data={data} onEdit={onEdit} onDelete={onDelete} onReorder={onReorder}/>;
  
  return <div className="mt-6 space-y-2">{data.map((x:any)=><div className="lux-card p-4 flex items-center justify-between gap-3" key={x.id}><div><b>{x.name||x.title||x.code||x.governorate||x.type}</b><p className="muted text-xs mt-1">{tab==='products'?`${x.sku||''} • ${Number(x.price||0).toLocaleString('ar-EG')} ج.م • مخزون ${x.stock}`:tab==='categories'?x.slug:tab==='coupons'?`${x.type} • ${x.value}`:''}</p></div><div className="flex gap-2"><button className="btn" onClick={()=>onEdit(x)}>تعديل</button><button className="btn border-red-400 text-red-500" onClick={()=>onDelete(x.id)}><Trash2 size={16}/></button></div></div>)}{!data.length&&<div className="lux-card p-10 text-center muted">لا توجد بيانات.</div>}</div>;
}

function Sortable({data,onEdit,onDelete,onReorder}:any){
  const[items,setItems]=useState(data);
  useEffect(()=>setItems(data),[data]);
  const[drag,setDrag]=useState<number|null>(null);
  return <div className="mt-6 space-y-2">{items.map((x:any,i:number)=><div key={x.id} draggable onDragStart={()=>setDrag(i)} onDragOver={e=>e.preventDefault()} onDrop={async()=>{if(drag===null||drag===i)return;const a=[...items];const[m]=a.splice(drag,1);a.splice(i,0,m);setDrag(null);await onReorder(a,'/api/admin/homepage')}} className="lux-card flex items-center gap-3 p-4 cursor-move"><GripVertical className="muted"/><div className="flex-1"><b>{x.title||x.type}</b><p className="muted text-xs">{x.visible?'ظاهر':'مخفي'} • ترتيب {i+1}</p></div><button className="btn" onClick={()=>onEdit(x)}>تعديل</button><button className="btn border-red-400 text-red-500" onClick={()=>onDelete(x.id)}><Trash2 size={16}/></button></div>)}</div>;
}

function Media({data,onDelete,onRefresh}:any){
  const[busy,setBusy]=useState(false);
  async function upload(f:File){
    setBusy(true);
    try{
      const fd=new FormData();
      fd.append('file',f);
      await api('/api/admin/media','POST',fd);
      onRefresh();
    }catch(e:any){
      alert(e.message);
    }finally{
      setBusy(false);
    }
  }
  return <div><label className="btn btn-gold mt-6 cursor-pointer"><Upload size={17}/> {busy?'جارٍ الرفع…':'رفع صورة'}<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></label><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{data.map((x:any)=><div key={x.id} className="lux-card overflow-hidden"><img src={x.url} className="aspect-square w-full object-cover"/><div className="p-3"><p className="truncate text-sm">{x.name}</p><button className="btn mt-2 w-full border-red-400 text-red-500" onClick={()=>onDelete(x.id)}>حذف</button></div></div>)}{!data.length&&<div className="lux-card col-span-full p-10 text-center muted">لا توجد وسائط.</div>}</div></div>;
}

function Reviews({data,onRefresh}:any){
  return <div className="mt-6 space-y-2">{data.map((x:any)=><div className="lux-card p-4 flex flex-wrap items-center gap-4" key={x.id}><div className="flex-1"><b>{x.customer?.name||'عميل'} — {x.product?.name}</b><p className="text-sm">{'★'.repeat(x.rating)} <span className="muted">{x.text||''}</span></p></div><button className={`btn ${x.approved?'btn-gold':''}`} onClick={async()=>{await api('/api/admin/reviews','PUT',{id:x.id,approved:!x.approved});onRefresh()}}>{x.approved?'معتمد':'معلق'}</button></div>)}</div>;
}
