// DashboardScreen — fixed UI bugs + data consistency (#8)
// Both Admin and ShopOwner views unified here
import React,{useEffect,useState,useCallback} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,ActivityIndicator,RefreshControl,Alert} from 'react-native';
import {Colors,Radii,Shadows} from '../config/theme';
import {RoleBadge} from '../components/RoleBadge';
import {Button} from '../components/Button';
import {useAuthStore} from '../store/auth.store';
import {getAdminStats,getAdminShops,getAdminUsers,patchAdminUser,getMyShop,getMyShopSalesPersons,getCatalogRequests,reviewCatalogRequest} from '../api/admin';
import {UserRole} from '../types';

const PLAN_STYLE:Record<string,{bg:string;text:string;border:string}>={
  pro:       {bg:'#fdf9f2',text:Colors.gold,    border:Colors.gold   },
  enterprise:{bg:'#e8f4ff',text:Colors.info,    border:Colors.info   },
  starter:   {bg:Colors.surface2,text:Colors.text3,border:Colors.border},
};

function PlanBadge({plan}:{plan:string}){
  const p=PLAN_STYLE[plan?.toLowerCase()]??PLAN_STYLE.starter;
  return(<View style={{backgroundColor:p.bg,borderColor:p.border,borderWidth:1,borderRadius:10,paddingHorizontal:8,paddingVertical:2}}><Text style={{fontSize:10,fontWeight:'500',color:p.text}}>{plan?.charAt(0).toUpperCase()+plan?.slice(1)}</Text></View>);
}

