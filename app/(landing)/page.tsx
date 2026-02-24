import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Search, Briefcase, Zap, Power, UserCircle, Gift } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { SocialProof } from '@/components/landing/SocialProof'
import { Features } from '@/components/landing/Features'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">


      <section className="pt-40 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-100 text-[#003366] rounded-full text-sm font-bold shadow-sm">
            <Zap size={16} className="text-[#00A896]" fill="currentColor" /> Tu turno al instante, todo digital.
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-[#003366] tracking-tight leading-tight">
            Gestión inteligente<br />
            <span className="text-[#00A896]">de citas y reservas.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            La plataforma única para usuarios que buscan reservar y negocios que buscan administrar su flujo de atención.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Link href="/reservas">
              <Button variant="accent" size="lg" icon={Search} fullWidth className="sm:w-auto rounded-full font-bold text-lg px-8 py-6 shadow-xl shadow-teal-900/20 hover:shadow-2xl hover:-translate-y-1 transition-all">
                Buscar Turnos
              </Button>
            </Link>
            <Link href="/registro-negocio">
              <Button variant="secondary" size="lg" icon={Briefcase} fullWidth className="sm:w-auto rounded-full font-bold text-lg px-8 py-6 border-slate-200 hover:bg-white hover:border-slate-300 transition-all">
                OnTurn para Negocios
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Section (New) */}
      <SocialProof />

      {/* Features Section (New) */}
      <Features />

      {/* Sección para Negocios */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50 rounded-2xl shadow-xl p-8 md:p-12 border border-slate-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#003366] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-[#00A896]" />
              </div>
              <h2 className="text-3xl font-bold text-[#003366] mb-4">
                ¿Tienes un Negocio?
              </h2>
              <p className="text-lg text-slate-600 mb-6">
                Únete a OnTurn y gestiona tus reservas de forma profesional
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-[#00A896] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Power size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#003366] mb-2">Más Clientes</h3>
                  <p className="text-slate-600">
                    Llega a más personas que buscan tus servicios
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-6 h-6 bg-[#00A896] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#003366] mb-2">Gestión Fácil</h3>
                  <p className="text-slate-600">
                    Administra tus reservas, horarios y especialistas
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Link href="/registro-negocio">
                <div className="relative inline-block">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full animate-bounce whitespace-nowrap z-10">
                    ¡Oferta por tiempo limitado!
                  </div>
                  <Button size="lg" variant="accent" fullWidth className="sm:w-auto rounded-full font-bold shadow-lg shadow-teal-900/20 hover:shadow-xl transition-all relative overflow-hidden group animate-pulse hover:animate-none">
                    <span className="relative z-10 flex items-center gap-2">
                      <Gift size={20} className="animate-wiggle" />
                      Prueba gratis para tu negocio
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Button>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
