export type MateriaPrima = {
    id: string;
    codigo: string;
    nombre: string;
    proveedor_nombre: string;
    unidad_compra: string;
    precio_unitario: number;
    stock_actual: number;
    estado_fisico?: string;
    clasificacion?: string;
    ficha_tecnica_url: string;
    notas: string;
    created_at: string;
};

export type Formula = {
    id: string;
    nombre_producto: string;
    instrucciones_proceso: string;
    created_at: string;
};

export type FormulaIngrediente = {
    id: string;
    formula_id: string;
    materia_prima_id: string;
    cantidad_g_l: number;
    created_at: string;
    materia_prima?: MateriaPrima;
};

export type ProduccionLote = {
    id: string;
    formula_id: string;
    cantidad_litros: number;
    fecha_produccion: string;
    notas?: string;
};

export type ProduccionLoteIngrediente = {
    id: string;
    lote_id: string;
    materia_prima_id: string;
    cantidad_usada_g: number;
    costo_estimado: number;
};
