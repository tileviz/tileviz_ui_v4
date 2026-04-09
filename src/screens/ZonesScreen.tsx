// ZonesScreen — zone design + floating tile/color panel (#5)
import React,{useState,useCallback} from 'react';
import {View,Text,ScrollView,TouchableOpacity,StyleSheet,Modal,Pressable,FlatList,Animated} from 'react-native';
import {Colors,Radii,Shadows} from '../config/theme';
import {useAppStore} from '../store/app.store';
import {useCatalogStore} from '../store/catalog.store';
import {ZoneRow,Tile} from '../types';

const WALL_DEFS={
  bathroom:[{key:'floor',icon:'▦',label:'Floor',single:true},{pairs:[{key:'wall_n',icon:'🧱',label:'North Wall'},{key:'wall_s',icon:'🧱',label:'South Wall'}]},{pairs:[{key:'wall_e',icon:'🧱',label:'East Wall'},{key:'wall_w',icon:'🧱',label:'West Wall'}]}],
  kitchen:[{key:'floor',icon:'▦',label:'Floor',single:true},{pairs:[{key:'wall_n',icon:'🧱',label:'North Wall'},{key:'wall_s',icon:'🧱',label:'South Wall'}]},{pairs:[{key:'wall_e',icon:'🧱',label:'East Wall'},{key:'wall_w',icon:'🧱',label:'West Wall'}]}],
  bedroom:[{key:'floor',icon:'▦',label:'Floor',single:true},{pairs:[{key:'wall_n',icon:'🧱',label:'North Wall'},{key:'wall_s',icon:'🧱',label:'South Wall'}]},{pairs:[{key:'wall_e',icon:'🧱',label:'East Wall'},{key:'wall_w',icon:'🧱',label:'West Wall'}]}],
  balcony:[{key:'floor',icon:'▦',label:'Floor',single:true},{pairs:[{key:'wall_n',icon:'🧱',label:'North Wall'},{key:'wall_s',icon:'🧱',label:'South Wall'}]}],
  parking:[{key:'floor',icon:'▦',label:'Floor',single:true}],
} as any;

const QUICK_COLORS=['#f5f5f5','#1a1a2e','#c8b89a','#4a7fd4','#4caf74','#e05252','#5c3d1e','#3a5a8a','#cccccc','#f4f0e8'];

