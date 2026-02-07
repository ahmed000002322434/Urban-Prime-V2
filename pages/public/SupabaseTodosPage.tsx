import React, { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type TodoRecord = {
  id?: string | number;
  title?: string;
  name?: string;
  created_at?: string;
  [key: string]: any;
};

const SupabaseTodosPage: React.FC = () => {
  const [todos, setTodos] = useState<TodoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const getTodos = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase.from('todos').select('*');

      if (!isMounted) return;
      if (fetchError) {
        console.error(fetchError);
        setError(fetchError.message);
        setTodos([]);
      } else {
        setTodos(Array.isArray(data) ? (data as TodoRecord[]) : []);
      }
      setIsLoading(false);
    };

    getTodos();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-text-primary py-24">
      <div className="container mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <h1 className="text-3xl font-bold font-display">Supabase Todos</h1>
            <p className="text-sm text-text-secondary mt-2">
              Live data from Supabase (kept alongside Firebase).
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-6">
            {isLoading && <p className="text-sm text-text-secondary">Loading...</p>}
            {!isLoading && error && (
              <p className="text-sm text-red-500">Failed to load todos: {error}</p>
            )}
            {!isLoading && !error && todos.length === 0 && (
              <p className="text-sm text-text-secondary">No todos found.</p>
            )}
            {!isLoading && !error && todos.length > 0 && (
              <ul className="space-y-3">
                {todos.map(todo => {
                  const label = todo.title || todo.name || JSON.stringify(todo);
                  const key = todo.id ?? label;
                  return (
                    <li key={key} className="p-4 rounded-2xl border border-border bg-surface-soft text-sm">
                      {label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupabaseTodosPage;
