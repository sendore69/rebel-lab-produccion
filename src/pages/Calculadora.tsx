import { useEffect, useState } from 'react';
import { Calculator, Beaker, ArrowRight, Loader2, Save, CheckCircle, XCircle, History, CalendarHeart, X, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Formula, FormulaIngrediente } from '../types/database';

export default function CalculadoraProduccion() {
    const [formulas, setFormulas] = useState<(Formula & { formula_ingredientes: FormulaIngrediente[] })[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
    const [litros, setLitros] = useState<number>(1);
    const [encargado, setEncargado] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // History and Tabs
    const [activeTab, setActiveTab] = useState<'calculadora' | 'historial'>('calculadora');
    const [lotesHistorial, setLotesHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Details Modal
    const [selectedLote, setSelectedLote] = useState<any | null>(null);

    useEffect(() => {
        fetchFormulas();
    }, []);

    useEffect(() => {
        if (activeTab === 'historial') {
            fetchHistorial();
        }
    }, [activeTab]);

    async function fetchFormulas() {
        setLoading(true);
        const { data, error } = await supabase
            .from('formulas')
            .select(`
        *,
        formula_ingredientes (
          *,
          materia_prima:materias_primas(*)
        )
      `)
            .order('nombre_producto', { ascending: true });

        if (!error && data) {
            setFormulas(data as any);
            if (data.length > 0) setSelectedFormulaId(data[0].id);
        }
        setLoading(false);
    }

    const selectedFormula = formulas.find(f => f.id === selectedFormulaId);

    async function handleRegistrarLote() {
        if (!selectedFormula) return;

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const { data: loteData, error: loteError } = await supabase
                .from('produccion_lotes')
                .insert([{
                    formula_id: selectedFormula.id,
                    cantidad_litros: litros,
                    encargado_produccion: encargado,
                    notas: `Registro manual desde calculadora`
                }])
                .select()
                .single();

            if (loteError) throw loteError;

            const ingredientesLote = selectedFormula.formula_ingredientes.map(ing => {
                const totalGrams = ing.cantidad_g_l * litros;
                const cost = ing.materia_prima?.precio_unitario ? (totalGrams / 1000) * ing.materia_prima.precio_unitario : 0;

                return {
                    lote_id: loteData.id,
                    materia_prima_id: ing.materia_prima_id,
                    cantidad_usada_g: totalGrams,
                    costo_estimado: cost
                };
            });

            if (ingredientesLote.length > 0) {
                const { error: ingError } = await supabase
                    .from('produccion_lotes_ingredientes')
                    .insert(ingredientesLote);

                if (ingError) throw ingError;
            }

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Error al registrar el lote:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsSaving(false);
        }
    }

    async function fetchHistorial() {
        setLoadingHistorial(true);
        const { data, error } = await supabase
            .from('produccion_lotes')
            .select(`
                *,
                formulas (nombre_producto),
                produccion_lotes_ingredientes (
                    *,
                    materias_primas (nombre, codigo)
                )
            `)
            .order('fecha_produccion', { ascending: false });

        if (!error && data) {
            setLotesHistorial(data);
        }
        setLoadingHistorial(false);
    }

    async function handleEliminarLote(id: string) {
        if (!window.confirm('¿Está seguro de que desea eliminar este lote del historial? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('produccion_lotes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Refresh list
            fetchHistorial();
        } catch (error) {
            console.error('Error al eliminar el lote:', error);
            alert('Error al eliminar el lote de la base de datos.');
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Producción</h1>
                    <p className="text-gray-500 mt-1">
                        {activeTab === 'calculadora'
                            ? 'Calcula y registra requerimientos para un lote de producción.'
                            : 'Consulta el historial de lotes fabricados.'}
                    </p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('calculadora')}
                        className={`px-4 py-2 font-medium rounded-md flex items-center gap-2 transition-colors ${activeTab === 'calculadora'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Calculator className="w-4 h-4" />
                        Calculadora
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`px-4 py-2 font-medium rounded-md flex items-center gap-2 transition-colors ${activeTab === 'historial'
                                ? 'bg-white text-blue-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Historial
                    </button>
                </div>
            </div>

            {activeTab === 'calculadora' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Parametros de Calculo */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-blue-600" />
                                Parámetros del Lote
                            </h2>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Producto a Fabricar
                                    </label>
                                    <select
                                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={selectedFormulaId}
                                        onChange={(e) => setSelectedFormulaId(e.target.value)}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <option>Cargando fórmulas...</option>
                                        ) : formulas.length === 0 ? (
                                            <option>No hay fórmulas disponibles</option>
                                        ) : (
                                            formulas.map(f => (
                                                <option key={f.id} value={f.id}>{f.nombre_producto}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cantidad a Fabricar (Litros)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 pl-4 pr-12 text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            value={litros}
                                            onChange={(e) => setLitros(Math.max(1, Number(e.target.value)))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium font-mono">
                                            L
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Encargado de Producción (Opcional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nombre del operario..."
                                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={encargado}
                                        onChange={(e) => setEncargado(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button
                                        onClick={handleRegistrarLote}
                                        disabled={isSaving || !selectedFormula}
                                        className={`w-full text-white font-medium py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors ${isSaving ? 'bg-blue-400 cursor-not-allowed' :
                                                saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                                    saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                                        'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                                        ) : saveStatus === 'success' ? (
                                            <><CheckCircle className="w-5 h-5" /> ¡Registrado con éxito!</>
                                        ) : saveStatus === 'error' ? (
                                            <><XCircle className="w-5 h-5" /> Error al registrar</>
                                        ) : (
                                            <><Save className="w-5 h-5" /> Registrar Lote en Historial</>
                                        )}
                                    </button>
                                    <p className="text-center text-xs text-gray-400 mt-2">Guarda este cálculo para monitorear el historial de lotes producidos</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resultados: Ingredientes y Proceso */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedFormula ? (
                            <>
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            <Beaker className="w-5 h-5 text-indigo-600" />
                                            Requerimiento de Materias Primas
                                        </h3>
                                        <span className="text-sm font-medium px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full">
                                            Para {litros} Litros
                                        </span>
                                    </div>

                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white text-gray-500 text-sm border-b border-gray-100">
                                                <th className="px-6 py-3 font-medium">Materia Prima</th>
                                                <th className="px-6 py-3 font-medium text-right">Cant. Requerida</th>
                                                <th className="px-6 py-3 font-medium text-right">Costo Estimado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 hover:bg-gray-50/20">
                                            {selectedFormula.formula_ingredientes.map(ing => {
                                                const totalGrams = ing.cantidad_g_l * litros;
                                                // Display logically. If > 1000g, show in kg.
                                                const displayQty = totalGrams >= 1000
                                                    ? `${(totalGrams / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
                                                    : `${totalGrams.toLocaleString(undefined, { maximumFractionDigits: 0 })} g`;

                                                const estimatedCost = ing.materia_prima?.precio_unitario
                                                    ? (totalGrams / 1000) * ing.materia_prima.precio_unitario
                                                    : 0;

                                                return (
                                                    <tr key={ing.id} className="transition-colors hover:bg-indigo-50/30">
                                                        <td className="px-6 py-4">
                                                            <span className="font-medium text-gray-900 block">{ing.materia_prima?.nombre || 'Desconocido'}</span>
                                                            <span className="text-xs text-gray-500 font-mono">{ing.materia_prima?.codigo}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end items-center gap-2">
                                                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                    Base: {ing.cantidad_g_l}g/L
                                                                </span>
                                                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                                                <span className="font-bold text-indigo-700 text-lg">{displayQty}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium text-gray-700">
                                                            ${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="bg-gray-50">
                                            <tr>
                                                <td colSpan={2} className="px-6 py-4 text-right font-medium text-gray-600">
                                                    Costo Total de Químicos (Aprox):
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900 text-lg">
                                                    ${selectedFormula.formula_ingredientes.reduce((acc, ing) => {
                                                        const totalGrams = ing.cantidad_g_l * litros;
                                                        const cost = ing.materia_prima?.precio_unitario ? (totalGrams / 1000) * ing.materia_prima.precio_unitario : 0;
                                                        return acc + cost;
                                                    }, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-amber-200/50 bg-amber-100/50">
                                        <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                                            Proceso de Fabricación
                                        </h3>
                                    </div>
                                    <div className="p-6 text-amber-900 whitespace-pre-wrap leading-relaxed">
                                        {selectedFormula.instrucciones_proceso || 'No hay proceso documentado para esta fórmula. Por favor contacte al ingeniero líder.'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                                {loading ? (
                                    <>
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                        <p className="text-lg font-medium text-gray-900">Cargando base de datos...</p>
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="w-16 h-16 text-gray-300 mb-4" />
                                        <h3 className="text-xl font-medium text-gray-900 mb-2">Seleccione una fórmula</h3>
                                        <p className="text-gray-500 max-w-sm">
                                            Elija un producto del menú de la izquierda e ingrese la cantidad a fabricar para ver los requerimientos.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* VISTA HISTORIAL */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500">
                                    <th className="px-6 py-4">Fecha y Hora</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4 text-right">Cantidad (L)</th>
                                    <th className="px-6 py-4">Encargado</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingHistorial ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                                            <p className="text-gray-500 font-medium">Cargando historial...</p>
                                        </td>
                                    </tr>
                                ) : lotesHistorial.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                <CalendarHeart className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-lg font-medium text-gray-900 mb-1">Aún no hay registros</p>
                                            <p className="text-gray-500 max-sm mx-auto">
                                                Los lotes que registres en la Calculadora aparecerán aquí.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    lotesHistorial.map((lote) => {
                                        const dateObj = new Date(lote.fecha_produccion);
                                        const formattedDate = dateObj.toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        });
                                        const formattedTime = dateObj.toLocaleTimeString(undefined, {
                                            hour: '2-digit', minute: '2-digit'
                                        });

                                        return (
                                            <tr key={lote.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{formattedDate}</div>
                                                    <div className="text-sm text-gray-500">{formattedTime}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                                                        {lote.formulas?.nombre_producto || 'Desconocido'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-semibold text-gray-900 text-lg">
                                                        {lote.cantidad_litros.toLocaleString()} <span className="text-sm text-gray-500 font-normal">L</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {lote.encargado_produccion || <span className="text-gray-400 italic">No especificado</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedLote(lote)}
                                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                                        >
                                                            Ver detalles
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminarLote(lote.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Eliminar lote"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Detalles del Lote */}
            {selectedLote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    Lote de {selectedLote.formulas?.nombre_producto}
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {new Date(selectedLote.fecha_produccion).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedLote(null)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-sm font-medium text-blue-800 mb-1">Volumen Producido</p>
                                    <p className="text-3xl font-bold text-blue-900">{selectedLote.cantidad_litros} <span className="text-lg font-medium">Litros</span></p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <p className="text-sm font-medium text-purple-800 mb-1">Encargado de Producción</p>
                                    <p className="text-xl font-semibold text-purple-900 break-words">
                                        {selectedLote.encargado_produccion || 'No especificado'}
                                    </p>
                                </div>
                            </div>

                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Beaker className="w-5 h-5 text-gray-500" />
                                Materias Primas Consumidas
                            </h4>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-sm">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600">Materia Prima</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 text-right">Cant. Usada</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 text-right">Costo Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedLote.produccion_lotes_ingredientes?.map((ing: any) => {
                                            const displayQty = ing.cantidad_usada_g >= 1000
                                                ? `${(ing.cantidad_usada_g / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`
                                                : `${ing.cantidad_usada_g.toLocaleString(undefined, { maximumFractionDigits: 0 })} g`;

                                            return (
                                                <tr key={ing.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-gray-900 block">
                                                            {ing.materias_primas?.nombre || 'Desconocido'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-mono">
                                                            {ing.materias_primas?.codigo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-indigo-700">
                                                        {displayQty}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-600">
                                                        ${Number(ing.costo_estimado).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-medium">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-3 text-right text-gray-600 border-t border-gray-200">
                                                Costo Total del Lote:
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-900 border-t border-gray-200">
                                                ${selectedLote.produccion_lotes_ingredientes?.reduce((acc: number, ing: any) => acc + Number(ing.costo_estimado), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
