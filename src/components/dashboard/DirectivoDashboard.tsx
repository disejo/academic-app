import Link from 'next/link';
import TopTenStudents from './components/TopTenStudents';

export default function DirectivoDashboard() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Directivo Actions</h2>
      <div className="space-y-4">
        <Link href="/admin/subjects-classrooms">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Subjects and Classrooms
          </button>
        </Link>
        <Link href="/admin/users">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Create New User
          </button>
        </Link>
        <Link href="/admin/academic-cycles">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Academic Cycles
          </button>
        </Link>
        <Link href="/admin/subjects">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Subjects
          </button>
        </Link>
        <Link href="/admin/classrooms">
          <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
            Manage Classrooms
          </button>
        </Link>
        <Link href="/admin/student-promotion">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
            Student Promotion
          </button>
        </Link>
      </div>

      <div className="mt-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <TopTenStudents />
      </div>
    </div>
  );
}