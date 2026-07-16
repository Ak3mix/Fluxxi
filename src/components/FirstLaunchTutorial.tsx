import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, List, ShoppingCart, Package, MoreHorizontal, ChevronRight, Check } from 'lucide-react';

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const steps: TutorialStep[] = [
  {
    icon: <LayoutDashboard size={32} />,
    title: 'Bienvenido a Fluxxi',
    description: 'Tu herramienta de ventas e inventario. Gestiona tu negocio de forma sencilla desde tu dispositivo.',
    color: 'bg-violet-500',
  },
  {
    icon: <LayoutDashboard size={32} />,
    title: 'Dashboard',
    description: 'Al abrir la app ves el Dashboard con las ventas del día, totales, productos más vendidos y alertas de stock bajo. Todo de un vistazo.',
    color: 'bg-violet-500',
  },
  {
    icon: <List size={32} />,
    title: 'Catálogo',
    description: 'Explora todos tus productos. Filtra por categoría, busca por nombre y agrega directo al carrito desde aquí.',
    color: 'bg-blue-500',
  },
  {
    icon: <ShoppingCart size={32} />,
    title: 'Carrito y Pagos',
    description: 'Revisa los productos seleccionados, ajusta cantidades y elige método de pago: efectivo, transferencia o split. La venta se registra automáticamente.',
    color: 'bg-emerald-500',
  },
  {
    icon: <Package size={32} />,
    title: 'Inventario',
    description: 'Lleva el control de tu stock. Puedes agregar, editar o eliminar productos, y registrar movimientos de entrada y salida.',
    color: 'bg-amber-500',
  },
  {
    icon: <MoreHorizontal size={32} />,
    title: 'Más — Cierre de Jornada',
    description: 'Encontrarás Reportes, Historial de ventas, Exportar/Importar datos y Ajustes. Lo más importante: al final del día cierra la jornada para generar tu reporte de ventas.',
    color: 'bg-rose-500',
  },
];

interface Props {
  isOpen: boolean;
  onComplete: () => void;
}

export function FirstLaunchTutorial({ isOpen, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            <div className="flex justify-center mb-8">
              <div className={`w-20 h-20 ${current.color} rounded-3xl flex items-center justify-center text-white shadow-lg`}>
                {current.icon}
              </div>
            </div>

            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? 'w-8 bg-violet-500' : 'w-2 bg-stone-200'
                  }`}
                />
              ))}
            </div>

            <h2 className="text-xl font-black text-center text-stone-800 mb-3">{current.title}</h2>
            <p className="text-sm text-stone-500 text-center leading-relaxed mb-8">{current.description}</p>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-violet-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-violet-100"
            >
              {isLast ? (
                <>Comenzar <Check size={18} /></>
              ) : (
                <>Siguiente <ChevronRight size={18} /></>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