export function ZonesScreen(){
  const {roomType,dimensions,selectedTileSize,zoneRows,setZoneRows,focusedZoneKey,setFocusedZoneKey}=useAppStore();
  const {selectedTile,tiles}=useCatalogStore();
  const [panelOpen,setPanelOpen]=useState(false);
  const [panelTab,setPanelTab]=useState<'tiles'|'colors'>('tiles');

  const [tw,th]=selectedTileSize.split('x').map(Number);
  const rowCount=Math.max(1,Math.round(dimensions.height/(th/12)));
  const walls=WALL_DEFS[roomType]??WALL_DEFS.bathroom;

  const getRow=(wallKey:string,rowIndex:number)=>zoneRows.find(r=>r.wallKey===wallKey&&r.rowIndex===rowIndex);
  const assignedCount=zoneRows.filter(r=>r.tileId).length;
  const totalRows=walls.reduce((acc:number,w:any)=>{
    if(w.single)return acc+1;
    if(w.pairs)return acc+w.pairs.length*rowCount;
    return acc;
  },0);

  function focusRow(wallKey:string,rowIndex:number){
    const k=`${wallKey}:${rowIndex}`;
    setFocusedZoneKey(focusedZoneKey===k?null:k);
    setPanelOpen(true);
  }

  function applyTile(tile:Tile){
    if(!focusedZoneKey)return;
    const [wallKey,ri]=focusedZoneKey.split(':');
    const rowIndex=parseInt(ri);
    setZoneRows(zoneRows.some(r=>r.wallKey===wallKey&&r.rowIndex===rowIndex)
      ?zoneRows.map(r=>r.wallKey===wallKey&&r.rowIndex===rowIndex?{...r,tileId:tile.id,tileName:tile.name,color:tile.color,tileImageUri:tile.imageUri}:r)
      :[...zoneRows,{rowIndex,wallKey,tileId:tile.id,tileName:tile.name,color:tile.color,tileImageUri:tile.imageUri}]
    );
  }

  function applyColor(color:string){
    if(!focusedZoneKey)return;
    const [wallKey,ri]=focusedZoneKey.split(':');
    const rowIndex=parseInt(ri);
    setZoneRows(zoneRows.some(r=>r.wallKey===wallKey&&r.rowIndex===rowIndex)
      ?zoneRows.map(r=>r.wallKey===wallKey&&r.rowIndex===rowIndex?{...r,color}:r)
      :[...zoneRows,{rowIndex,wallKey,color}]
    );
  }

  function clearRow(wallKey:string,rowIndex:number){
    setZoneRows(zoneRows.filter(r=>!(r.wallKey===wallKey&&r.rowIndex===rowIndex)));
  }

  const hintState=focusedZoneKey?'focused':assignedCount>=totalRows?'done':'info';

  return(
    <View style={{flex:1,backgroundColor:Colors.surface}}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Zone Design</Text>
          <Text style={s.pageSub}>Tap a row, then pick a tile or color from the panel.</Text>
        </View>
        <TouchableOpacity onPress={()=>setPanelOpen(true)} style={s.panelBtn}>
          <Text style={s.panelBtnTxt}>🎨 Tile Panel</Text>
        </TouchableOpacity>
      </View>

      {/* Hint bar */}
      <View style={[s.hintBar,hintState==='focused'?s.hintFocused:hintState==='done'?s.hintDone:s.hintInfo]}>
        {hintState==='focused'&&<View style={s.hintDot}/>}
        <Text style={[s.hintTxt,hintState==='focused'&&{color:'#896e38'},hintState==='done'&&{color:'#2e7d4f'}]}>
          {hintState==='focused'?'Row selected — pick tile or color from panel':hintState==='done'?`All rows assigned — ready to generate!`:'Tap any row to assign a tile or color'}
        </Text>
        {focusedZoneKey&&<TouchableOpacity onPress={()=>{setFocusedZoneKey(null);setPanelOpen(false);}} style={s.deselBtn}><Text style={{fontSize:11,color:'#896e38'}}>Deselect</Text></TouchableOpacity>}
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:14,gap:8,paddingBottom:40}}>
        {walls.map((w:any,idx:number)=>{
          if(w.single){
            return(
              <View key={w.key}>
                <Text style={s.secLabel}>Floor</Text>
                <WallCard wallKey={w.key} icon={w.icon} label={w.label} rowCount={1} focusedKey={focusedZoneKey} getRow={getRow} onFocus={focusRow} onClear={clearRow}/>
              </View>
            );
          }
          return(
            <View key={idx}>
              {idx===1&&<Text style={s.secLabel}>Walls</Text>}
              <View style={{flexDirection:'row',gap:8}}>
                {w.pairs.map((p:any)=>(
                  <WallCard key={p.key} wallKey={p.key} icon={p.icon} label={p.label} rowCount={rowCount} focusedKey={focusedZoneKey} getRow={getRow} onFocus={focusRow} onClear={clearRow} half/>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FLOATING TILE/COLOR PANEL (#5) */}
      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={()=>setPanelOpen(false)}>
        <Pressable style={s.panelBackdrop} onPress={()=>setPanelOpen(false)}>
          <Pressable style={s.panel} onPress={()=>{}}>
            <View style={s.panelHandle}/>
            <Text style={s.panelTitle}>
              {focusedZoneKey?`Applying to Row ${focusedZoneKey.split(':')[1] ? parseInt(focusedZoneKey.split(':')[1])+1 : ''}`:' Select a row first'}
            </Text>
            {/* Tabs */}
            <View style={s.panelTabs}>
              {(['tiles','colors'] as const).map(t=>(
                <TouchableOpacity key={t} onPress={()=>setPanelTab(t)} style={[s.panelTabBtn,panelTab===t&&s.panelTabActive]}>
                  <Text style={[s.panelTabTxt,panelTab===t&&{color:Colors.gold}]}>{t==='tiles'?'🪨 Tiles':'🎨 Colors'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {panelTab==='tiles'?(
              <FlatList numColumns={3} data={tiles.slice(0,24)} keyExtractor={i=>i.id}
                contentContainerStyle={{padding:8,gap:8}}
                columnWrapperStyle={{gap:8,marginBottom:8}}
                renderItem={({item})=>(
                  <TouchableOpacity onPress={()=>{applyTile(item);setPanelOpen(false);}}
                    style={[s.panelTile,selectedTile?.id===item.id&&{borderColor:Colors.gold,borderWidth:2}]}>
                    <View style={[s.panelTileThumb,{backgroundColor:item.color}]}/>
                    <Text style={s.panelTileName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.panelTileSub}>{item.widthIn}×{item.heightIn}in</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{textAlign:'center',color:Colors.text3,padding:20}}>No tiles loaded. Go to Catalog first.</Text>}
              />
            ):(
              <View style={{padding:12}}>
                <Text style={{fontSize:12,color:Colors.text2,marginBottom:10,fontWeight:'500'}}>Quick Colors</Text>
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
                  {QUICK_COLORS.map(c=>(
                    <TouchableOpacity key={c} onPress={()=>{applyColor(c);setPanelOpen(false);}}
                      style={[s.colorSwatch,{backgroundColor:c},c==='#f5f5f5'&&{borderColor:Colors.border,borderWidth:1}]}>
                      <View style={{flex:1}}/>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface WallCardProps{wallKey:string;icon:string;label:string;rowCount:number;focusedKey:string|null;getRow:(wk:string,ri:number)=>ZoneRow|undefined;onFocus:(wk:string,ri:number)=>void;onClear:(wk:string,ri:number)=>void;half?:boolean;}
function WallCard({wallKey,icon,label,rowCount,focusedKey,getRow,onFocus,onClear,half}:WallCardProps){
  const assigned=Array.from({length:rowCount},(_,i)=>getRow(wallKey,i)).filter(Boolean).length;
  return(
    <View style={[s.wallCard,half&&{flex:1}]}>
      <View style={s.wallHeader}>
        <View style={s.wallAccent}/>
        <Text style={{fontSize:13}}>{icon}</Text>
        <Text style={s.wallLabel} numberOfLines={1}>{label}</Text>
        <View style={s.wallBadge}><Text style={{fontSize:10,color:Colors.text3,fontWeight:'500'}}>{assigned}/{rowCount}</Text></View>
      </View>
      <View style={{padding:8,gap:5}}>
        {Array.from({length:rowCount},(_,r)=>{
          const row=getRow(wallKey,r);
          const k=`${wallKey}:${r}`;
          const focused=focusedKey===k;
          const isAssigned=!!row?.tileId||!!row?.color;
          return(
            <TouchableOpacity key={r} onPress={()=>onFocus(wallKey,r)}
              style={[s.rowChip,focused&&s.rowChipFocused,isAssigned&&s.rowChipAssigned,!isAssigned&&{borderStyle:'dashed'}]}>
              <View style={[s.chipThumb,isAssigned&&row?.color?{backgroundColor:row.color}:{backgroundColor:Colors.surface2}]}/>
              <View style={{flex:1}}>
                <Text style={[{fontSize:9,fontWeight:'700',color:Colors.text3,letterSpacing:0.04},focused&&{color:Colors.gold}]}>ROW {r+1}</Text>
                <Text style={[{fontSize:11,fontWeight:'500',color:Colors.text2},!isAssigned&&{color:Colors.text3,fontStyle:'italic',fontWeight:'400'}]} numberOfLines={1}>
                  {isAssigned?row?.tileName??'Custom color':'No tile assigned'}
                </Text>
              </View>
              {isAssigned&&<View style={{backgroundColor:'rgba(76,183,116,0.14)',borderRadius:3,paddingHorizontal:4,paddingVertical:1}}><Text style={{fontSize:9,fontWeight:'700',color:'#2e7d4f'}}>✓</Text></View>}
              {isAssigned&&<TouchableOpacity onPress={()=>onClear(wallKey,r)} style={s.clearBtn}><Text style={{fontSize:9,color:Colors.text3}}>✕</Text></TouchableOpacity>}
              <Text style={[{fontSize:11,color:Colors.text3},focused&&{color:Colors.gold}]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s=StyleSheet.create({
  pageHeader:{padding:16,backgroundColor:Colors.white,borderBottomWidth:1,borderBottomColor:Colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  pageTitle:{fontSize:20,fontFamily:'serif',fontWeight:'600',color:Colors.text1},pageSub:{fontSize:12,color:Colors.text3,marginTop:2},
  panelBtn:{backgroundColor:Colors.primary2,paddingHorizontal:12,paddingVertical:7,borderRadius:Radii.md},panelBtnTxt:{fontSize:12,fontWeight:'600',color:'#fff'},
  hintBar:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderBottomWidth:1,borderBottomColor:Colors.border},
  hintInfo:{backgroundColor:Colors.surface2,borderColor:Colors.border},
  hintFocused:{backgroundColor:'rgba(200,169,110,0.1)',borderColor:'rgba(200,169,110,0.45)'},
  hintDone:{backgroundColor:'rgba(76,183,116,0.08)',borderColor:'rgba(76,183,116,0.28)'},
  hintDot:{width:7,height:7,borderRadius:4,backgroundColor:Colors.gold},hintTxt:{flex:1,fontSize:12,fontWeight:'500',color:Colors.text2},
  deselBtn:{borderWidth:1,borderColor:'rgba(200,169,110,0.45)',borderRadius:Radii.sm,paddingHorizontal:9,paddingVertical:3},
  secLabel:{fontSize:10,fontWeight:'700',letterSpacing:1,textTransform:'uppercase',color:Colors.text3,paddingVertical:4,paddingHorizontal:2,marginTop:4},
  wallCard:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:12,overflow:'hidden'},
  wallHeader:{flexDirection:'row',alignItems:'center',gap:6,padding:9,borderBottomWidth:1,borderBottomColor:Colors.border,backgroundColor:'rgba(200,169,110,0.04)',position:'relative'},
  wallAccent:{position:'absolute',left:0,top:0,bottom:0,width:3,backgroundColor:Colors.gold,borderRadius:2},
  wallLabel:{flex:1,fontSize:12,fontWeight:'600',color:Colors.text1,marginLeft:6},
  wallBadge:{backgroundColor:Colors.surface,borderWidth:1,borderColor:Colors.border,borderRadius:20,paddingHorizontal:6,paddingVertical:1},
  rowChip:{flexDirection:'row',alignItems:'center',gap:6,padding:6,borderWidth:1.5,borderColor:Colors.border,borderRadius:Radii.md,backgroundColor:Colors.surface},
  rowChipFocused:{borderColor:Colors.gold,backgroundColor:'rgba(200,169,110,0.1)',shadowColor:Colors.gold,shadowOpacity:0.2,shadowRadius:4,elevation:2},
  rowChipAssigned:{borderColor:'rgba(76,183,116,0.38)',backgroundColor:'rgba(76,183,116,0.04)'},
  chipThumb:{width:24,height:24,borderRadius:5,borderWidth:1,borderColor:Colors.border,overflow:'hidden'},
  clearBtn:{width:20,height:20,borderRadius:4,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface2,alignItems:'center',justifyContent:'center'},
  // Floating panel (#5)
  panelBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.3)',justifyContent:'flex-end'},
  panel:{backgroundColor:Colors.white,borderTopLeftRadius:20,borderTopRightRadius:20,maxHeight:'70%',paddingBottom:20,...Shadows.modal},
  panelHandle:{width:40,height:4,backgroundColor:Colors.border,borderRadius:2,alignSelf:'center',marginTop:10,marginBottom:8},
  panelTitle:{fontSize:13,fontWeight:'600',color:Colors.text2,textAlign:'center',marginBottom:8},
  panelTabs:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:Colors.border,marginBottom:4},
  panelTabBtn:{flex:1,paddingVertical:10,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  panelTabActive:{borderBottomColor:Colors.gold},
  panelTabTxt:{fontSize:13,fontWeight:'500',color:Colors.text2},
  panelTile:{flex:1,backgroundColor:Colors.surface,borderRadius:Radii.md,padding:6,alignItems:'center',borderWidth:1.5,borderColor:Colors.border},
  panelTileThumb:{width:'100%',aspectRatio:1,borderRadius:6,marginBottom:4},
  panelTileName:{fontSize:10,fontWeight:'600',color:Colors.text1,textAlign:'center'},
  panelTileSub:{fontSize:9,color:Colors.text3,textAlign:'center'},
  colorSwatch:{width:44,height:44,borderRadius:22,...Shadows.card},
});
