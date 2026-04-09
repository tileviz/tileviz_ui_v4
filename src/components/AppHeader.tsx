// components/AppHeader.tsx — header + nav tabs + profile dropdown
import React,{useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Modal,Pressable,ScrollView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors,Radii,Shadows} from '../config/theme';
import {TileVizLogo} from './TileVizLogo';
import {RoleBadge} from './RoleBadge';
import {useAuthStore} from '../store/auth.store';
import {useAppStore} from '../store/app.store';
import {NavPage,UserRole} from '../types';

const HEADER_H=62;
const NAV_ITEMS:[NavPage,string,string,UserRole[]|undefined][]=[
  ['visualizer','▣','Visualizer',undefined],
  ['catalog','⊞','Catalog',undefined],
  ['saved','⊟','Saved',undefined],
  ['inventory','📦','Inventory',['admin','shop_owner','sales_person']],
  ['dashboard','▦','Dashboard',['admin','shop_owner']],
  ['admin','◉','Admin',['admin']],
];

interface Props{onLogout:()=>void;}

export function AppHeader({onLogout}:Props){
  const insets=useSafeAreaInsets();
  const {user}=useAuthStore();
  const {activePage,setActivePage}=useAppStore();
  const [dd,setDd]=useState(false);
  const tabs=NAV_ITEMS.filter(([,,, roles])=>!roles||(user&&roles.includes(user.role)));
  const roleColor=(role?:UserRole)=>role==='admin'?Colors.roleAdmin:role==='shop_owner'?Colors.roleShopOwner:Colors.roleSalesPerson;
  return(
    <>
      <View style={[s.header,{paddingTop:insets.top}]}>
        <View style={s.inner}>
          <TileVizLogo size="sm" variant="light"/>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1,marginLeft:10}} contentContainerStyle={{alignItems:'center',gap:2,height:HEADER_H}}>
            {tabs.map(([key,icon,label])=>(
              <TouchableOpacity key={key} onPress={()=>setActivePage(key)} style={[s.tab,activePage===key&&s.tabActive]}>
                <Text style={s.tabIcon}>{icon}</Text>
                <Text style={[s.tabLabel,activePage===key&&{color:'#E0E3F5'}]}>{label}</Text>
                {activePage===key&&<View style={s.tabLine}/>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={()=>setDd(true)} style={s.profileBtn} activeOpacity={0.8}>
            <View style={s.avatar}><Text style={s.avatarTxt}>{user?.initials??'?'}</Text></View>
            <View style={{maxWidth:90}}>
              <Text style={s.profileName} numberOfLines={1}>{user?.name??'User'}</Text>
              <Text style={[s.profileRole,{color:roleColor(user?.role)}]}>{user?.role?.replace('_',' ')??'—'}</Text>
            </View>
            <Text style={{color:'rgba(255,255,255,0.35)',fontSize:14}}>⌄</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Modal visible={dd} transparent animationType="fade" onRequestClose={()=>setDd(false)}>
        <Pressable style={s.backdrop} onPress={()=>setDd(false)}>
          <View style={s.dropdown}>
            <View style={s.ddHeader}>
              <View style={s.ddAvatar}><Text style={{fontSize:16,fontWeight:'600',color:'#fff'}}>{user?.initials??'?'}</Text></View>
              <View style={{flex:1}}>
                <Text style={s.ddName}>{user?.name}</Text>
                <Text style={s.ddEmail}>{user?.email}</Text>
                {user?.role&&<RoleBadge role={user.role}/>}
              </View>
            </View>
            <View style={s.ddDivider}/>
            <TouchableOpacity style={s.ddItem} onPress={()=>{setDd(false);setActivePage('saved');}}>
              <Text style={s.ddItemIcon}>⊟</Text><Text style={s.ddItemTxt}>My Saved Designs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ddItem} onPress={()=>{setDd(false);setActivePage('inventory');}}>
              <Text style={s.ddItemIcon}>📦</Text><Text style={s.ddItemTxt}>Inventory Library</Text>
            </TouchableOpacity>
            <View style={s.ddDivider}/>
            <TouchableOpacity style={s.ddItem} onPress={()=>{setDd(false);onLogout();}}>
              <Text style={[s.ddItemIcon,{color:Colors.danger}]}>⇥</Text>
              <Text style={[s.ddItemTxt,{color:Colors.danger}]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
const s=StyleSheet.create({
  header:{backgroundColor:Colors.primary,borderBottomWidth:1,borderBottomColor:'rgba(124,111,247,0.15)',...Shadows.header,zIndex:100},
  inner:{height:HEADER_H,flexDirection:'row',alignItems:'center',paddingHorizontal:16,gap:10},
  tab:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,height:HEADER_H,position:'relative'},
  tabActive:{},tabIcon:{fontSize:12,color:'rgba(255,255,255,0.42)'},
  tabLabel:{fontSize:12,fontWeight:'500',color:'rgba(255,255,255,0.42)'},
  tabLine:{position:'absolute',bottom:0,left:10,right:10,height:2,borderRadius:2,backgroundColor:Colors.accent},
  profileBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.05)',borderWidth:1,borderColor:'rgba(124,111,247,0.2)',borderRadius:40,paddingVertical:5,paddingLeft:5,paddingRight:10},
  avatar:{width:30,height:30,borderRadius:15,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'},
  avatarTxt:{fontSize:12,fontWeight:'600',color:'#fff'},
  profileName:{fontSize:12,fontWeight:'500',color:'rgba(255,255,255,0.88)'},
  profileRole:{fontSize:10,fontWeight:'500'},
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'flex-end',justifyContent:'flex-start',paddingTop:70,paddingRight:16},
  dropdown:{width:252,backgroundColor:'#0f1321',borderWidth:1,borderColor:'rgba(124,111,247,0.22)',borderRadius:14,overflow:'hidden',...Shadows.modal},
  ddHeader:{flexDirection:'row',alignItems:'center',gap:12,padding:16,backgroundColor:'rgba(124,111,247,0.07)'},
  ddAvatar:{width:40,height:40,borderRadius:20,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'},
  ddName:{fontSize:14,fontWeight:'600',color:'#E0E3F5',marginBottom:2},
  ddEmail:{fontSize:11,color:'#4A5080',marginBottom:4},
  ddDivider:{height:1,backgroundColor:'rgba(255,255,255,0.06)'},
  ddItem:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:12},
  ddItemIcon:{fontSize:14,color:'#9AA0C4'},ddItemTxt:{fontSize:13,color:'#9AA0C4'},
});
