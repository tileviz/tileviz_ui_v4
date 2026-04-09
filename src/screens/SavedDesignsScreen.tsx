// SavedDesignsScreen — wired to /api/rooms (#10 session fix)
import React,{useEffect,useState,useCallback} from 'react';
import {View,Text,FlatList,TouchableOpacity,StyleSheet,Alert,ActivityIndicator,RefreshControl} from 'react-native';
import {Colors,Radii,Shadows} from '../config/theme';
import {Button} from '../components/Button';
import {useAppStore} from '../store/app.store';
import {getRooms,deleteRoom} from '../api/rooms';
import {SavedDesign,RoomType} from '../types';
import {ROOM_EMOJIS,ROOM_BG,formatDate} from '../utils/format';

export function SavedDesignsScreen(){
  const {setRoomType,setDimensions}=useAppStore();
  const [designs,setDesigns]=useState<SavedDesign[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);

  const load=useCallback(async()=>{
    try{setDesigns(await getRooms());}
    catch(e:any){console.error('rooms:',e?.message);}
    finally{setLoading(false);setRefreshing(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  function handleLoad(d:SavedDesign){
    setRoomType(d.roomType);setDimensions(d.dimensions);
    Alert.alert('Design Loaded',`"${d.name}" loaded into Visualizer.`);
  }
  function handleDelete(id:string,name:string){
    Alert.alert('Delete',`Delete "${name}"?`,[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{
        try{await deleteRoom(id);setDesigns(d=>d.filter(x=>x.id!==id));}
        catch(e:any){Alert.alert('Error',e?.response?.data?.message??'Delete failed');}
      }},
    ]);
  }

  if(loading)return(<View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}><ActivityIndicator size="large" color={Colors.accent}/><Text style={{fontSize:13,color:Colors.text3}}>Loading designs…</Text></View>);

  return(
    <View style={{flex:1,backgroundColor:Colors.white}}>
      <View style={s.pageHeader}>
        <View><Text style={s.pageTitle}>Saved Designs</Text><Text style={s.pageSub}>Your saved room visualizations</Text></View>
        <View style={s.countBadge}><Text style={{fontSize:13,fontWeight:'600',color:Colors.text2}}>{designs.length}</Text></View>
      </View>
      {designs.length===0?(
        <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:40}}>
          <Text style={{fontSize:56,marginBottom:16}}>📂</Text>
          <Text style={{fontSize:16,fontWeight:'600',color:Colors.text1,marginBottom:8}}>No saved designs yet</Text>
          <Text style={{fontSize:13,color:Colors.text3,textAlign:'center',lineHeight:20}}>Create a visualization and tap "Save Design" to store it here.</Text>
        </View>
      ):(
        <FlatList data={designs} keyExtractor={i=>i.id} numColumns={2}
          contentContainerStyle={{padding:14,gap:14,paddingBottom:40}}
          columnWrapperStyle={{gap:14,justifyContent:'space-between'}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);load();}} tintColor={Colors.accent}/>}
          renderItem={({item})=>(
            <TouchableOpacity onPress={()=>handleLoad(item)} activeOpacity={0.85} style={s.card}>
              <View style={[s.thumb,{backgroundColor:ROOM_BG[item.roomType]??'#f8f6f2'}]}>
                <Text style={{fontSize:40}}>{ROOM_EMOJIS[item.roomType]??'🏠'}</Text>
              </View>
              <View style={{padding:10}}>
                <Text style={{fontSize:13,fontWeight:'500',color:Colors.text1,marginBottom:3}} numberOfLines={1}>{item.name}</Text>
                <Text style={{fontSize:11,color:Colors.text3,marginBottom:2}}>{item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height} ft</Text>
                {item.tileName&&<Text style={{fontSize:11,color:Colors.text2,marginBottom:2}} numberOfLines={1}>🪨 {item.tileName}</Text>}
                <Text style={{fontSize:10,color:Colors.text3}}>{formatDate(item.createdAt)}</Text>
              </View>
              <View style={{flexDirection:'row',gap:6,paddingHorizontal:10,paddingBottom:10}}>
                <Button label="Load" onPress={()=>handleLoad(item)} variant="primary" size="sm" style={{flex:1}}/>
                <Button label="🗑" onPress={()=>handleDelete(item.id,item.name)} variant="danger" size="sm" style={{width:36,paddingHorizontal:0}}/>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
const s=StyleSheet.create({
  pageHeader:{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border},
  pageTitle:{fontSize:20,fontFamily:'serif',fontWeight:'600',color:Colors.text1},pageSub:{fontSize:12,color:Colors.text3,marginTop:2},
  countBadge:{backgroundColor:Colors.surface2,borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:Colors.border},
  card:{flex:1,backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:Radii.lg,overflow:'hidden',...Shadows.card},
  thumb:{height:110,alignItems:'center',justifyContent:'center'},
});
