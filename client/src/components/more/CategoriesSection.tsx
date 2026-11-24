import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, Check } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { api } from '../../services/api';
import { Category } from '../../types';
import { DynamicIcon, AVAILABLE_ICONS, AVAILABLE_COLORS } from '../DynamicIcon';

export const CategoriesSection: React.FC = () => {
  const { categories, refreshData } = useFinance();

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#059669');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setIcon('Tag');
    setColor('#059669');
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setIcon(cat.icon);
    setColor(cat.color);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        await api.categories.create({
          name: name.trim(),
          type,
          icon,
          color,
        });
      }

      await refreshData();
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (window.confirm(`Excluir categoria "${cat.name}"? Movimentações existentes ficarão sem categoria.`)) {
      try {
        await api.categories.delete(cat.id);
        await refreshData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const displayedCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Categorias Financeiras
          </h2>
          <p className="text-xs text-slate-400">
            Personalize suas categorias de receitas e despesas
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Nova Categoria</span>
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl max-w-xs">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'expense'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Despesas ({categories.filter((c) => c.type === 'expense').length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Receitas ({categories.filter((c) => c.type === 'income').length})
        </button>
      </div>

      {/* Grid of categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {displayedCategories.map((cat) => (
          <div
            key={cat.id}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between group hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                style={{ backgroundColor: cat.color }}
              >
                <DynamicIcon name={cat.icon} size={17} />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {cat.name}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEditModal(cat)}
                className="p-1 text-slate-400 hover:text-emerald-600 rounded-md"
                title="Editar"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => handleDelete(cat)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-md"
                title="Excluir"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3">
              {!editingCategory && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold ${
                      type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold ${
                      type === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    Receita
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  placeholder="Ex: Farmácia, Cinema, Vendas..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Ícone</label>
                <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                        icon === ic
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <DynamicIcon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1">Cor</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all shrink-0 ${
                        color === c ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