export function DashboardScreen(){
  const {user}=useAuthStore();
  const isAdmin=user?.role==='admin';
  const [stats,setStats]=useState<any>(null);
  const [shops,setShops]=useState<any[]>([]);
  const [users,setUsers]=useState<any[]>([]);
  const [myShop,setMyShop]=useState<any>(null);
  const [sps,setSps]=useState<any[]>([]);
  const [requests,setRequests]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    try{
      if(isAdmin){
        const [st,sh,us]=await Promise.all([getAdminStats(),getAdminShops(),getAdminUsers()]);
        setStats(st);setShops(sh);setUsers(us);
      } else {
        const [shopData,spData,reqData]=await Promise.all([getMyShop(),getMyShopSalesPersons(),getCatalogRequests('pending')]);
        setMyShop(shopData);setSps(spData);setRequests(reqData);
        // Build simple stats for shop owner
        setStats({
          tiles:{total:shopData?.stats?.totalTiles??0},
          users:{total:spData?.length??0,active:spData?.filter((s:any)=>s.isActive).length??0},
          shops:{total:1,active:1},
          pendingCatalogRequests:reqData?.length??0,
        });
      }
    }catch(e:any){console.error('dashboard:',e?.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[isAdmin]);
  useEffect(()=>{load();},[load]);

  async function handleToggleUser(id:string,isActive:boolean){
    try{await patchAdminUser(id,{isActive:!isActive});setUsers(prev=>prev.map(u=>u._id===id?{...u,isActive:!isActive}:u));}
    catch(e:any){Alert.alert('Error',e?.response?.data?.message??'Failed');}
  }

  async function handleReviewRequest(id:string,status:'approved'|'rejected'){
    try{
      await reviewCatalogRequest(id,status);
      setRequests(prev=>prev.filter(r=>r._id!==id));
      setStats((prev:any)=>({...prev,pendingCatalogRequests:(prev?.pendingCatalogRequests??1)-1}));
      Alert.alert('Done',`Request ${status}.`);
    }catch(e:any){
      Alert.alert('Error',e?.response?.data?.message??'Failed');
    }
  }

  if(loading)return(<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator size="large" color={Colors.accent}/><Text style={{fontSize:13,color:Colors.text3}}>Loading dashboard…</Text></View>);

  const statCards=[
    {label:'Total Users',   value:String(stats?.users?.total??0),  trend:`${stats?.users?.active??0} active`,  up:true},
    {label:'Active Shops',  value:String(stats?.shops?.active??0), trend:`${stats?.shops?.total??0} total`,     up:true},
    {label:isAdmin?'Tiles in Catalog':'Shop Tiles', value:String(stats?.tiles?.total??0), trend:'approved', up:true},
    {label:'Pending',       value:String(stats?.pendingCatalogRequests??0), trend:'awaiting review', up:(stats?.pendingCatalogRequests??0)===0},
  ];

  return(
    <ScrollView style={{flex:1,backgroundColor:Colors.surface}} contentContainerStyle={{paddingBottom:40}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={Colors.accent}/>}>
      <View style={{padding:24,paddingBottom:0}}>
        <Text style={{fontSize:22,fontFamily:'serif',fontWeight:'600',color:Colors.text1}}>Dashboard</Text>
        <Text style={{fontSize:13,color:Colors.text3,marginTop:2,marginBottom:16}}>{isAdmin?'Platform management':'Shop management'}</Text>
      </View>

      {/* Stat cards */}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,paddingHorizontal:24,marginBottom:24}}>
        {statCards.map((st,i)=>(
          <View key={i} style={[s.statCard,{minWidth:'45%',flex:1}]}>
            <Text style={s.statLbl}>{st.label}</Text>
            <Text style={s.statVal}>{st.value}</Text>
            <Text style={[s.statTrend,st.up?{color:Colors.success}:{color:Colors.danger}]}>{st.up?'▲':'▼'} {st.trend}</Text>
          </View>
        ))}
      </View>

      {/* Shop Owner: Pending Catalog Requests */}
      {!isAdmin&&requests.length>0&&(
        <View style={s.section}>
          <Text style={s.sectionTitle}>Pending Tile Requests</Text>
          {requests.map((req:any)=>(
            <View key={req._id} style={[s.rowCard,{flexDirection:'column',gap:10}]}>
              <View style={{flex:1,width:'100%'}}>
                <Text style={s.rowName}>{req.tile?.name??'Unknown Tile'}</Text>
                <Text style={s.rowSub}>Requested by: {req.requestedBy?.name??'—'}</Text>
                <Text style={s.rowSub}>Category: {req.tile?.category??'—'}</Text>
              </View>
              <View style={{flexDirection:'row',gap:8,width:'100%'}}>
                <Button label="✓ Approve" onPress={()=>handleReviewRequest(req._id,'approved')} variant="accent" size="sm" style={{flex:1}}/>
                <Button label="✕ Reject"  onPress={()=>handleReviewRequest(req._id,'rejected')} variant="danger"  size="sm" style={{flex:1}}/>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Admin: Registered Shops */}
      {isAdmin&&(
        <View style={s.section}>
          <Text style={s.sectionTitle}>Registered Shops</Text>
          {shops.length===0?<Text style={s.emptyMsg}>No shops registered.</Text>:
            shops.map((shop:any)=>(
              <View key={shop._id} style={s.rowCard}>
                <View style={[s.rowAv,{backgroundColor:Colors.primary2}]}><Text style={{fontSize:12,fontWeight:'700',color:Colors.gold}}>{(shop.name??'?').substring(0,2).toUpperCase()}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.rowName}>{shop.name}</Text>
                  <Text style={s.rowSub}>Owner: {shop.owner?.name??'—'} · {shop.salesPersons?.length??0} SPs</Text>
                </View>
                <PlanBadge plan={shop.plan??'starter'}/>
              </View>
            ))
          }
        </View>
      )}

      {/* Shop Owner: My Sales Persons */}
      {!isAdmin&&sps.length>0&&(
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Sales Team</Text>
          {sps.map((sp:any)=>(
            <View key={sp._id} style={s.rowCard}>
              <View style={[s.rowAv,{backgroundColor:Colors.accent}]}><Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>{sp.name.substring(0,2).toUpperCase()}</Text></View>
              <View style={{flex:1}}>
                <Text style={s.rowName}>{sp.name}</Text>
                <Text style={s.rowSub}>{sp.email}</Text>
              </View>
              <View style={[{paddingHorizontal:8,paddingVertical:3,borderRadius:10},{backgroundColor:sp.isActive?'rgba(76,183,116,0.1)':'rgba(224,82,82,0.1)'}]}>
                <Text style={{fontSize:10,fontWeight:'600',color:sp.isActive?Colors.success:Colors.danger}}>{sp.isActive?'Active':'Inactive'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Admin: User Management */}
      {isAdmin&&(
        <View style={s.section}>
          <Text style={s.sectionTitle}>User Management</Text>
          <View style={s.tableWrap}>
            <View style={[s.tableRow,{backgroundColor:Colors.surface2}]}>
              <Text style={[s.thCell,{flex:2}]}>User</Text>
              <Text style={s.thCell}>Role</Text>
              <Text style={s.thCell}>Status</Text>
            </View>
            {users.map((u:any)=>(
              <View key={u._id} style={s.tableRow}>
                <View style={[{flex:2,flexDirection:'row',alignItems:'center',gap:8},s.tdCell]}>
                  <View style={{width:28,height:28,borderRadius:14,backgroundColor:Colors.gold,alignItems:'center',justifyContent:'center'}}>
                    <Text style={{fontSize:11,fontWeight:'700',color:Colors.primary2}}>{(u.name??'U').substring(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:12,fontWeight:'500',color:Colors.text1}} numberOfLines={1}>{u.name}</Text>
                    <Text style={{fontSize:10,color:Colors.text3}} numberOfLines={1}>{u.email}</Text>
                  </View>
                </View>
                <View style={s.tdCell}><RoleBadge role={u.role as UserRole}/></View>
                <View style={s.tdCell}>
                  {u.role!=='admin'?(
                    <TouchableOpacity onPress={()=>handleToggleUser(u._id,u.isActive)} style={[{paddingHorizontal:7,paddingVertical:3,borderRadius:10},{backgroundColor:u.isActive?'rgba(76,183,116,0.1)':'rgba(224,82,82,0.1)'}]}>
                      <Text style={{fontSize:10,fontWeight:'600',color:u.isActive?Colors.success:Colors.danger}}>{u.isActive?'Active':'Off'}</Text>
                    </TouchableOpacity>
                  ):(
                    <View style={{paddingHorizontal:7,paddingVertical:3,borderRadius:10,backgroundColor:'rgba(124,111,247,0.1)'}}><Text style={{fontSize:10,fontWeight:'600',color:Colors.accent}}>Admin</Text></View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
const s=StyleSheet.create({
  statCard:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:Radii.lg,padding:14,...Shadows.card},
  statLbl:{fontSize:10,color:Colors.text3,textTransform:'uppercase',letterSpacing:0.8,marginBottom:6},
  statVal:{fontSize:26,fontWeight:'600',color:Colors.text1},statTrend:{fontSize:11,marginTop:3},
  section:{paddingHorizontal:24,marginBottom:24},sectionTitle:{fontSize:14,fontWeight:'600',color:Colors.text1,marginBottom:12},
  emptyMsg:{fontSize:13,color:Colors.text3,textAlign:'center',paddingVertical:20},
  rowCard:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:Colors.white,borderRadius:Radii.lg,padding:12,marginBottom:8,borderWidth:1,borderColor:Colors.border,...Shadows.card},
  rowAv:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  rowName:{fontSize:13,fontWeight:'500',color:Colors.text1},rowSub:{fontSize:11,color:Colors.text3,marginTop:1},
  tableWrap:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:Radii.lg,overflow:'hidden'},
  tableRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:Colors.border},
  thCell:{flex:1,padding:10,fontSize:11,color:Colors.text3,textTransform:'uppercase',letterSpacing:0.5},
  tdCell:{flex:1,padding:10},
});
