import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Role } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// Cache for token in sessionStorage to persist across refreshes
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null;
let isSigningIn = false;

interface User {
  email: string;
  name: string;
  role: Role;
  accessToken: string;
  photoURL?: string;
  allowedMenus?: string[];
  isEmailPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changeRole: (role: Role) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const customSessionStr = typeof window !== 'undefined' ? sessionStorage.getItem('custom_user_session') : null;
    if (customSessionStr) {
       try {
         const customUser = JSON.parse(customSessionStr);
         setUser(customUser);
         setIsLoading(false);
         return;
       } catch (e) {
         sessionStorage.removeItem('custom_user_session');
       }
    }

    // Clean up any stale localStorage sessions to ensure Login screen displays on first launch
    if (typeof window !== 'undefined') {
      localStorage.removeItem('custom_user_session');
      localStorage.removeItem('google_access_token');
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          if (cachedAccessToken) {
            const res = await fetch('/api/auth/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: cachedAccessToken, email: firebaseUser.email })
            });
            const validation = await res.json();
            
            if (validation.allowed) {
               setUser({
                 email: firebaseUser.email || '',
                 name: firebaseUser.displayName || 'User',
                 role: validation.role || 'SALE',
                 accessToken: cachedAccessToken,
                 photoURL: firebaseUser.photoURL || undefined,
               });
               setAuthError(null);
            } else {
               await auth.signOut();
               cachedAccessToken = null;
               if (typeof window !== 'undefined') {
                 sessionStorage.removeItem('google_access_token');
                 localStorage.removeItem('google_access_token');
               }
               setUser(null);
               setAuthError(validation.error || 'Access Denied');
            }
          } else if (!isSigningIn) {
            await auth.signOut();
            cachedAccessToken = null;
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('google_access_token');
              localStorage.removeItem('google_access_token');
            }
            setUser(null);
          }
        } else {
          cachedAccessToken = null;
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('google_access_token');
            localStorage.removeItem('google_access_token');
          }
          setUser(null);
        }
      } catch (err: any) {
        console.error('Validation error:', err);
        setAuthError(err.message || 'Validation failed');
        await auth.signOut();
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('google_access_token');
          localStorage.removeItem('google_access_token');
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      isSigningIn = true;
      setAuthError(null);
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }

      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential.accessToken, email: result.user.email })
      });
      const validation = await res.json();
      
      if (!validation.allowed) {
        await auth.signOut(); // Immediately sign out if invalid
        setAuthError(validation.error || 'Access Denied');
        throw new Error(validation.error);
      }

      cachedAccessToken = credential.accessToken;
      if (typeof window !== 'undefined') localStorage.setItem('google_access_token', credential.accessToken);
      setUser({
        email: result.user.email || '',
        name: result.user.displayName || 'User',
        role: validation.role || 'SALE',
        accessToken: cachedAccessToken,
        photoURL: result.user.photoURL || undefined,
      });
      setAuthError(null);
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (!authError && error.message) {
         // Keep custom error message if it wasn't already set
         setAuthError(error.message.includes('popup') ? 'Popup closed by user' : error.message);
      }
      throw error;
    } finally {
      isSigningIn = false;
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เข้าสู่ระบบล้มเหลว');
      }

      const customUser: User = {
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        accessToken: 'custom_email_password_token',
        allowedMenus: data.user.allowedMenus,
        isEmailPassword: true
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('custom_user_session', JSON.stringify(customUser));
        sessionStorage.setItem('google_access_token', 'custom_email_password_token');
        localStorage.removeItem('custom_user_session'); // Clean stale localStorage
        localStorage.removeItem('google_access_token');
        if (data.spreadsheetId) {
          sessionStorage.setItem('spreadsheet_id', data.spreadsheetId);
        }
      }

      setUser(customUser);
      setAuthError(null);
    } catch (error: any) {
      console.error('Custom login error:', error);
      setAuthError(error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await auth.signOut().catch(() => {});
    cachedAccessToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('google_access_token');
      sessionStorage.removeItem('custom_user_session');
      sessionStorage.removeItem('spreadsheet_id');
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('custom_user_session');
      localStorage.removeItem('spreadsheet_id');
    }
    setUser(null);
    setAuthError(null);
  };

  const changeRole = (newRole: Role) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithEmailPassword, logout, changeRole, isAuthenticated: !!user, isLoading, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
