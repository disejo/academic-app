import Link from 'next/link';

export default function DocenteDashboard() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Docente Actions</h2>
      <div className="space-y-4">
        <Link href="/docente/grades">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Enter Grades
          </button>
        </Link>
        <Link href="/docente/programs">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Programs
          </button>
        </Link>
        <Link href="/admin/classrooms">
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
            View Classrooms
          </button>
        </Link>
      </div>
    </div>
  );
}