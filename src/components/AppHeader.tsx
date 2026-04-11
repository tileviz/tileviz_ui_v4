// components/AppHeader.tsx — Responsive header + nav tabs + profile dropdown
// Desktop/Tablet: Full header with horizontal nav tabs
// Phone: Compact header with page title + profile avatar + hamburger menu
import React,{useState} from 'react';
import {View,Text,TouchableOpacity,StyleSheet,Modal,Pressable,ScrollView,Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors,Radii,Shadows} from '../config/theme';
import {TileVizLogo} from './TileVizLogo';
import {RoleBadge} from './RoleBadge';
import {useAuthStore} from '../store/auth.store';
import {useAppStore} from '../store/app.store';
import {useLayout} from '../hooks/useLayout';
import {NavPage,UserRole} from '../types';

const HEADER_H=62;
const MOBILE_HEADER_H=52;

const NAV_ITEMS:[NavPage,string,string,UserRole[]|undefined][]=[
  ['visualizer','▣','Visualizer',undefined],
  ['catalog','⊞','Catalog',undefined],
  ['saved','⊟','Saved',undefined],
  ['inventory','📦','Inventory',['admin','shop_owner','sales_person']],
  ['dashboard','▦','Dashboard',['admin','shop_owner']],
  ['admin','◉','Admin',['admin']],
];

const PAGE_TITLES: Record<string, string> = {
  visualizer: 'Visualizer',
  catalog: 'Tile Catalog',
  saved: 'Saved Designs',
  inventory: 'Inventory',
  dashboard: 'Dashboard',
  admin: 'Admin Panel',
};

interface Props{onLogout:()=>void;}

