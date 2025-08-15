import Link from 'next/link';

export default function PreceptorDashboard() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Preceptor Actions</h2>
      <div className="space-y-4">
        <Link href="/admin/users">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Create New User
          </button>
        </Link>
        <Link href="/admin/classrooms">
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Classrooms
          </button>
        </Link>
      </div>
    </div>
  );
}