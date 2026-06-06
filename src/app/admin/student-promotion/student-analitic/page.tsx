import { Suspense } from 'react';
import StudentAnaliticClient from './StudentAnaliticClient';

export const dynamic = 'force-dynamic';

export default function StudentAnaliticPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-800">
          <div className="text-gray-600 dark:text-gray-300">Cargando analítico...</div>
        </div>
      }
    >
      <StudentAnaliticClient />
    </Suspense>
  );
}