export function AppHeader({onLogout}:Props){
  const insets=useSafeAreaInsets();
  const {user}=useAuthStore();
  const {activePage,setActivePage}=useAppStore();
  const {isPhone,showTopNav}=useLayout();
  const [dd,setDd]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const tabs=NAV_ITEMS.filter(([,,, roles])=>!roles||(user&&roles.includes(user.role)));
  const roleColor=(role?:UserRole)=>role==='admin'?Colors.roleAdmin:role==='shop_owner'?Colors.roleShopOwner:Colors.roleSalesPerson;

  // ─── Phone: Compact header ─────────────────────────────────
  if(isPhone){
    return(
      <>
        <View style={[s.mobileHeader,{paddingTop:insets.top}]}>
          <View style={s.mobileInner}>
            {/* Hamburger menu */}
            <TouchableOpacity onPress={()=>setMobileMenu(true)} style={s.hamburger} activeOpacity={0.7}>
              <View style={s.hamburgerLine}/>
              <View style={[s.hamburgerLine,{width:16}]}/>
              <View style={s.hamburgerLine}/>
            </TouchableOpacity>

            {/* Page title */}
            <Text style={s.mobileTitle} numberOfLines={1}>
              {PAGE_TITLES[activePage]||'TileVIZ'}
            </Text>

            {/* Profile avatar */}
            <TouchableOpacity onPress={()=>setDd(true)} style={s.mobileAvatar} activeOpacity={0.8}>
              <Text style={s.mobileAvatarTxt}>{user?.initials??'?'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile Slide Menu */}
        <Modal visible={mobileMenu} transparent animationType="fade" onRequestClose={()=>setMobileMenu(false)}>
          <Pressable style={s.mobileMenuBackdrop} onPress={()=>setMobileMenu(false)}>
            <Pressable style={[s.mobileMenuPanel,{paddingTop:insets.top+16}]} onPress={()=>{}}>
              {/* Logo */}
              <View style={s.mobileMenuLogo}>
                <TileVizLogo size="sm" variant="light"/>
              </View>
              <View style={s.mobileMenuDivider}/>

              {/* Nav items */}
              {tabs.map(([key,icon,label])=>{
                const active=activePage===key;
                return(
                  <TouchableOpacity
                    key={key}
                    onPress={()=>{setActivePage(key);setMobileMenu(false);}}
                    style={[s.mobileMenuItem,active&&s.mobileMenuItemActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={s.mobileMenuIcon}>{icon}</Text>
                    <Text style={[s.mobileMenuLabel,active&&{color:'#E0E3F5',fontWeight:'600'}]}>{label}</Text>
                    {active&&<View style={s.mobileMenuActiveDot}/>}
                  </TouchableOpacity>
                );
              })}

              <View style={s.mobileMenuDivider}/>

              {/* User info */}
              <View style={s.mobileMenuUser}>
                <View style={s.mobileMenuUserAvatar}>
                  <Text style={{fontSize:14,fontWeight:'600',color:'#fff'}}>{user?.initials??'?'}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:13,fontWeight:'500',color:'#E0E3F5'}}>{user?.name??'User'}</Text>
                  <Text style={{fontSize:11,color:'#4A5080'}}>{user?.email}</Text>
                </View>
              </View>

              {/* Sign out */}
              <TouchableOpacity
                style={s.mobileMenuSignOut}
                onPress={()=>{setMobileMenu(false);onLogout();}}
                activeOpacity={0.7}
              >
                <Text style={{fontSize:14,color:Colors.danger}}>⇥</Text>
                <Text style={{fontSize:13,color:Colors.danger,fontWeight:'500'}}>Sign Out</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Profile dropdown (phone) */}
        <Modal visible={dd} transparent animationType="fade" onRequestClose={()=>setDd(false)}>
          <Pressable style={s.backdrop} onPress={()=>setDd(false)}>
            <View style={[s.dropdown,{top:insets.top+MOBILE_HEADER_H+4,right:12}]}>
              <View style={s.ddHeader}>
                <View style={s.ddAvatar}><Text style={{fontSize:16,fontWeight:'600',color:'#fff'}}>{user?.initials??'?'}</Text></View>
                <View style={{flex:1}}>
                  <Text style={s.ddName}>{user?.name}</Text>
                  <Text style={s.ddEmail}>{user?.email}</Text>
                  {user?.role&&<RoleBadge role={user.role}/>}
                </View>
              </View>
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

  // ─── Desktop / Tablet: Full header ─────────────────────────
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
  // ─── Desktop/Tablet header ──────────────────────────
  header:{backgroundColor:Colors.primary,borderBottomWidth:1,borderBottomColor:'rgba(124,111,247,0.15)',...Shadows.header,zIndex:100,position:Platform.OS==='web'?('fixed' as any):'absolute',top:0,left:0,right:0},
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

  // ─── Phone header ───────────────────────────────────
  mobileHeader:{backgroundColor:Colors.primary,borderBottomWidth:1,borderBottomColor:'rgba(124,111,247,0.15)',zIndex:100,position:Platform.OS==='web'?('fixed' as any):'absolute',top:0,left:0,right:0},
  mobileInner:{height:MOBILE_HEADER_H,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:12},
  hamburger:{width:32,height:32,alignItems:'center',justifyContent:'center',gap:4},
  hamburgerLine:{width:20,height:2,borderRadius:1,backgroundColor:'rgba(255,255,255,0.6)'},
  mobileTitle:{flex:1,fontSize:16,fontWeight:'600',color:'#E0E3F5',textAlign:'center'},
  mobileAvatar:{width:32,height:32,borderRadius:16,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'},
  mobileAvatarTxt:{fontSize:12,fontWeight:'600',color:'#fff'},

  // ─── Mobile slide menu ──────────────────────────────
  mobileMenuBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',flexDirection:'row'},
  mobileMenuPanel:{
    width:280,
    backgroundColor:'#0f1321',
    borderRightWidth:1,
    borderRightColor:'rgba(124,111,247,0.2)',
    paddingBottom:20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
    } as any : {
      shadowColor:'#000',
      shadowOffset:{width:4,height:0},
      shadowOpacity:0.4,
      shadowRadius:24,
      elevation:20,
    }),
  },
  mobileMenuLogo:{paddingHorizontal:20,paddingBottom:16},
  mobileMenuDivider:{height:1,backgroundColor:'rgba(255,255,255,0.06)',marginVertical:8},
  mobileMenuItem:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingVertical:13,position:'relative'},
  mobileMenuItemActive:{backgroundColor:'rgba(124,111,247,0.08)'},
  mobileMenuIcon:{fontSize:16,color:'rgba(255,255,255,0.4)',width:24,textAlign:'center'},
  mobileMenuLabel:{fontSize:14,fontWeight:'400',color:'rgba(255,255,255,0.5)'},
  mobileMenuActiveDot:{position:'absolute',left:6,width:4,height:4,borderRadius:2,backgroundColor:Colors.accent},
  mobileMenuUser:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:20,paddingVertical:12},
  mobileMenuUserAvatar:{width:36,height:36,borderRadius:18,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'},
  mobileMenuSignOut:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:20,paddingVertical:12,marginTop:4},

  // ─── Shared dropdown ────────────────────────────────
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'flex-end',justifyContent:'flex-start',paddingTop:70,paddingRight:16},
  dropdown:{width:252,backgroundColor:'#0f1321',borderWidth:1,borderColor:'rgba(124,111,247,0.22)',borderRadius:14,overflow:'hidden',...Shadows.modal,position:'absolute'},
  ddHeader:{flexDirection:'row',alignItems:'center',gap:12,padding:16,backgroundColor:'rgba(124,111,247,0.07)'},
  ddAvatar:{width:40,height:40,borderRadius:20,backgroundColor:Colors.accent,alignItems:'center',justifyContent:'center'},
  ddName:{fontSize:14,fontWeight:'600',color:'#E0E3F5',marginBottom:2},
  ddEmail:{fontSize:11,color:'#4A5080',marginBottom:4},
  ddDivider:{height:1,backgroundColor:'rgba(255,255,255,0.06)'},
  ddItem:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:12},
  ddItemIcon:{fontSize:14,color:'#9AA0C4'},ddItemTxt:{fontSize:13,color:'#9AA0C4'},
});
