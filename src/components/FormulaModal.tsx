import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Formula, FormulaIngrediente, MateriaPrima } from '../types/database';

type FormulaWithIngredients = Formula & { formula_ingredientes: FormulaIngrediente[] };

interface FormulaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    formula?: FormulaWithIngredients | null;
    materiasPrimas: MateriaPrima[];
}

export default function FormulaModal({ isOpen, onClose, onSave, formula, materiasPrimas }: FormulaModalProps) {
    const [nombreProducto, setNombreProducto] = useState('');
    const [instruccionesProceso, setInstruccionesProceso] = useState('');
    const [ingredientes, setIngredientes] = useState<Partial<FormulaIngrediente>[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (formula) {
            setNombreProducto(formula.nombre_producto);
            setInstruccionesProceso(formula.instrucciones_proceso || '');
            setIngredientes(formula.formula_ingredientes);
        } else {
            setNombreProducto('');
            setInstruccionesProceso('');
            setIngredientes([]);
        }
    }, [formula, isOpen]);

    if (!isOpen) return null;

    const handleAddIngredient = () => {
        setIngredientes([...ingredientes, { materia_prima_id: '', cantidad_g_l: 0 }]);
    };

    const handleIngredientChange = (index: number, field: keyof FormulaIngrediente, value: any) => {
        const newIngredientes = [...ingredientes];
        newIngredientes[index] = { ...newIngredientes[index], [field]: value };
        setIngredientes(newIngredientes);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredientes(ingredientes.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        if (!nombreProducto.trim()) return 'El nombre de la fórmula es requerido';
        if (ingredientes.length === 0) return 'Debe agregar al menos un ingrediente';
        for (let idx = 0; idx < ingredientes.length; idx++) {
            const ing = ingredientes[idx];
            if (!ing.materia_prima_id) return `Debe seleccionar una materia prima para el ingrediente ${idx + 1}`;
            if (!ing.cantidad_g_l || ing.cantidad_g_l <= 0) return `La cantidad debe ser mayor a 0 para el ingrediente ${idx + 1}`;
        }

        // Check for duplicate materials
        const materialIds = ingredientes.map(i => i.materia_prima_id);
        if (new Set(materialIds).size !== materialIds.length) {
            return 'No puede haber materias primas duplicadas en la fórmula';
        }

        return null;
    };

    const handleSave = async () => {
        setError(null);
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        try {
            let formulaId = formula?.id;

            if (formulaId) {
                // Update existing formula
                const { error: updateError } = await supabase
                    .from('formulas')
                    .update({
                        nombre_producto: nombreProducto,
                        instrucciones_proceso: instruccionesProceso,
                    })
                    .eq('id', formulaId);

                if (updateError) throw updateError;

                // For a simple update strategy, delete existing ingredients and re-insert
                const { error: deleteError } = await supabase
                    .from('formula_ingredientes')
                    .delete()
                    .eq('formula_id', formulaId);

                if (deleteError) throw deleteError;

            } else {
                // Create new formula
                const { data: newFormula, error: insertError } = await supabase
                    .from('formulas')
                    .insert({
                        nombre_producto: nombreProducto,
                        instrucciones_proceso: instruccionesProceso,
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;
                formulaId = newFormula.id;
            }

            // Insert ingredients
            if (formulaId && ingredientes.length > 0) {
                const ingredientesToInsert = ingredientes.map(ing => ({
                    formula_id: formulaId,
                    materia_prima_id: ing.materia_prima_id,
                    cantidad_g_l: Number(ing.cantidad_g_l)
                }));

                const { error: ingredientsError } = await supabase
                    .from('formula_ingredientes')
                    .insert(ingredientesToInsert);

                if (ingredientsError) throw ingredientsError;
            }

            onSave();
            onClose();
        } catch (err: any) {
            console.error('Error saving formula:', err);
            setError(err.message || 'Error al guardar la fórmula');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {formula ? 'Editar Fórmula' : 'Nueva Fórmula'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                        disabled={saving}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto w-full">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Producto *
                            </label>
                            <input
                                type="text"
                                value={nombreProducto}
                                onChange={(e) => setNombreProducto(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Ej: Jabón Líquido Multiusos"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Ingredientes (por 1 Litro) *
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAddIngredient}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Ingrediente
                                </button>
                            </div>

                            {ingredientes.length === 0 ? (
                                <div className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
                                    No hay ingredientes agregados
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {ingredientes.map((ing, index) => (
                                        <div key={index} className="flex gap-4 items-start">
                                            <div className="flex-1">
                                                <select
                                                    value={ing.materia_prima_id || ''}
                                                    onChange={(e) => handleIngredientChange(index, 'materia_prima_id', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                >
                                                    <option value="">Seleccione una materia prima</option>
                                                    {materiasPrimas.map(mp => (
                                                        <option key={mp.id} value={mp.id}>
                                                            {mp.codigo} - {mp.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="w-40 flex-shrink-0">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={ing.cantidad_g_l || ''}
                                                        onChange={(e) => handleIngredientChange(index, 'cantidad_g_l', e.target.value)}
                                                        className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                        placeholder="0.00"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                        g
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveIngredient(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5 flex-shrink-0"
                                                title="Eliminar ingrediente"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Instrucciones de Proceso
                            </label>
                            <textarea
                                value={instruccionesProceso}
                                onChange={(e) => setInstruccionesProceso(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                placeholder="Describa el paso a paso para la elaboración..."
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Guardar Fórmula
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
