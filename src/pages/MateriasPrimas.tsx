import { useEffect, useState } from 'react';
import { Plus, Search, FileText, Edit2, Trash2, Loader2, Package, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { MateriaPrima } from '../types/database';

const UNIDADES_MEDIDA = ['L', 'ml', 'kg', 'g', 'unidades'];
const ESTADOS_FISICOS = ['Sólido', 'Líquido', 'Gas'];
const CLASIFICACIONES = [
    'Ácido',
    'Alcalino',
    'Neutro',
    'Sal',
    'Solvente',
    'Tensioactivo',
    'Colorante',
    'Fragancia',
    'Conservante',
    'Otro'
];

export default function MateriasPrimas() {
    const [materias, setMaterias] = useState<MateriaPrima[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<MateriaPrima>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchMaterias();
    }, []);

    async function fetchMaterias() {
        setLoading(true);
        const { data, error } = await supabase
            .from('materias_primas')
            .select('*')
            .order('codigo', { ascending: true });

        if (error) {
            console.error('Error fetching data:', error);
        } else {
            setMaterias(data || []);
        }
        setLoading(false);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('materias_primas')
                    .update({
                        codigo: formData.codigo,
                        nombre: formData.nombre,
                        proveedor_nombre: formData.proveedor_nombre,
                        unidad_compra: formData.unidad_compra,
                        precio_unitario: formData.precio_unitario,
                        stock_actual: formData.stock_actual,
                        estado_fisico: formData.estado_fisico,
                        clasificacion: formData.clasificacion,
                        ficha_tecnica_url: formData.ficha_tecnica_url,
                        notas: formData.notas
                    })
                    .eq('id', editingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('materias_primas')
                    .insert([{
                        codigo: formData.codigo,
                        nombre: formData.nombre,
                        proveedor_nombre: formData.proveedor_nombre,
                        unidad_compra: formData.unidad_compra,
                        precio_unitario: formData.precio_unitario,
                        stock_actual: formData.stock_actual,
                        estado_fisico: formData.estado_fisico,
                        clasificacion: formData.clasificacion,
                        ficha_tecnica_url: formData.ficha_tecnica_url,
                        notas: formData.notas
                    }]);

                if (error) throw error;
            }

            setIsModalOpen(false);
            setFormData({});
            setEditingId(null);
            fetchMaterias();
        } catch (error: any) {
            console.error('Error saving data:', error);
            alert(`Error al guardar: ${error?.message || 'Por favor, revisa los datos e intenta de nuevo.'}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleGenerateCode() {
        if (!formData.estado_fisico || !formData.clasificacion) {
            alert('Por favor, selecciona primero el Estado Físico y la Clasificación para generar un código.');
            return;
        }

        const prefixMap: Record<string, string> = {
            'Sólido': 'S',
            'Líquido': 'L',
            'Gas': 'G'
        };

        const classMap: Record<string, string> = {
            'Ácido': 'AC',
            'Alcalino': 'AL',
            'Neutro': 'NE',
            'Sal': 'SA',
            'Solvente': 'SO',
            'Tensioactivo': 'TE',
            'Colorante': 'CO',
            'Fragancia': 'FR',
            'Conservante': 'CV',
            'Otro': 'OT'
        };

        const prefix = `${prefixMap[formData.estado_fisico]}-${classMap[formData.clasificacion]}`;

        try {
            // Fetch similar codes to find the highest number
            const { data } = await supabase
                .from('materias_primas')
                .select('codigo')
                .ilike('codigo', `${prefix}-%`)
                .order('codigo', { ascending: false })
                .limit(1);

            let nextNumber = 1;
            if (data && data.length > 0) {
                const lastCode = data[0].codigo;
                const match = lastCode.match(/(\d+)$/);
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                }
            }

            const newCode = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
            setFormData({ ...formData, codigo: newCode });

        } catch (error) {
            console.error('Error generating code:', error);
            alert('Error al generar código automático.');
        }
    }

    function handleEdit(item: MateriaPrima) {
        setFormData(item);
        setEditingId(item.id);
        setIsModalOpen(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de que deseas eliminar este item? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('materias_primas')
                .delete()
                .eq('id', id);

            if (error) throw error;

            fetchMaterias();
        } catch (error) {
            console.error('Error deleting data:', error);
            alert('Error al eliminar. Puede que este item esté en uso en alguna fórmula.');
        }
    }

    const filteredMaterias = materias.filter(m =>
        m.nombre.toLowerCase().includes(search.toLowerCase()) ||
        m.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (m.proveedor_nombre && m.proveedor_nombre.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Materias Primas e Inventario</h1>
                    <p className="text-gray-500 mt-1">Gestiona los insumos, costos y existencias.</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({});
                        setEditingId(null);
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Materia Prima
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="relative w-96">
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por código, nombre o proveedor..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        Total: {filteredMaterias.length} items
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold">Código</th>
                                <th className="px-6 py-4 font-semibold">Materia Prima</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold">Proveedor</th>
                                <th className="px-6 py-4 font-semibold">Precio / U.</th>
                                <th className="px-6 py-4 font-semibold">Stock</th>
                                <th className="px-6 py-4 font-semibold text-center">Ficha Tec.</th>
                                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        Cargando inventario...
                                    </td>
                                </tr>
                            ) : filteredMaterias.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-lg font-medium text-gray-900">No se encontraron resultados</p>
                                            <p className="text-gray-500">Intenta con otra búsqueda o agrega un nuevo item.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMaterias.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                                {item.codigo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.nombre}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {item.estado_fisico && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                        {item.estado_fisico}
                                                    </span>
                                                )}
                                                {item.clasificacion && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                        {item.clasificacion}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{item.proveedor_nombre || '-'}</td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            ${item.precio_unitario?.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ {item.unidad_compra}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${item.stock_actual > 10 ? 'bg-green-100 text-green-800' :
                                                item.stock_actual > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {item.stock_actual} {item.unidad_compra}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {item.ficha_tecnica_url ? (
                                                <a href={item.ficha_tecnica_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 inline-block" title="Ver Ficha Técnica">
                                                    <FileText className="w-5 h-5 mx-auto" />
                                                </a>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal para Crear/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Físico</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        value={formData.estado_fisico || ''}
                                        onChange={e => setFormData({ ...formData, estado_fisico: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {ESTADOS_FISICOS.map(estado => (
                                            <option key={estado} value={estado}>{estado}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Clasificación</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        value={formData.clasificacion || ''}
                                        onChange={e => setFormData({ ...formData, clasificacion: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {CLASIFICACIONES.map(clas => (
                                            <option key={clas} value={clas}>{clas}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={formData.codigo || ''}
                                            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateCode}
                                            title="Generar código automático"
                                            className="px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Generar
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Materia Prima</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.nombre || ''}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.proveedor_nombre || ''}
                                        onChange={e => setFormData({ ...formData, proveedor_nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Compra</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        value={formData.unidad_compra || ''}
                                        onChange={e => setFormData({ ...formData, unidad_compra: e.target.value })}
                                    >
                                        <option value="">Seleccionar unidad...</option>
                                        {UNIDADES_MEDIDA.map(unidad => (
                                            <option key={unidad} value={unidad}>{unidad}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.precio_unitario ?? ''}
                                        onChange={e => setFormData({ ...formData, precio_unitario: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.stock_actual ?? ''}
                                        onChange={e => setFormData({ ...formData, stock_actual: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL Ficha Técnica (opcional)</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.ficha_tecnica_url || ''}
                                        onChange={e => setFormData({ ...formData, ficha_tecnica_url: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas Adicionales</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.notas || ''}
                                        onChange={e => setFormData({ ...formData, notas: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Guardando...' : 'Guardar Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
