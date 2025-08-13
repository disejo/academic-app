import Link from 'next/link';

export default function EstudianteDashboard() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Estudiante Actions</h2>
      <div className="space-y-4">
        <Link href="/estudiante/report-card">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            My Report Card
          </button>
        </Link>
      </div>
    </div>
  );
}
