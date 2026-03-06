import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Beaker, PackageSearch, Calculator, Settings } from 'lucide-react';
import MateriasPrimas from './pages/MateriasPrimas';
import Formulas from './pages/Formulas';
import CalculadoraProduccion from './pages/Calculadora';

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Producción', icon: Calculator },
    { path: '/materias-primas', label: 'Inventario', icon: PackageSearch },
    { path: '/formulas', label: 'Fórmulas', icon: Beaker },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
      <div className="flex items-center space-x-3 mb-8 px-2">
        <Beaker className="w-8 h-8 text-blue-400" />
        <h1 className="text-xl font-bold">Rebel Lab</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 py-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 text-slate-400 cursor-not-allowed">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configuración</span>
        </div>
      </div>
    </aside>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<CalculadoraProduccion />} />
            <Route path="/materias-primas" element={<MateriasPrimas />} />
            <Route path="/formulas" element={<Formulas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
