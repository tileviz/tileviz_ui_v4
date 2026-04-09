// AdminScreen — Shops, Users, Pending + Inventory (#7)
import React,{useEffect,useState,useCallback} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,Modal,Pressable,Alert,ActivityIndicator,RefreshControl,TextInput,FlatList} from 'react-native';
import {Colors,Radii,Shadows} from '../config/theme';
import {Button} from '../components/Button';
import {FormInput} from '../components/FormInput';
import {RoleBadge} from '../components/RoleBadge';
import {getAdminShops,createAdminShop,getAdminUsers,createAdminUser,deactivateUser,getCatalogRequests,reviewCatalogRequest} from '../api/admin';
import {InventoryItem,UserRole} from '../types';

type AdminTab='shops'|'users'|'requests'|'inventory';

// ── Mock Inventory store (no backend endpoint yet — ready to wire) ──
const AVAIL_COLOR:Record<string,string>={in_stock:'rgba(76,183,116,0.1)',low_stock:'rgba(251,191,36,0.1)',out_of_stock:'rgba(224,82,82,0.1)'};
const AVAIL_TEXT:Record<string,string>={in_stock:'#2e7d4f',low_stock:'#b45309',out_of_stock:Colors.danger};
const AVAIL_LABEL:Record<string,string>={in_stock:'In Stock',low_stock:'Low Stock',out_of_stock:'Out of Stock'};

let mockInventory:InventoryItem[]=[
  {id:'1',name:'Carrara White (12×12)',quantity:240,price:8.5,availability:'in_stock',updatedAt:'2026-03-20'},
  {id:'2',name:'Ocean Mosaic',quantity:18,price:18,availability:'low_stock',updatedAt:'2026-03-21'},
  {id:'3',name:'Slate Grey',quantity:0,price:6,availability:'out_of_stock',updatedAt:'2026-03-19'},
  {id:'4',name:'Terracotta Clay',quantity:180,price:4.5,availability:'in_stock',updatedAt:'2026-03-22'},
];

