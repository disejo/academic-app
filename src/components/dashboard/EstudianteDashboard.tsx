import Link from 'next/link';

export default function EstudianteDashboard() {
  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900 mt-14">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/estudiante/report-card">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
            <div className="relative h-40 bg-gradient-to-r from-blue-800 to-blue-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
                <path d="M16 18H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2z" fill="rgba(255,255,255,0.3)"/>
              </svg>
            </div>
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Mi Boletín</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Visualiza tus calificaciones y desempeño académico</p>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">Ver Boletín →</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
