import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Beaker, PackageSearch, Calculator, Settings, Menu, X } from 'lucide-react';
import MateriasPrimas from './pages/MateriasPrimas';
import Formulas from './pages/Formulas';
import CalculadoraProduccion from './pages/Calculadora';

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Producción', icon: Calculator },
    { path: '/materias-primas', label: 'Inventario', icon: PackageSearch },
    { path: '/formulas', label: 'Fórmulas', icon: Beaker },
  ];

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white p-4 flex flex-col z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center space-x-3">
            <Beaker className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold">Rebel Lab</h1>
          </div>
          <button onClick={onClose} className="md:hidden p-1 hover:bg-slate-800 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) onClose();
                }}
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
          <div className="flex items-center space-x-3 text-slate-400 cursor-not-allowed text-sm">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configuración</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center space-x-3">
              <Beaker className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900">Rebel Lab</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<CalculadoraProduccion />} />
              <Route path="/materias-primas" element={<MateriasPrimas />} />
              <Route path="/formulas" element={<Formulas />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