export function AdminScreen(){
  const [tab,setTab]=useState<AdminTab>('shops');
  const [shops,setShops]=useState<any[]>([]);
  const [users,setUsers]=useState<any[]>([]);
  const [requests,setRequests]=useState<any[]>([]);
  const [inventory,setInventory]=useState<InventoryItem[]>(mockInventory);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [shopModal,setShopModal]=useState(false);
  const [userModal,setUserModal]=useState(false);
  const [invModal,setInvModal]=useState<InventoryItem|null|'new'>(null);
  const [invSearch,setInvSearch]=useState('');

  const load=useCallback(async()=>{
    try{const[s,u,r]=await Promise.all([getAdminShops(),getAdminUsers(),getCatalogRequests('pending')]);setShops(s);setUsers(u);setRequests(r);}
    catch(e:any){console.error('admin:',e?.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  async function handleDeactivate(id:string,name:string){
    Alert.alert('Deactivate',`Deactivate "${name}"?`,[
      {text:'Cancel',style:'cancel'},
      {text:'Deactivate',style:'destructive',onPress:async()=>{
        try{await deactivateUser(id);setUsers(p=>p.map(u=>u._id===id?{...u,isActive:false}:u));}
        catch(e:any){Alert.alert('Error',e?.response?.data?.message??'Failed');}
      }},
    ]);
  }

  async function handleReview(id:string,status:'approved'|'rejected'){
    try{await reviewCatalogRequest(id,status);setRequests(p=>p.filter(r=>r._id!==id));Alert.alert('Done',`Request ${status}.`);}
    catch(e:any){Alert.alert('Error',e?.response?.data?.message??'Failed');}
  }

  // Inventory CRUD (local, ready to wire to /api/inventory)
  function saveInventoryItem(item:InventoryItem){
    if(item.id==='new'||!inventory.find(i=>i.id===item.id)){
      const newItem={...item,id:Date.now().toString(),updatedAt:new Date().toISOString().substring(0,10)};
      setInventory(p=>[newItem,...p]);mockInventory=[newItem,...mockInventory];
    }else{
      setInventory(p=>p.map(i=>i.id===item.id?{...item,updatedAt:new Date().toISOString().substring(0,10)}:i));
      mockInventory=mockInventory.map(i=>i.id===item.id?item:i);
    }
    setInvModal(null);
  }
  function deleteInventoryItem(id:string){
    Alert.alert('Delete','Remove this inventory item?',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:()=>{setInventory(p=>p.filter(i=>i.id!==id));mockInventory=mockInventory.filter(i=>i.id!==id);}},
    ]);
  }

  const filteredInv=inventory.filter(i=>i.name.toLowerCase().includes(invSearch.toLowerCase()));

  const TAB_COUNTS:{[k in AdminTab]:number}={shops:shops.length,users:users.length,requests:requests.length,inventory:inventory.length};

  if(loading)return(<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator size="large" color={Colors.accent}/><Text style={{fontSize:13,color:Colors.text3}}>Loading admin panel…</Text></View>);

  return(
    <View style={{flex:1,backgroundColor:Colors.white}}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View><Text style={s.pageTitle}>Admin Panel</Text><Text style={s.pageSub}>User creation & enterprise management</Text></View>
      </View>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['shops','users','requests','inventory'] as AdminTab[]).map(t=>(
          <TouchableOpacity key={t} onPress={()=>setTab(t)} style={[s.tabBtn,tab===t&&s.tabBtnActive]}>
            <Text style={[s.tabTxt,tab===t&&{color:Colors.gold}]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            {TAB_COUNTS[t]>0&&<View style={[s.tabBadge,tab===t&&{backgroundColor:'rgba(200,169,110,0.15)'}]}><Text style={[{fontSize:10,fontWeight:'600',color:Colors.text3},tab===t&&{color:Colors.gold}]}>{TAB_COUNTS[t]}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{flex:1,backgroundColor:Colors.surface}} contentContainerStyle={{padding:16,paddingBottom:40}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={Colors.accent}/>}>

        {/* SHOPS */}
        {tab==='shops'&&(
          <>
            <Button label="+ Create Shop" onPress={()=>setShopModal(true)} variant="primary" size="sm" style={{alignSelf:'flex-end',marginBottom:12}}/>
            {shops.map((shop:any)=>(
              <View key={shop._id} style={s.rowCard}>
                <View style={[s.rowAv,{backgroundColor:Colors.primary2}]}><Text style={{fontSize:12,fontWeight:'700',color:Colors.gold}}>{shop.name.substring(0,2).toUpperCase()}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.rowName}>{shop.name}</Text>
                  <Text style={s.rowSub}>Owner: {shop.owner?.name??'—'} · {shop.salesPersons?.length??0} SPs</Text>
                </View>
                <View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:10,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface}}>
                  <Text style={{fontSize:10,fontWeight:'500',color:Colors.text2}}>{shop.plan?.charAt(0).toUpperCase()+shop.plan?.slice(1)}</Text>
                </View>
              </View>
            ))}
            {shops.length===0&&<Text style={s.emptyMsg}>No shops yet.</Text>}
          </>
        )}

        {/* USERS */}
        {tab==='users'&&(
          <>
            <Button label="+ Create User" onPress={()=>setUserModal(true)} variant="primary" size="sm" style={{alignSelf:'flex-end',marginBottom:12}}/>
            {users.map((u:any)=>(
              <View key={u._id} style={s.rowCard}>
                <View style={[s.rowAv,{backgroundColor:Colors.accent}]}><Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>{u.name.substring(0,2).toUpperCase()}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.rowName}>{u.name}</Text>
                  <Text style={s.rowSub} numberOfLines={1}>{u.email}</Text>
                </View>
                <View style={{gap:6,alignItems:'flex-end'}}>
                  <RoleBadge role={u.role as UserRole}/>
                  {u.isActive&&u.role!=='admin'&&<TouchableOpacity onPress={()=>handleDeactivate(u._id,u.name)}><Text style={{fontSize:11,color:Colors.danger}}>Deactivate</Text></TouchableOpacity>}
                  {!u.isActive&&<View style={{backgroundColor:Colors.surface2,borderRadius:6,paddingHorizontal:6,paddingVertical:2}}><Text style={{fontSize:10,color:Colors.text3}}>Inactive</Text></View>}
                </View>
              </View>
            ))}
            {users.length===0&&<Text style={s.emptyMsg}>No users found.</Text>}
          </>
        )}

        {/* PENDING REQUESTS */}
        {tab==='requests'&&(
          <>
            {requests.map((req:any)=>(
              <View key={req._id} style={[s.rowCard,{flexDirection:'column',gap:10}]}>
                <View style={{flex:1}}>
                  <Text style={s.rowName}>{req.tile?.name??'Unknown Tile'}</Text>
                  <Text style={s.rowSub}>By: {req.requestedBy?.name??'—'} · {req.tile?.category}</Text>
                  <Text style={s.rowSub}>Shop: {req.shop?.name??'—'}</Text>
                </View>
                <View style={{flexDirection:'row',gap:8}}>
                  <Button label="✓ Approve" onPress={()=>handleReview(req._id,'approved')} variant="accent" size="sm" style={{flex:1}}/>
                  <Button label="✕ Reject"  onPress={()=>handleReview(req._id,'rejected')} variant="danger"  size="sm" style={{flex:1}}/>
                </View>
              </View>
            ))}
            {requests.length===0&&<View style={{alignItems:'center',paddingTop:40}}><Text style={{fontSize:40,marginBottom:8}}>✅</Text><Text style={s.emptyMsg}>No pending requests.</Text></View>}
          </>
        )}

        {/* INVENTORY (#7) */}
        {tab==='inventory'&&(
          <>
            <View style={{flexDirection:'row',gap:8,marginBottom:12}}>
              <View style={[s.searchBox,{flex:1}]}>
                <Text style={{fontSize:13,opacity:0.4}}>🔍</Text>
                <TextInput style={{flex:1,fontSize:12,color:Colors.text1}} placeholder="Search inventory…" placeholderTextColor={Colors.text3} value={invSearch} onChangeText={setInvSearch}/>
              </View>
              <Button label="+ Add" onPress={()=>setInvModal('new')} variant="primary" size="sm"/>
            </View>
            {filteredInv.map(item=>(
              <View key={item.id} style={s.rowCard}>
                <View style={{flex:1}}>
                  <Text style={s.rowName}>{item.name}</Text>
                  <Text style={s.rowSub}>Qty: {item.quantity} · ${item.price}/sq ft</Text>
                  <Text style={s.rowSub}>Updated: {item.updatedAt}</Text>
                </View>
                <View style={{gap:6,alignItems:'flex-end'}}>
                  <View style={{backgroundColor:AVAIL_COLOR[item.availability],borderRadius:10,paddingHorizontal:8,paddingVertical:3}}>
                    <Text style={{fontSize:10,fontWeight:'600',color:AVAIL_TEXT[item.availability]}}>{AVAIL_LABEL[item.availability]}</Text>
                  </View>
                  <View style={{flexDirection:'row',gap:6}}>
                    <TouchableOpacity onPress={()=>setInvModal(item)} style={s.iconBtn}><Text style={{fontSize:12}}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={()=>deleteInventoryItem(item.id)} style={[s.iconBtn,{backgroundColor:'rgba(224,82,82,0.1)'}]}><Text style={{fontSize:12}}>🗑</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            {filteredInv.length===0&&<Text style={s.emptyMsg}>No inventory items found.</Text>}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateShopModal visible={shopModal} onClose={()=>setShopModal(false)} onCreated={load}/>
      <CreateUserModal visible={userModal} onClose={()=>setUserModal(false)} onCreated={load} shops={shops}/>
      <InventoryModal visible={!!invModal} item={invModal==='new'?null:invModal} onClose={()=>setInvModal(null)} onSave={saveInventoryItem}/>
    </View>
  );
}

// ── Create Shop Modal ────────────────────────────────────────
function CreateShopModal({visible,onClose,onCreated}:{visible:boolean;onClose:()=>void;onCreated:()=>void}){
  const[name,setName]=useState('');const[email,setEmail]=useState('');const[plan,setPlan]=useState<'starter'|'pro'|'enterprise'>('starter');const[loading,setLoading]=useState(false);const[err,setErr]=useState('');
  async function handleCreate(){if(!name.trim()){setErr('Shop name is required');return;}setLoading(true);setErr('');try{const res=await createAdminShop({name:name.trim(),email,plan});if(res.ownerCredentials)Alert.alert('Shop Created',`Owner:\nEmail: ${res.ownerCredentials.email}\nPwd: ${res.ownerCredentials.password}`);onCreated();onClose();setName('');setEmail('');}catch(e:any){setErr(e?.response?.data?.message??'Failed');}finally{setLoading(false);}}
  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.card} onPress={()=>{}}>
          <View style={ms.header}><Text style={ms.title}>Create New Shop</Text><TouchableOpacity onPress={onClose}><Text style={{fontSize:16,color:Colors.text3}}>✕</Text></TouchableOpacity></View>
          <View style={ms.body}>
            <FormInput label="Shop Name *" placeholder="e.g. Marble Palace" value={name} onChangeText={setName}/>
            <FormInput label="Email" placeholder="shop@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}/>
            <Text style={{fontSize:12,fontWeight:'500',color:Colors.text2,marginBottom:6}}>Plan</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
              {(['starter','pro','enterprise'] as const).map(p=>(
                <TouchableOpacity key={p} onPress={()=>setPlan(p)} style={[{flex:1,paddingVertical:8,borderRadius:8,borderWidth:1,alignItems:'center',borderColor:plan===p?Colors.accent:Colors.border,backgroundColor:plan===p?`${Colors.accent}18`:Colors.surface}]}>
                  <Text style={{fontSize:12,fontWeight:'500',color:plan===p?Colors.accent:Colors.text2}}>{p.charAt(0).toUpperCase()+p.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {err?<Text style={{fontSize:12,color:Colors.danger,marginBottom:10}}>{err}</Text>:null}
            <Button label="Create Shop" onPress={handleCreate} loading={loading} fullWidth/>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Create User Modal ────────────────────────────────────────
function CreateUserModal({visible,onClose,onCreated,shops}:{visible:boolean;onClose:()=>void;onCreated:()=>void;shops:any[]}){
  const[name,setName]=useState('');const[role,setRole]=useState<'shop_owner'|'sales_person'>('shop_owner');const[shopId,setShopId]=useState('');const[loading,setLoading]=useState(false);const[err,setErr]=useState('');
  async function handleCreate(){if(!name.trim()){setErr('Name required');return;}if(role==='sales_person'&&!shopId){setErr('Select a shop for sales person');return;}setLoading(true);setErr('');try{const res=await createAdminUser({name:name.trim(),role,shopId:shopId||undefined});Alert.alert('User Created',`Email: ${res.generatedCredentials.email}\nPwd: ${res.generatedCredentials.password}`);onCreated();onClose();setName('');setShopId('');}catch(e:any){setErr(e?.response?.data?.message??'Failed');}finally{setLoading(false);}}
  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.card} onPress={()=>{}}>
          <View style={ms.header}><Text style={ms.title}>Create New User</Text><TouchableOpacity onPress={onClose}><Text style={{fontSize:16,color:Colors.text3}}>✕</Text></TouchableOpacity></View>
          <View style={ms.body}>
            <FormInput label="Full Name *" placeholder="User's name" value={name} onChangeText={setName}/>
            <Text style={{fontSize:12,fontWeight:'500',color:Colors.text2,marginBottom:6}}>Role</Text>
            <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
              {(['shop_owner','sales_person'] as const).map(r=>(
                <TouchableOpacity key={r} onPress={()=>setRole(r)} style={[{flex:1,paddingVertical:8,borderRadius:8,borderWidth:1,alignItems:'center',borderColor:role===r?Colors.accent:Colors.border,backgroundColor:role===r?`${Colors.accent}18`:Colors.surface}]}>
                  <Text style={{fontSize:12,fontWeight:'500',color:role===r?Colors.accent:Colors.text2}}>{r==='shop_owner'?'Shop Owner':'Sales Person'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {role==='sales_person'&&shops.length>0&&(
              <><Text style={{fontSize:12,fontWeight:'500',color:Colors.text2,marginBottom:6}}>Assign to Shop *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                <View style={{flexDirection:'row',gap:6}}>
                  {shops.map((sh:any)=>(
                    <TouchableOpacity key={sh._id} onPress={()=>setShopId(sh._id)} style={[{paddingHorizontal:12,paddingVertical:7,borderRadius:8,borderWidth:1,borderColor:shopId===sh._id?Colors.accent:Colors.border,backgroundColor:shopId===sh._id?`${Colors.accent}18`:Colors.surface}]}>
                      <Text style={{fontSize:12,fontWeight:'500',color:shopId===sh._id?Colors.accent:Colors.text2}}>{sh.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView></>
            )}
            {err?<Text style={{fontSize:12,color:Colors.danger,marginBottom:10}}>{err}</Text>:null}
            <Button label="Create User" onPress={handleCreate} loading={loading} fullWidth/>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Inventory Modal (#7) ─────────────────────────────────────
function InventoryModal({visible,item,onClose,onSave}:{visible:boolean;item:InventoryItem|null;onClose:()=>void;onSave:(i:InventoryItem)=>void}){
  const[name,setName]=useState('');const[qty,setQty]=useState('');const[price,setPrice]=useState('');const[avail,setAvail]=useState<InventoryItem['availability']>('in_stock');const[err,setErr]=useState('');
  useEffect(()=>{if(item){setName(item.name);setQty(String(item.quantity));setPrice(String(item.price));setAvail(item.availability);}else{setName('');setQty('');setPrice('');setAvail('in_stock');}setErr('');},[item,visible]);
  function handleSave(){if(!name.trim()){setErr('Name required');return;}const q=parseInt(qty)||0;const p=parseFloat(price)||0;onSave({id:item?.id??'new',name:name.trim(),quantity:q,price:p,availability:q===0?'out_of_stock':q<20?'low_stock':avail,updatedAt:new Date().toISOString().substring(0,10)});}
  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.card} onPress={()=>{}}>
          <View style={ms.header}><Text style={ms.title}>{item?'Edit Inventory':'Add Inventory'}</Text><TouchableOpacity onPress={onClose}><Text style={{fontSize:16,color:Colors.text3}}>✕</Text></TouchableOpacity></View>
          <View style={ms.body}>
            <FormInput label="Item Name *" placeholder="e.g. Carrara White (12×12)" value={name} onChangeText={setName}/>
            <View style={{flexDirection:'row',gap:10}}>
              <FormInput label="Quantity" placeholder="0" keyboardType="numeric" value={qty} onChangeText={setQty} containerStyle={{flex:1}}/>
              <FormInput label="Price/sq ft ($)" placeholder="0.00" keyboardType="numeric" value={price} onChangeText={setPrice} containerStyle={{flex:1}}/>
            </View>
            <Text style={{fontSize:12,fontWeight:'500',color:Colors.text2,marginBottom:6}}>Availability</Text>
            <View style={{flexDirection:'row',gap:6,marginBottom:14}}>
              {(['in_stock','low_stock','out_of_stock'] as const).map(a=>(
                <TouchableOpacity key={a} onPress={()=>setAvail(a)} style={[{flex:1,paddingVertical:7,borderRadius:8,borderWidth:1,alignItems:'center',borderColor:avail===a?Colors.accent:Colors.border,backgroundColor:avail===a?`${Colors.accent}18`:Colors.surface}]}>
                  <Text style={{fontSize:10,fontWeight:'600',color:avail===a?Colors.accent:Colors.text2}}>{AVAIL_LABEL[a]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {err?<Text style={{fontSize:12,color:Colors.danger,marginBottom:10}}>{err}</Text>:null}
            <Button label={item?'Update Item':'Add Item'} onPress={handleSave} fullWidth/>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s=StyleSheet.create({
  pageHeader:{padding:16,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  pageTitle:{fontSize:20,fontFamily:'serif',fontWeight:'600',color:Colors.text1},pageSub:{fontSize:12,color:Colors.text3,marginTop:2},
  tabBar:{flexDirection:'row',backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  tabBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingVertical:12,borderBottomWidth:2,borderBottomColor:'transparent'},
  tabBtnActive:{borderBottomColor:Colors.gold},tabTxt:{fontSize:12,fontWeight:'500',color:Colors.text2},
  tabBadge:{backgroundColor:Colors.surface2,borderRadius:10,paddingHorizontal:5,paddingVertical:1},
  rowCard:{backgroundColor:Colors.white,borderRadius:Radii.lg,padding:12,marginBottom:8,borderWidth:1,borderColor:Colors.border,flexDirection:'row',alignItems:'center',gap:10,...Shadows.card},
  rowAv:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  rowName:{fontSize:13,fontWeight:'500',color:Colors.text1},rowSub:{fontSize:11,color:Colors.text3,marginTop:1},
  emptyMsg:{fontSize:13,color:Colors.text3,textAlign:'center',paddingVertical:30},
  searchBox:{flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:Colors.border,borderRadius:Radii.md,paddingHorizontal:11,paddingVertical:7,backgroundColor:Colors.surface},
  iconBtn:{width:32,height:32,borderRadius:8,backgroundColor:Colors.surface2,borderWidth:1,borderColor:Colors.border,alignItems:'center',justifyContent:'center'},
});
const ms=StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(10,10,20,0.55)',alignItems:'center',justifyContent:'center',padding:20},
  card:{backgroundColor:Colors.white,borderRadius:14,width:'100%',maxWidth:420,borderWidth:1,borderColor:Colors.border,overflow:'hidden',...Shadows.modal},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:14,fontWeight:'600',color:Colors.text1},
  body:{padding:18},
});
