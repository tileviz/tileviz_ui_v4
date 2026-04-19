// AdminScreen — Shops, Users (#7 - cleaned up)
import React,{useEffect,useState,useCallback} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,Modal,Pressable,ActivityIndicator,RefreshControl,FlatList,useWindowDimensions} from 'react-native';
import {Colors,Radii,Shadows} from '../config/theme';
import {Button} from '../components/Button';
import {FormInput} from '../components/FormInput';
import {RoleBadge} from '../components/RoleBadge';
import {getAdminShops,createAdminShop,getAdminUsers,createAdminUser,deactivateUser,deleteUserPermanent} from '../api/admin';
import {UserRole} from '../types';
import {showConfirm,showAlert,showError} from '../utils/alert';

type AdminTab='shops'|'users';

export function AdminScreen(){
  const {width} = useWindowDimensions();
  const [tab,setTab]=useState<AdminTab>('shops');
  const [shops,setShops]=useState<any[]>([]);
  const [users,setUsers]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [shopModal,setShopModal]=useState(false);
  const [userModal,setUserModal]=useState(false);

  const numCols = width > 1200 ? 4 : width > 800 ? 3 : width > 500 ? 2 : 1;

  const load=useCallback(async()=>{
    try{const[s,u]=await Promise.all([getAdminShops(),getAdminUsers()]);setShops(s);setUsers(u);}
    catch(e:any){console.error('admin:',e?.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  async function handleDeactivate(id:string,name:string){
    showConfirm(
      'Deactivate User',
      `Are you sure you want to deactivate "${name}"?\n\nThis will log them out and prevent them from accessing the system.`,
      async()=>{
        try{
          console.log('Deactivating user:', id, name);
          const result = await deactivateUser(id);
          console.log('Deactivation result:', result);
          setUsers(p=>p.map(u=>u._id===id?{...u,isActive:false}:u));
          showAlert('Success','User deactivated successfully');
        }catch(e:any){
          console.error('Deactivation error:', e);
          console.error('Error response:', e?.response?.data);
          showError('Could not deactivate user', e);
        }
      },
      ()=>{
        console.log('Deactivation cancelled');
      }
    );
  }

  async function handleDelete(id:string,name:string){
    showConfirm(
      'Permanently Delete User',
      `Are you sure you want to PERMANENTLY DELETE "${name}"?\n\nThis action CANNOT be undone. All user data will be permanently removed from the system.`,
      async()=>{
        try{
          console.log('Permanently deleting user:', id, name);
          const result = await deleteUserPermanent(id);
          console.log('Delete result:', result);
          setUsers(p=>p.filter(u=>u._id!==id));
          showAlert('Deleted','User permanently deleted from the system');
        }catch(e:any){
          console.error('Delete error:', e);
          console.error('Error response:', e?.response?.data);
          showError('Could not delete user', e);
        }
      },
      ()=>{
        console.log('Delete cancelled');
      }
    );
  }

  const TAB_COUNTS:{[k in AdminTab]:number}={shops:shops.length,users:users.length};

  if(loading)return(<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator size="large" color={Colors.accent}/><Text style={{fontSize:13,color:Colors.text3}}>Loading admin panel…</Text></View>);

  return(
    <View style={{flex:1,backgroundColor:Colors.white}}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View><Text style={s.pageTitle}>Admin Panel</Text><Text style={s.pageSub}>User creation & enterprise management</Text></View>
      </View>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['shops','users'] as AdminTab[]).map(t=>(
          <TouchableOpacity key={t} onPress={()=>setTab(t)} style={[s.tabBtn,tab===t&&s.tabBtnActive]}>
            <Text style={[s.tabTxt,tab===t&&{color:Colors.gold}]}>{t.charAt(0).toUpperCase()+t.slice(1)}</Text>
            {TAB_COUNTS[t]>0&&<View style={[s.tabBadge,tab===t&&{backgroundColor:'rgba(200,169,110,0.15)'}]}><Text style={[{fontSize:10,fontWeight:'600',color:Colors.text3},tab===t&&{color:Colors.gold}]}>{TAB_COUNTS[t]}</Text></View>}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{flex:1,backgroundColor:Colors.surface}} contentContainerStyle={{paddingBottom:40}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={Colors.accent}/>}>

        {/* SHOPS */}
        {tab==='shops'&&(
          <>
            <View style={{padding:16,paddingBottom:12}}>
              <Button label="+ Create Shop" onPress={()=>setShopModal(true)} variant="primary" size="sm" style={{alignSelf:'flex-end'}}/>
            </View>
            {shops.length===0?<Text style={s.emptyMsg}>No shops yet.</Text>:
              <FlatList
                data={shops}
                keyExtractor={(item)=>item._id}
                numColumns={numCols}
                key={`shops-${numCols}`}
                scrollEnabled={false}
                contentContainerStyle={{padding:14,gap:12}}
                columnWrapperStyle={numCols>1?{gap:12}:undefined}
                renderItem={({item:shop})=>(
                  <View style={[s.gridCard,{flex:1,maxWidth:numCols>1?`${100/numCols}%` as any:'100%'}]}>
                    <View style={[s.cardThumb,{backgroundColor:Colors.primary2}]}>
                      <Text style={{fontSize:36,fontWeight:'700',color:Colors.gold}}>{shop.name.substring(0,2).toUpperCase()}</Text>
                      <View style={s.planBadge}>
                        <Text style={s.planBadgeText}>{shop.plan?.charAt(0).toUpperCase()+shop.plan?.slice(1)}</Text>
                      </View>
                    </View>
                    <View style={s.cardBody}>
                      <Text style={s.cardTitle} numberOfLines={1}>{shop.name}</Text>
                      <Text style={s.cardMeta}>👤 {shop.owner?.name??'—'}</Text>
                      <Text style={s.cardMeta}>👥 {shop.salesPersons?.length??0} Sales Persons</Text>
                      {shop.phone&&<Text style={s.cardMeta}>📱 {shop.phone}</Text>}
                      {shop.gstin&&<Text style={s.cardMeta} numberOfLines={1}>🏛 {shop.gstin}</Text>}
                    </View>
                  </View>
                )}
              />
            }
          </>
        )}

        {/* USERS */}
        {tab==='users'&&(
          <>
            <View style={{padding:16,paddingBottom:12}}>
              <Button label="+ Create User" onPress={()=>setUserModal(true)} variant="primary" size="sm" style={{alignSelf:'flex-end'}}/>
            </View>
            {users.length===0?<Text style={s.emptyMsg}>No users found.</Text>:
              <FlatList
                data={users}
                keyExtractor={(item)=>item._id}
                numColumns={numCols}
                key={`users-${numCols}`}
                scrollEnabled={false}
                contentContainerStyle={{padding:14,gap:12}}
                columnWrapperStyle={numCols>1?{gap:12}:undefined}
                renderItem={({item:u})=>(
                  <View style={[s.gridCard,{flex:1,maxWidth:numCols>1?`${100/numCols}%` as any:'100%'}]}>
                    <View style={[s.cardThumb,{backgroundColor:Colors.accent}]}>
                      <Text style={{fontSize:36,fontWeight:'700',color:'#fff'}}>{u.name.substring(0,2).toUpperCase()}</Text>
                      <View style={[s.statusBadge,{backgroundColor:u.isActive?'rgba(76,183,116,0.15)':'rgba(224,82,82,0.15)'}]}>
                        <Text style={{fontSize:9,fontWeight:'700',color:u.isActive?Colors.success:Colors.danger}}>{u.isActive?'ACTIVE':'INACTIVE'}</Text>
                      </View>
                    </View>
                    <View style={s.cardBody}>
                      <Text style={s.cardTitle} numberOfLines={1}>{u.name}</Text>
                      <Text style={s.cardEmail} numberOfLines={1}>{u.email}</Text>
                      <View style={{marginTop:6,marginBottom:8}}>
                        <RoleBadge role={u.role as UserRole}/>
                      </View>
                      {u.shop&&<Text style={s.cardMeta} numberOfLines={1}>🏪 {u.shop.name}</Text>}
                      {u.assignedShop&&<Text style={s.cardMeta} numberOfLines={1}>🏪 {u.assignedShop.name}</Text>}
                    </View>
                    {u.isActive&&u.role!=='admin'&&(
                      <TouchableOpacity
                        onPress={()=>{
                          console.log('Deactivate button pressed for user:', u._id, u.name);
                          handleDeactivate(u._id,u.name);
                        }}
                        style={s.deactivateBtn}
                        activeOpacity={0.7}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      >
                        <Text style={s.deactivateBtnText}>Deactivate</Text>
                      </TouchableOpacity>
                    )}
                    {!u.isActive&&u.role!=='admin'&&(
                      <TouchableOpacity
                        onPress={()=>{
                          console.log('Delete button pressed for user:', u._id, u.name);
                          handleDelete(u._id,u.name);
                        }}
                        style={[s.deactivateBtn,{backgroundColor:Colors.danger}]}
                        activeOpacity={0.7}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      >
                        <Text style={s.deactivateBtnText}>Delete Permanently</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            }
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateShopModal visible={shopModal} onClose={()=>setShopModal(false)} onCreated={load}/>
      <CreateUserModal visible={userModal} onClose={()=>setUserModal(false)} onCreated={load} shops={shops}/>
    </View>
  );
}

// ── Create Shop Modal ────────────────────────────────────────
function CreateShopModal({visible,onClose,onCreated}:{visible:boolean;onClose:()=>void;onCreated:()=>void}){
  const[name,setName]=useState('');
  const[ownerName,setOwnerName]=useState('');
  const[ownerEmail,setOwnerEmail]=useState('');
  const[ownerPassword,setOwnerPassword]=useState('');
  const[address,setAddress]=useState('');
  const[pinCode,setPinCode]=useState('');
  const[phone,setPhone]=useState('');
  const[gstin,setGstin]=useState('');
  const[plan,setPlan]=useState<'starter'|'pro'|'enterprise'>('starter');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');

  async function handleCreate(){
    if(!name.trim()){setErr('Shop name is required');return;}
    if(!ownerName.trim()){setErr('Shop owner name is required');return;}
    if(ownerEmail.trim() && !ownerPassword.trim()){setErr('If providing email, password is also required');return;}
    if(ownerPassword.trim() && ownerPassword.length<6){setErr('Password must be at least 6 characters');return;}

    setLoading(true);setErr('');
    try{
      const payload:any = {
        name: name.trim(),
        ownerName: ownerName.trim(),
        address: address.trim(),
        pinCode: pinCode.trim(),
        phone: phone.trim(),
        gstin: gstin.trim().toUpperCase(),
        plan
      };

      if(ownerEmail.trim()) payload.ownerEmail = ownerEmail.trim();
      if(ownerPassword.trim()) payload.ownerPassword = ownerPassword.trim();

      const result = await createAdminShop(payload);
      const creds = result.ownerCredentials;
      showAlert('Shop Created',`Shop "${name}" created successfully.\n\nOwner: ${ownerName}\nEmail: ${creds.email}\nPassword: ${creds.password}\n\nPlease save these credentials!`);
      onCreated();
      onClose();
      setName('');
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setAddress('');
      setPinCode('');
      setPhone('');
      setGstin('');
    }catch(e:any){
      setErr(e?.response?.data?.message??'Failed');
    }finally{
      setLoading(false);
    }
  }

  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.card} onPress={()=>{}}>
          <View style={ms.header}><Text style={ms.title}>Create New Shop</Text><TouchableOpacity onPress={onClose}><Text style={{fontSize:16,color:Colors.text3}}>✕</Text></TouchableOpacity></View>
          <ScrollView style={{maxHeight:500}}>
            <View style={ms.body}>
              <FormInput label="Shop Name *" placeholder="e.g. Marble Palace" value={name} onChangeText={setName}/>
              <FormInput label="Shop Owner Name *" placeholder="Owner's full name" value={ownerName} onChangeText={setOwnerName}/>
              <FormInput label="Shop Address" placeholder="Full address" value={address} onChangeText={setAddress} multiline/>
              <FormInput label="PIN Code" placeholder="e.g. 560001" keyboardType="number-pad" value={pinCode} onChangeText={setPinCode}/>
              <FormInput label="Mobile Number" placeholder="e.g. 9876543210" keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
              <FormInput label="GSTIN Number" placeholder="e.g. 29ABCDE1234F1Z5" autoCapitalize="characters" value={gstin} onChangeText={setGstin}/>

              <View style={{borderTopWidth:1,borderTopColor:Colors.border,marginVertical:14,paddingTop:14}}>
                <Text style={{fontSize:11,color:Colors.text3,marginBottom:10}}>Owner Login Credentials (Optional - auto-generated if not provided)</Text>
                <FormInput label="Owner Email (Optional)" placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" value={ownerEmail} onChangeText={setOwnerEmail}/>
                <FormInput label="Owner Password (Optional)" placeholder="Min 6 characters" secureTextEntry value={ownerPassword} onChangeText={setOwnerPassword}/>
              </View>

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
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Create User Modal ────────────────────────────────────────
function CreateUserModal({visible,onClose,onCreated,shops}:{visible:boolean;onClose:()=>void;onCreated:()=>void;shops:any[]}){
  const[name,setName]=useState('');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[role,setRole]=useState<'shop_owner'|'sales_person'>('shop_owner');
  const[shopId,setShopId]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');

  async function handleCreate(){
    if(!name.trim()){setErr('Name required');return;}
    if(!email.trim()){setErr('Email required');return;}
    if(!password.trim()){setErr('Password required');return;}
    if(password.length<6){setErr('Password must be at least 6 characters');return;}
    if(!shopId){setErr(`Select a shop for ${role==='shop_owner'?'shop owner':'sales person'}`);return;}

    setLoading(true);setErr('');
    try{
      await createAdminUser({name:name.trim(),email:email.trim(),password:password.trim(),role,shopId:shopId||undefined});
      showAlert('User Created',`User "${name}" created successfully.\nEmail: ${email}\nPassword: ${password}`);
      onCreated();
      onClose();
      setName('');
      setEmail('');
      setPassword('');
      setShopId('');
    }catch(e:any){
      setErr(e?.response?.data?.message??'Failed');
    }finally{
      setLoading(false);
    }
  }

  return(
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={ms.overlay} onPress={onClose}>
        <Pressable style={ms.card} onPress={()=>{}}>
          <View style={ms.header}><Text style={ms.title}>Create New User</Text><TouchableOpacity onPress={onClose}><Text style={{fontSize:16,color:Colors.text3}}>✕</Text></TouchableOpacity></View>
          <ScrollView style={{maxHeight:500}}>
            <View style={ms.body}>
              <FormInput label="Full Name *" placeholder="User's name" value={name} onChangeText={setName}/>
              <FormInput label="Email *" placeholder="user@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail}/>
              <FormInput label="Password *" placeholder="Min 6 characters" secureTextEntry value={password} onChangeText={setPassword}/>
              <Text style={{fontSize:12,fontWeight:'500',color:Colors.text2,marginBottom:6}}>Role</Text>
              <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
                {(['shop_owner','sales_person'] as const).map(r=>(
                  <TouchableOpacity key={r} onPress={()=>setRole(r)} style={[{flex:1,paddingVertical:8,borderRadius:8,borderWidth:1,alignItems:'center',borderColor:role===r?Colors.accent:Colors.border,backgroundColor:role===r?`${Colors.accent}18`:Colors.surface}]}>
                    <Text style={{fontSize:12,fontWeight:'500',color:role===r?Colors.accent:Colors.text2}}>{r==='shop_owner'?'Shop Owner':'Sales Person'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {shops.length>0&&(
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
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s=StyleSheet.create({
  pageHeader:{padding:16,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  pageTitle:{fontSize:20,fontFamily:'serif',fontWeight:'600',color:Colors.text1},
  pageSub:{fontSize:12,color:Colors.text3,marginTop:2},
  tabBar:{flexDirection:'row',backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  tabBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingVertical:12,borderBottomWidth:2,borderBottomColor:'transparent'},
  tabBtnActive:{borderBottomColor:Colors.gold},
  tabTxt:{fontSize:12,fontWeight:'500',color:Colors.text2},
  tabBadge:{backgroundColor:Colors.surface2,borderRadius:10,paddingHorizontal:5,paddingVertical:1},
  emptyMsg:{fontSize:13,color:Colors.text3,textAlign:'center',paddingVertical:40},

  // Grid card styles (like inventory)
  gridCard:{
    backgroundColor:Colors.white,
    borderWidth:1,
    borderColor:Colors.border,
    borderRadius:Radii.lg,
    overflow:'hidden',
    ...Shadows.card,
  },
  cardThumb:{
    height:100,
    alignItems:'center',
    justifyContent:'center',
    position:'relative',
  },
  planBadge:{
    position:'absolute',
    top:8,
    right:8,
    paddingHorizontal:8,
    paddingVertical:3,
    borderRadius:10,
    backgroundColor:'rgba(255,255,255,0.9)',
    borderWidth:1,
    borderColor:Colors.border,
  },
  planBadgeText:{
    fontSize:9,
    fontWeight:'700',
    color:Colors.text2,
    textTransform:'uppercase',
  },
  statusBadge:{
    position:'absolute',
    top:8,
    right:8,
    paddingHorizontal:8,
    paddingVertical:2,
    borderRadius:10,
  },
  cardBody:{
    padding:12,
  },
  cardTitle:{
    fontSize:14,
    fontWeight:'600',
    color:Colors.text1,
    marginBottom:4,
  },
  cardEmail:{
    fontSize:11,
    color:Colors.text3,
    marginBottom:2,
  },
  cardMeta:{
    fontSize:11,
    color:Colors.text2,
    marginTop:2,
  },
  deactivateBtn:{
    margin:10,
    marginTop:0,
    paddingVertical:8,
    paddingHorizontal:12,
    borderRadius:8,
    backgroundColor:Colors.danger,
    alignItems:'center',
  },
  deactivateBtnText:{
    fontSize:12,
    fontWeight:'600',
    color:'#fff',
  },
});
const ms=StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(10,10,20,0.55)',alignItems:'center',justifyContent:'center',padding:20},
  card:{backgroundColor:Colors.white,borderRadius:14,width:'100%',maxWidth:420,borderWidth:1,borderColor:Colors.border,overflow:'hidden',...Shadows.modal},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14,borderBottomWidth:1,borderBottomColor:Colors.border},
  title:{fontSize:14,fontWeight:'600',color:Colors.text1},
  body:{padding:18},
});
