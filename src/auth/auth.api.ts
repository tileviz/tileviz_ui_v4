import client,{storeTokens,clearTokens} from '../api/client';
import {User,UserRole} from '../types';
import {initials} from '../utils/format';
export interface LoginPayload{email:string;password:string;}
export interface AuthUser{id:string;name:string;email:string;role:UserRole;shop:string|null;assignedShop:string|null;isActive:boolean;}
export interface AuthResponse{success:boolean;accessToken:string;refreshToken:string;user:AuthUser;}
export async function apiLogin(p:LoginPayload):Promise<AuthResponse>{const{data}=await client.post<AuthResponse>('/api/auth/login',p);if(data.success)await storeTokens(data.accessToken,data.refreshToken);return data;}
export async function apiLogout():Promise<void>{try{await client.post('/api/auth/logout');}finally{await clearTokens();}}
export async function apiGetMe():Promise<AuthUser>{const{data}=await client.get<{success:boolean;user:AuthUser}>('/api/auth/me');return data.user;}
export function toAppUser(u:AuthUser):User{return{id:u.id,name:u.name,email:u.email,role:u.role,initials:initials(u.name),shop:u.shop,assignedShop:u.assignedShop,isActive:u.isActive};}
