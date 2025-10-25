'use client';
import { useEffect, useState, useTransition } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listCategories, createCategory, updateCategory, type Category } from '@/services/categories';

// Schema de validação para o formulário de criação
const createCategorySchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  type: z.enum(['expense', 'income']),
});
type CreateCategoryForm = z.infer<typeof createCategorySchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCategoryForm>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { type: activeTab },
  });

  // Função para carregar as categorias (incluindo arquivadas)
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      // Buscar todas as categorias (sem filtro de archived)
      const data = await listCategories({ type: 'all' });
      setCategories(data as Category[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit: SubmitHandler<CreateCategoryForm> = async (formData) => {
    startTransition(async () => {
      try {
        await createCategory({ name: formData.name, type: activeTab });
        reset({ name: '', type: activeTab });
        await loadCategories(); // Recarrega a lista
      } catch (err: any) {
        setError(err.message);
      }
    });
  };
  
  const handleUpdateName = async (id: string, currentName: string, currentType: 'expense' | 'income') => {
    const newName = prompt('Digite o novo nome para a categoria:', currentName);
    if (newName && newName.trim() && newName !== currentName) {
        startTransition(async () => {
            await updateCategory(id, { name: newName, type: currentType });
            await loadCategories();
        });
    }
  };
  
  const handleToggleArchive = async (id: string, isArchived: boolean) => {
      if (confirm(`Tem certeza que deseja ${isArchived ? 'restaurar' : 'arquivar'} esta categoria?`)) {
          startTransition(async () => {
            // Atualizar archived diretamente no Supabase (não via updateCategory)
            const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
            const supabase = createClientComponentClient();
            await supabase.from('categories').update({ archived: !isArchived }).eq('id', id);
            await loadCategories();
          });
      }
  };

  const filteredCategories = categories.filter(
    c => c.type === activeTab && (showArchived ? true : !(c.archived ?? false))
  );

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gerenciar Categorias</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna do Formulário */}
        <div className="md:col-span-1">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Nova Categoria</h2>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome</label>
              <input {...register('name')} id="name" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <button type="submit" disabled={isPending} className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400">
              {isPending ? 'Salvando...' : `Adicionar ${activeTab === 'expense' ? 'Despesa' : 'Receita'}`}
            </button>
          </form>
        </div>

        {/* Coluna da Lista */}
        <div className="md:col-span-2">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              <button onClick={() => setActiveTab('expense')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'expense' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Despesas
              </button>
              <button onClick={() => setActiveTab('income')} className={`py-3 px-1 border-b-2 font-medium ${activeTab === 'income' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Receitas
              </button>
            </nav>
          </div>

          <div className="bg-white rounded-lg shadow-md mt-4">
            <div className="p-4 flex justify-end">
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                    <input type="checkbox" checked={showArchived} onChange={() => setShowArchived(!showArchived)} className="rounded"/>
                    <span>Mostrar arquivadas</span>
                </label>
            </div>
            {isLoading ? <p className="p-4 text-center">Carregando...</p> : (
              <ul className="divide-y divide-gray-200">
                {filteredCategories.map(cat => (
                  <li key={cat.id} className={`p-4 flex justify-between items-center ${cat.archived ? 'opacity-50' : ''}`}>
                    <span>{cat.name}</span>
                    <div className="space-x-2">
                      <button onClick={() => handleUpdateName(cat.id, cat.name, cat.type)} disabled={isPending} className="text-sm text-indigo-600 hover:underline disabled:text-gray-400">Renomear</button>
                      <button onClick={() => handleToggleArchive(cat.id, cat.archived ?? false)} disabled={isPending} className={`text-sm ${cat.archived ? 'text-green-600' : 'text-red-600'} hover:underline disabled:text-gray-400`}>
                        {cat.archived ? 'Restaurar' : 'Arquivar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && filteredCategories.length === 0 && <p className="p-4 text-center text-gray-500">Nenhuma categoria encontrada.</p>}
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 mt-4">Erro: {error}</p>}
    </main>
  );
}
