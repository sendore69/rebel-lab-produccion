import { useEffect, useState } from 'react';
import { Plus, Search, Beaker, FileText, ChevronDown, ChevronRight, Loader2, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Formula, FormulaIngrediente, MateriaPrima } from '../types/database';
import FormulaModal from '../components/FormulaModal';

type FormulaWithIngredients = Formula & { formula_ingredientes: FormulaIngrediente[] };

export default function Formulas() {
    const [formulas, setFormulas] = useState<FormulaWithIngredients[]>([]);
    const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFormula, setEditingFormula] = useState<FormulaWithIngredients | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        await Promise.all([
            fetchFormulas(),
            fetchMateriasPrimas()
        ]);
        setLoading(false);
    }

    async function fetchFormulas() {
        // Fetch formulas and their related ingredients and material data
        const { data, error } = await supabase
            .from('formulas')
            .select(`
    *,
    formula_ingredientes(
          *,
        materia_prima: materias_primas(*)
    )
        `)
            .order('nombre_producto', { ascending: true });

        if (error) {
            console.error('Error fetching recipes:', error);
        } else {
            setFormulas((data as any) || []);
        }
    }

    async function fetchMateriasPrimas() {
        const { data, error } = await supabase
            .from('materias_primas')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error fetching raw materials:', error);
        } else {
            setMateriasPrimas(data || []);
        }
    }

    const openNewModal = () => {
        setEditingFormula(null);
        setIsModalOpen(true);
    };

    const openEditModal = (formula: FormulaWithIngredients, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingFormula(formula);
        setIsModalOpen(true);
    };

    const handleDeleteFormula = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!window.confirm('¿Está seguro de que desea eliminar esta fórmula? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            // Eliminar solo los vínculos de ingredientes (junction records) de esta fórmula
            // Esto NO elimina las materias primas del inventario.
            await supabase.from('formula_ingredientes').delete().eq('formula_id', id);

            const { error } = await supabase
                .from('formulas')
                .delete()
                .eq('id', id);

            if (error) {
                // Check if the error is a foreign key constraint violation
                if (error.code === '23503' && error.message.includes('produccion_lotes')) {
                    alert('No se puede eliminar esta fórmula porque existen lotes de producción asociados a ella. Primero debe eliminar los lotes o archivar la fórmula.');
                    return;
                }
                throw error;
            }

            // Refetch after deletion
            fetchData();
        } catch (error: any) {
            console.error('Error deleting formula:', error);
            alert(`Error al eliminar la fórmula: ${error.message || 'Error desconocido'}`);
        }
    };

    const filteredFormulas = formulas.filter(f =>
        f.nombre_producto.toLowerCase().includes(search.toLowerCase())
    );

    const calculateCost = (ingredientes: FormulaIngrediente[]) => {
        return ingredientes.reduce((total, ing) => {
            if (!ing.materia_prima?.precio_unitario) return total;
            // assuming precio_unitario is per kg or per L. Amount is in g/L.
            // So cost = (grams / 1000) * precio_unitario
            return total + ((ing.cantidad_g_l / 1000) * ing.materia_prima.precio_unitario);
        }, 0);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Fórmulas y Costos</h1>
                    <p className="text-gray-500 mt-1">Administra recetas, procesos y costos de fabricación.</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Fórmula
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar fórmula..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        Total: {filteredFormulas.length} fórmulas
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            Cargando fórmulas...
                        </div>
                    ) : filteredFormulas.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Beaker className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-lg font-medium text-gray-900">No hay fórmulas registradas</p>
                        </div>
                    ) : (
                        filteredFormulas.map((formula) => {
                            const isExpanded = expandedId === formula.id;
                            const costPerLiter = calculateCost(formula.formula_ingredientes);

                            return (
                                <div key={formula.id} className="bg-white transition-colors">
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : formula.id)}
                                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Beaker className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {formula.nombre_producto}
                                                </h3>
                                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                                    <span className="font-medium text-gray-700">{formula.formula_ingredientes.length}</span> ingredientes
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-500 mb-0.5">Costo Químico (1L)</p>
                                                <p className="font-semibold text-gray-900">${costPerLiter.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => openEditModal(formula, e)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar fórmula"
                                                >
                                                    <Edit2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteFormula(formula.id, e)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar fórmula"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-100">
                                            <div className="grid grid-cols-3 gap-6">
                                                <div className="col-span-2">
                                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        Ingredientes <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Por 1 Litro</span>
                                                    </h4>
                                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                                                <tr>
                                                                    <th className="px-4 py-2 font-medium">Materia Prima</th>
                                                                    <th className="px-4 py-2 font-medium">Cant. (g/L)</th>
                                                                    <th className="px-4 py-2 font-medium">Costo Parcial</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {formula.formula_ingredientes.map(ing => {
                                                                    const cost = ing.materia_prima?.precio_unitario
                                                                        ? ((ing.cantidad_g_l / 1000) * ing.materia_prima.precio_unitario)
                                                                        : 0;
                                                                    return (
                                                                        <tr key={ing.id} className="hover:bg-gray-50">
                                                                            <td className="px-4 py-2 font-medium text-gray-800">
                                                                                {ing.materia_prima?.nombre || 'Desconocido'}
                                                                                <span className="block text-xs text-gray-500 font-mono">{ing.materia_prima?.codigo}</span>
                                                                            </td>
                                                                            <td className="px-4 py-2 text-gray-600">{ing.cantidad_g_l} g</td>
                                                                            <td className="px-4 py-2 font-medium text-gray-900">${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-gray-500" />
                                                        Proceso de Fabricación
                                                    </h4>
                                                    <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                        {formula.instrucciones_proceso || 'No hay instrucciones documentadas para este proceso.'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <FormulaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchData}
                formula={editingFormula}
                materiasPrimas={materiasPrimas}
            />
        </div>
    );
}
