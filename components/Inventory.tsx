
import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Search, Filter, MoreVertical, Edit, Trash2, Minus, X, AlertTriangle, ChevronDown, ArrowUpDown, Tag, Layers, ArrowRight, Camera, Upload, Image as ImageIcon, Loader2, LayoutGrid, List, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { Product } from '../types';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', barcode: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, category: 'Informatica', imageUrl: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [catPage, setCatPage] = useState(1);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{id: number, name: string} | null>(null);
  
  const [catDropdownSearch, setCatDropdownSearch] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingCat, setDeletingCat] = useState<{id: number, name: string} | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'err' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'err' | 'info' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await api.getCategories();
    setCategories(data);
  };

  const loadProducts = async () => {
    const data = await api.getProducts();
    setProducts(data);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  );

  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.salePrice) return;
    
    const productData = {
      name: newProduct.name!,
      barcode: newProduct.barcode || Math.floor(Math.random() * 1000000000).toString(),
      costPrice: Number(newProduct.costPrice) || 0,
      salePrice: Number(newProduct.salePrice) || 0,
      stock: Number(newProduct.stock) || 0,
      minStock: Number(newProduct.minStock) || 0,
      category: newProduct.category || 'Informatica',
      imageUrl: newProduct.imageUrl || ''
    };

    try {
      if (editingId) {
        await api.updateProduct(editingId, productData);
        showToast('Produto atualizado com sucesso!');
      } else {
        await api.saveProduct(productData);
        showToast('Produto cadastrado com sucesso!');
      }

      await loadProducts();
      setShowModal(false);
      setNewProduct({ name: '', barcode: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, category: 'Informatica', imageUrl: '' });
      setEditingId(null);
      setIsCatDropdownOpen(false);
      setCatDropdownSearch('');
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar produto', 'err');
    }
  };

  const handleEditClick = (product: Product) => {
    setNewProduct(product);
    setEditingId(product.id);
    setShowModal(true);
  };
  
  const handleAddNewClick = () => {
    setNewProduct({ name: '', barcode: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, category: 'Informatica', imageUrl: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-photos')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(filePath);

      setNewProduct(prev => ({ ...prev, imageUrl: publicUrl }));
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    setDeletingProductId(id);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return;
    try {
      await api.deleteProduct(deletingProductId);
      showToast('Produto excluído com sucesso!', 'info');
      await loadProducts();
    } catch (err) {
      showToast('Erro ao excluir produto', 'err');
    } finally {
      setDeletingProductId(null);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deletingCat) return;
    try {
      await api.deleteCategory(deletingCat.id);
      showToast('Categoria removida');
      await loadCategories();
    } catch (err) {
      showToast('Erro ao excluir categoria', 'err');
    } finally {
      setDeletingCat(null);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('Esta categoria já existe!');
      return;
    }
    try {
      await api.addCategory(name);
      showToast('Categoria adicionada');
      await loadCategories();
      setNewCategoryName('');
    } catch (err) {
      showToast('Erro ao adicionar categoria', 'err');
    }
  };

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-8rem)] max-w-[1700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Modal de Confirmação de Exclusão de Produto */}
      {deletingProductId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Excluir Produto?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Deseja realmente excluir este produto do estoque?<br/>
                <span className="text-rose-500 font-bold uppercase text-[10px] tracking-widest mt-2 block">Esta ação é irreversível</span>
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
              <button 
                onClick={() => setDeletingProductId(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none uppercase text-xs tracking-widest"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Categoria */}
      {deletingCat && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Tag size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Excluir Categoria?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Deseja excluir a categoria <span className="font-black text-slate-800 dark:text-white">"{deletingCat.name}"</span>?<br/>
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-700/50 flex gap-3">
              <button 
                onClick={() => setDeletingCat(null)}
                className="flex-1 py-3.5 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteCategory}
                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none uppercase text-xs tracking-widest"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase mb-1">
            Gestão de <span className="text-gradient">Estoque</span>
          </h1>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Controle de inventário
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="px-6 py-4 glass rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all border border-white/20 shadow-xl shadow-slate-200/10 flex items-center gap-2"
          >
            <Tag size={16} /> Categorias
          </button>
          <button 
            onClick={handleAddNewClick}
            className="px-8 py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[2rem] flex items-center gap-3 transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 active:scale-95 hover:-translate-y-1"
          >
            <Plus size={20} /> Adicionar Produto
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-6">
        {/* Controls Container */}
        <div className="glass-card rounded-[2.5rem] p-6 border-white/20 flex flex-col md:flex-row gap-4 items-center shadow-2xl shadow-slate-200/20">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, código ou EAN..."
              className="w-full pl-16 pr-6 py-5 bg-white/80 dark:bg-slate-950/80 border-2 border-transparent focus:border-indigo-600 rounded-3xl outline-none font-bold text-slate-800 dark:text-white transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600'}`}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Package size={20} />
            </div>
            <div>
              <p className="font-extrabold text-indigo-600 tracking-tight leading-none text-base">{filteredProducts.length} ITENS</p>
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Filtrados</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[3rem] border-white/20 shadow-2xl shadow-slate-200/20 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {viewMode === 'list' ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                  <tr className="border-b border-indigo-50/10 bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Produto & Código</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Categoria</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Precificação</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status Estoque</th>
                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50/5">
                  {paginatedProducts.map((p) => {
                    const margin = p.salePrice > 0 ? ((p.salePrice - (p.costPrice || 0)) / p.salePrice * 100).toFixed(1) : '0';
                    const isLowStock = p.stock <= (p.minStock || 5);
                    return (
                      <tr key={p.id} className="group hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all duration-300">
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm overflow-hidden">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} />
                              )}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 dark:text-white text-base tracking-tight">{p.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.barcode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                            <Layers size={12} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                              {p.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center">
                            <p className="text-lg font-black text-slate-900 dark:text-indigo-400 tracking-tighter">
                              R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                              Margem {margin}%
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                              isLowStock 
                              ? 'bg-rose-100/50 text-rose-600 border border-rose-200/50 animate-pulse' 
                              : 'bg-emerald-100/50 text-emerald-600 border border-emerald-200/50'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-rose-600' : 'bg-emerald-600'}`} />
                              {p.stock} Unidades
                            </div>
                            {isLowStock && <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Nível Crítico</p>}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => handleEditClick(p)} 
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-2xl transition-all shadow-sm hover:scale-110"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => deleteProduct(p.id)} 
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:border-rose-600 rounded-2xl transition-all shadow-sm hover:scale-110"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 p-10 animate-in fade-in zoom-in-95 duration-500">
                {paginatedProducts.map((p) => {
                  const margin = p.salePrice > 0 ? ((p.salePrice - (p.costPrice || 0)) / p.salePrice * 100).toFixed(1) : '0';
                  const isLowStock = p.stock <= (p.minStock || 5);
                  return (
                    <div key={p.id} className="group relative bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-6 transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 flex flex-col gap-5 overflow-hidden">
                      {/* Tag Category */}
                      <div className="absolute top-4 left-4 z-10">
                        <div className="px-4 py-1.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-full border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2 translate-y-0 opacity-100 group-hover:opacity-0 group-hover:-translate-y-4 transition-all">
                          <Layers size={10} className="text-indigo-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{p.category}</span>
                        </div>
                      </div>

                      {/* Product Image */}
                      <div className="aspect-square w-full bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] overflow-hidden group-hover:rounded-2xl transition-all relative shadow-inner">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 group-hover:scale-110 transition-transform duration-700">
                            <Package size={64} />
                          </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <button onClick={() => handleEditClick(p)} className="w-12 h-12 bg-white text-indigo-600 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl flex items-center justify-center">
                            <Edit size={22} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="w-12 h-12 bg-rose-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl flex items-center justify-center">
                            <Trash2 size={22} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 px-1 flex-1">
                        <h4 className="font-black text-slate-800 dark:text-white text-base tracking-tight truncate group-hover:text-indigo-600 transition-colors uppercase">{p.name}</h4>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.barcode}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 mt-auto">
                        <div className="flex items-end justify-between px-1">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-0.5">Venda</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                              R$ {p.salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                            isLowStock ? 'bg-rose-100 text-rose-600 shadow-lg shadow-rose-500/10' : 'bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/10'
                          }`}>
                            {p.stock} UN
                          </div>
                        </div>
                        
                        <div className="h-1 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div 
                             className={`h-full transition-all duration-1000 ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`}
                             style={{ width: `${Math.min(100, (p.stock / (p.minStock || 5)) * 50)}%` }}
                           />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Area */}
          <div className="px-10 py-8 bg-indigo-600/5 border-t border-indigo-50/10 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Página Atual</span>
                <span className="text-sm font-black text-indigo-600 tracking-tight">{currentPage} de {totalPages}</span>
             </div>
             <div className="flex gap-4">
                <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="px-6 py-3 glass-card border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200/20 flex items-center gap-2"
                >
                  <ChevronDown className="rotate-90" size={16} /> Anterior
                </button>
                <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages}
                 className="px-6 py-3 glass-card border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200/20 flex items-center gap-2"
                >
                  Próxima <ChevronDown className="-rotate-90" size={16} />
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Main Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="p-8 border-b border-indigo-50/10 bg-indigo-600/5 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                  {editingId ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Configuração de Ficha Técnica</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Foto do Produto */}
                  <div className="md:col-span-1 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Foto do Produto</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square w-full bg-slate-50 dark:bg-slate-950 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group overflow-hidden relative"
                    >
                      {newProduct.imageUrl ? (
                        <>
                          <img src={newProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="text-white" size={32} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                            {isUploading ? <Loader2 className="animate-spin text-indigo-500" size={32} /> : <ImageIcon size={32} />}
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {isUploading ? 'Subindo...' : 'Upload da Foto'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1">PNG, JPG até 2MB</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden" 
                      accept="image/*"
                    />
                    {newProduct.imageUrl && (
                      <button 
                        onClick={() => setNewProduct(prev => ({ ...prev, imageUrl: '' }))}
                        className="w-full py-2.5 text-[9px] font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-widest"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  {/* Informações em 3 Colunas */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-6">
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Comercial</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-800 dark:text-white transition-all shadow-inner" 
                        value={newProduct.name}
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="Ex: Teclado Mecânico Gamer RGB"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código / EAN</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-800 dark:text-white shadow-inner"
                        value={newProduct.barcode}
                        onChange={e => setNewProduct({...newProduct, barcode: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                      <div className="relative">
                        <button
                          onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent hover:border-indigo-200 rounded-2xl text-left flex justify-between items-center font-bold text-slate-800 dark:text-white shadow-inner transition-all"
                        >
                          <span className="truncate">{newProduct.category || 'Selecionar...'}</span>
                          <ChevronDown size={14} className={`text-slate-300 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCatDropdownOpen && (
                          <div className="absolute top-[calc(100%+8px)] left-0 w-full glass rounded-3xl border border-white/20 shadow-2xl z-[120] p-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="relative">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Filtrar..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-slate-900/50 rounded-xl outline-none border border-slate-100 dark:border-slate-800 text-xs font-bold dark:text-white"
                                value={catDropdownSearch}
                                onChange={(e) => setCatDropdownSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                              {categories
                                .filter(cat => cat.name.toLowerCase().includes(catDropdownSearch.toLowerCase()))
                                .map(cat => (
                                  <button
                                    key={cat.id}
                                    onClick={() => {
                                      setNewProduct({...newProduct, category: cat.name});
                                      setIsCatDropdownOpen(false);
                                    }}
                                    className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      newProduct.category === cat.name 
                                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-indigo-600'
                                    }`}
                                  >
                                    {cat.name}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estoque Físico</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-black text-slate-800 dark:text-white shadow-inner"
                        value={newProduct.stock}
                        onFocus={() => { if (newProduct.stock === 0) setNewProduct({...newProduct, stock: '' as any}); }}
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value === '' ? '' as any : Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço de Custo</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">R$</span>
                        <input 
                          type="text" 
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-black text-slate-800 dark:text-white shadow-inner"
                          value={formatBRL(Number(newProduct.costPrice) || 0).replace('R$', '').trim()}
                          onChange={e => {
                            const value = e.target.value.replace(/\D/g, "");
                            setNewProduct({...newProduct, costPrice: Number(value) / 100});
                          }}
                        />
                      </div>
                    </div>
                     
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Preço de Venda</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-indigo-400 text-lg">R$</span>
                        <input 
                          type="text" 
                          className="w-full pl-12 pr-5 py-4 bg-indigo-50/30 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-black text-xl text-indigo-600 shadow-inner"
                          value={formatBRL(Number(newProduct.salePrice) || 0).replace('R$', '').trim()}
                          onChange={e => {
                            const value = e.target.value.replace(/\D/g, "");
                            setNewProduct({...newProduct, salePrice: Number(value) / 100});
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Aviso Mínimo</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 bg-rose-50/30 dark:bg-slate-950 border-2 border-transparent focus:border-rose-500 rounded-2xl outline-none font-black text-rose-600 shadow-inner"
                        value={newProduct.minStock}
                        onFocus={() => { if (newProduct.minStock === 0) setNewProduct({...newProduct, minStock: '' as any}); }}
                        onChange={e => setNewProduct({...newProduct, minStock: e.target.value === '' ? '' as any : Number(e.target.value)})}
                      />
                    </div>

                  </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-indigo-50/10 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Descartar
              </button>
              <button 
                onClick={handleSaveProduct}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
              >
                Salvar Produto <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Modern Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10 flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-indigo-50/10 bg-indigo-600/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                  Departamentos
                </h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                  Organização e Mix de Produtos
                </p>
              </div>
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              {/* Add Simple Field */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Criar Departamento</label>
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Nome da categoria..."
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none font-bold text-slate-800 dark:text-white shadow-inner transition-all placeholder:text-slate-300"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    />
                  </div>
                  <button 
                    onClick={handleAddCategory} 
                    disabled={!newCategoryName.trim()}
                    className="px-6 py-4 bg-indigo-600 hover:bg-slate-900 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Plus size={24} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Browse List */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{categories.length} Categorias</h4>
                    <div className="relative w-64 group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={14} />
                       <input 
                         type="text" 
                         placeholder="Filtrar..."
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300 dark:text-white"
                         value={categorySearch}
                         onChange={e => setCategorySearch(e.target.value)}
                       />
                    </div>
                 </div>

                 <div className="rounded-2xl border border-slate-100 dark:border-slate-800/60 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {categories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map(cat => (
                          <li key={cat.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500">
                                <Layers size={14} />
                              </div>
                              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{cat.name}</span>
                            </div>
                            
                            {cat.name !== 'Geral' ? (
                              <button 
                                onClick={() => {
                                  setDeletingCat({id: cat.id, name: cat.name});
                                }} 
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Excluir Categoria"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Padrão</span>
                            )}
                          </li>
                        ))
                      }
                      
                      {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <li className="p-8 text-center text-slate-400 text-sm font-medium">
                          Nenhuma categoria encontrada.
                        </li>
                      )}
                    </ul>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-indigo-50/10 shrink-0">
              <button 
                onClick={() => setShowCategoryModal(false)} 
                className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-[500] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border-2 ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 
          toast.type === 'err' ? 'bg-rose-600 border-rose-400 text-white' : 
          'bg-indigo-600 border-indigo-400 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Inventory;
