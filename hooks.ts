import { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabase';

// Map local storage keys to Supabase table names
const TABLE_MAPPING: Record<string, string> = {
  'career_experiences': 'experiences',
  'career_jobs': 'jobs',
  'chat_history': 'messages'
};

export function usePersistentData<T extends { id?: string }>(key: string, initialValue: T[]): [T[], React.Dispatch<React.SetStateAction<T[]>>] {
  const [data, setData] = useState<T[]>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use a ref to track if we've done the initial fetch to prevent loops
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Try loading from Supabase if configured
      if (supabase) {
        const tableName = TABLE_MAPPING[key] || key;
        try {
          const { data: remoteData, error } = await supabase
            .from(tableName)
            .select('*');
            
          if (!error && remoteData) {
            // Support both structured columns AND 'data' JSONB column pattern
            // We prefer 'data' column if it exists as it supports schema-less data
            const parsedData = remoteData.map(row => {
                if (row.data && typeof row.data === 'object') {
                    return { ...row.data, id: row.id }; // Ensure ID is consistent
                }
                return row;
            });
            
            console.log(`Loaded ${parsedData.length} items from ${tableName}`);
            setData(parsedData as T[]);
            setIsLoaded(true);
            return;
          } else if (error) {
            console.warn(`Supabase load error for ${tableName}:`, error.message);
          }
        } catch (err) {
          console.warn('Supabase connection failed, falling back to local storage', err);
        }
      }

      // 2. Fallback to LocalStorage
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setData(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
      }
      setIsLoaded(true);
    };

    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchData();
    }
  }, [key]);

  // Wrapper for setData that syncs changes
  const setAndSyncData: React.Dispatch<React.SetStateAction<T[]>> = (action) => {
    setData((prevData) => {
      const newData = typeof action === 'function' 
        ? (action as (prev: T[]) => T[])(prevData)
        : action;

      // Sync to LocalStorage
      try {
        window.localStorage.setItem(key, JSON.stringify(newData));
      } catch (e) {
        console.error("Local storage save failed", e);
      }

      // Sync to Supabase
      if (supabase && isLoaded) {
        const tableName = TABLE_MAPPING[key] || key;
        
        (async () => {
          try {
             // We use a 'data' JSONB column to store the full object.
             // This avoids strict schema requirements for every field in the object.
             const payload = newData.map(item => ({
                 id: item.id,
                 data: item, 
                 updated_at: new Date().toISOString()
             }));

             // 1. Upsert all current items
             if (payload.length > 0) {
               const { error: upsertError } = await supabase
                 .from(tableName)
                 .upsert(payload);
               
               if (upsertError) console.error(`Supabase upsert error for ${tableName}:`, upsertError);
             }

             // 2. Delete items that are no longer in the state
             const currentIds = newData.map(item => item.id).filter(Boolean) as string[];
             
             // If we have items, delete anything not in the list.
             // If we have 0 items, we delete EVERYTHING in the table (for this user/context).
             
             const query = supabase.from(tableName).delete();
             
             if (currentIds.length > 0) {
                query.not('id', 'in', `(${currentIds.join(',')})`);
             } else {
                // Delete all rows if current state is empty
                // We use a condition that is always true for existing rows but effectively "deletes all"
                // when no IDs are excluded.
                query.neq('id', 'placeholder_force_delete_all'); 
             }

             const { error: deleteError } = await query;
             if (deleteError) console.error(`Supabase delete error for ${tableName}:`, deleteError);

          } catch (err) {
            console.error("Supabase sync failed", err);
          }
        })();
      }

      return newData;
    });
  };

  return [data, setAndSyncData];
}